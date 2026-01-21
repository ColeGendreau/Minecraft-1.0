/**
 * Kubernetes Service
 * 
 * Handles interactions with the AKS cluster for dynamic server configuration.
 * Uses Azure Managed Identity + kubectl for secure, IaC-native access.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Kubernetes configuration
const MINECRAFT_NAMESPACE = process.env.MINECRAFT_NAMESPACE || 'minecraft';
const MINECRAFT_DEPLOYMENT = process.env.MINECRAFT_DEPLOYMENT || 'minecraft';

// AKS configuration for managed identity auth
const AKS_RESOURCE_GROUP = process.env.AKS_RESOURCE_GROUP;
const AKS_CLUSTER_NAME = process.env.AKS_CLUSTER_NAME;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;

// Track authentication state
let kubectlAvailable: boolean | null = null;
let aksAuthenticated = false;

/**
 * Authenticate to Azure using Managed Identity and get AKS credentials
 */
async function authenticateToAKS(): Promise<boolean> {
  if (aksAuthenticated) return true;
  
  // Check if we have the required config
  if (!AKS_RESOURCE_GROUP || !AKS_CLUSTER_NAME) {
    console.log('AKS config not set - kubectl features disabled');
    return false;
  }

  try {
    console.log('Authenticating to Azure with Managed Identity...');
    
    // Login with managed identity
    const loginCmd = AZURE_CLIENT_ID 
      ? `az login --identity --username ${AZURE_CLIENT_ID}`
      : 'az login --identity';
    
    await execAsync(loginCmd, { timeout: 30000 });
    console.log('✅ Azure login successful');

    // Get AKS credentials
    console.log(`Getting AKS credentials for ${AKS_CLUSTER_NAME}...`);
    await execAsync(
      `az aks get-credentials --resource-group ${AKS_RESOURCE_GROUP} --name ${AKS_CLUSTER_NAME} --overwrite-existing`,
      { timeout: 30000 }
    );
    console.log('✅ AKS credentials obtained');

    // Convert kubeconfig to use kubelogin for Azure AD auth
    await execAsync('kubelogin convert-kubeconfig -l msi', { timeout: 10000 });
    console.log('✅ Kubeconfig converted for managed identity auth');

    aksAuthenticated = true;
    return true;
  } catch (error) {
    const err = error as { message?: string; stderr?: string };
    console.error('Failed to authenticate to AKS:', err.stderr || err.message);
    return false;
  }
}

async function isKubectlAvailable(): Promise<boolean> {
  if (kubectlAvailable !== null) return kubectlAvailable;
  
  try {
    await execAsync('kubectl version --client', { timeout: 5000 });
    kubectlAvailable = true;
    console.log('kubectl is available');
  } catch {
    kubectlAvailable = false;
    console.log('kubectl not available - Kubernetes features disabled');
  }
  return kubectlAvailable;
}

/**
 * Execute a kubectl command (authenticates on first use)
 */
async function kubectl(command: string): Promise<{ stdout: string; stderr: string }> {
  if (!await isKubectlAvailable()) {
    throw new Error('kubectl not available');
  }
  
  // Authenticate to AKS if not already done
  if (!await authenticateToAKS()) {
    throw new Error('Failed to authenticate to AKS');
  }
  
  try {
    const result = await execAsync(`kubectl ${command}`, {
      timeout: 30000,
      env: {
        ...process.env,
        KUBECONFIG: process.env.KUBECONFIG || '/home/coordinator/.kube/config',
      },
    });
    return result;
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    throw new Error(err.stderr || err.message || 'kubectl command failed');
  }
}

/**
 * Update the Minecraft server MOTD by patching the deployment's environment variables.
 * The itzg/minecraft image reads MOTD from the MOTD env var at startup.
 * This triggers a rolling restart with the new MOTD.
 */
export async function updateMinecraftMOTD(worldName: string, theme?: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Updating Minecraft MOTD to: ${worldName}`);

    // Build the MOTD string with Minecraft color codes
    // §6 = gold, §b = aqua, §l = bold, §r = reset
    const shortTheme = theme ? (theme.length > 30 ? theme.substring(0, 30) + '...' : theme) : 'AI-Crafted World';
    const motd = `§6§l${worldName} §r§7- §b${shortTheme}`;

    // Patch the deployment to update the MOTD environment variable
    // This will trigger a rolling restart with the new MOTD
    const timestamp = new Date().toISOString();
    const patchJson = JSON.stringify({
      spec: {
        template: {
          metadata: {
            annotations: {
              'worldforge.io/world-name': worldName,
              'worldforge.io/updated-at': timestamp,
            },
          },
          spec: {
            containers: [{
              name: 'minecraft',
              env: [{
                name: 'MOTD',
                value: motd,
              }],
            }],
          },
        },
      },
    });

    await kubectl(
      `patch deployment ${MINECRAFT_DEPLOYMENT} -n ${MINECRAFT_NAMESPACE} ` +
      `--type=strategic -p '${patchJson}'`
    );

    console.log(`✅ MOTD updated to: ${motd}`);
    console.log(`✅ Deployment will restart with new MOTD`);
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to update MOTD:', errorMessage);
    
    return { 
      success: false, 
      error: `kubectl error: ${errorMessage}. MOTD update failed.`
    };
  }
}

/**
 * Check if kubectl is configured and can access the cluster
 */
export async function checkKubernetesConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    await kubectl(`get deployment ${MINECRAFT_DEPLOYMENT} -n ${MINECRAFT_NAMESPACE} -o name`);
    return { connected: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { connected: false, error: errorMessage };
  }
}

/**
 * Get the current Minecraft deployment status
 */
export async function getMinecraftDeploymentStatus(): Promise<{
  available: boolean;
  replicas: number;
  readyReplicas: number;
  currentMOTD?: string;
  error?: string;
}> {
  try {
    const { stdout } = await kubectl(
      `get deployment ${MINECRAFT_DEPLOYMENT} -n ${MINECRAFT_NAMESPACE} ` +
      `-o jsonpath='{.status.replicas},{.status.readyReplicas},{.status.availableReplicas}'`
    );
    
    const [replicas, readyReplicas, availableReplicas] = stdout.replace(/'/g, '').split(',').map(Number);
    
    return {
      available: availableReplicas > 0,
      replicas: replicas || 0,
      readyReplicas: readyReplicas || 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      available: false,
      replicas: 0,
      readyReplicas: 0,
      error: errorMessage,
    };
  }
}

// Pod status interface
export interface PodInfo {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  node: string;
  ip: string;
  cpu?: string;
  memory?: string;
  containers: Array<{
    name: string;
    ready: boolean;
    restarts: number;
    image: string;
  }>;
}

// Node status interface
export interface NodeInfo {
  name: string;
  status: string;
  roles: string;
  age: string;
  version: string;
  internalIp: string;
  cpu: {
    capacity: string;
    allocatable: string;
    used?: string;
    percentage?: number;
  };
  memory: {
    capacity: string;
    allocatable: string;
    used?: string;
    percentage?: number;
  };
  pods: {
    capacity: number;
    running: number;
  };
}

// Cluster metrics summary
export interface ClusterMetrics {
  nodes: {
    total: number;
    ready: number;
    details: NodeInfo[];
  };
  pods: {
    total: number;
    running: number;
    pending: number;
    failed: number;
    details: PodInfo[];
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    cpuRequests: string;
    cpuLimits: string;
    memoryRequests: string;
    memoryLimits: string;
  };
  namespaces: string[];
}

/**
 * Get all pods across namespaces with details
 */
export async function getAllPods(): Promise<PodInfo[]> {
  try {
    // Get pods with detailed JSON output
    const { stdout } = await kubectl(
      `get pods -A -o json`
    );
    
    const data = JSON.parse(stdout);
    const pods: PodInfo[] = [];
    
    for (const pod of data.items || []) {
      const containerStatuses = pod.status?.containerStatuses || [];
      const containers = containerStatuses.map((cs: { name: string; ready: boolean; restartCount: number; image: string }) => ({
        name: cs.name,
        ready: cs.ready,
        restarts: cs.restartCount || 0,
        image: cs.image,
      }));
      
      const readyCount = containerStatuses.filter((cs: { ready: boolean }) => cs.ready).length;
      const totalContainers = containerStatuses.length;
      
      pods.push({
        name: pod.metadata?.name || 'unknown',
        namespace: pod.metadata?.namespace || 'default',
        status: pod.status?.phase || 'Unknown',
        ready: `${readyCount}/${totalContainers}`,
        restarts: containerStatuses.reduce((sum: number, cs: { restartCount: number }) => sum + (cs.restartCount || 0), 0),
        age: getAge(pod.metadata?.creationTimestamp),
        node: pod.spec?.nodeName || 'pending',
        ip: pod.status?.podIP || 'pending',
        containers,
      });
    }
    
    return pods;
  } catch (error) {
    console.error('Failed to get pods:', error);
    return [];
  }
}

/**
 * Get all nodes with resource info
 */
export async function getAllNodes(): Promise<NodeInfo[]> {
  try {
    const { stdout } = await kubectl(`get nodes -o json`);
    const data = JSON.parse(stdout);
    const nodes: NodeInfo[] = [];
    
    for (const node of data.items || []) {
      const conditions = node.status?.conditions || [];
      const readyCondition = conditions.find((c: { type: string }) => c.type === 'Ready');
      const status = readyCondition?.status === 'True' ? 'Ready' : 'NotReady';
      
      const roles = Object.keys(node.metadata?.labels || {})
        .filter(l => l.startsWith('node-role.kubernetes.io/'))
        .map(l => l.replace('node-role.kubernetes.io/', ''))
        .join(',') || 'worker';
      
      const addresses = node.status?.addresses || [];
      const internalIp = addresses.find((a: { type: string }) => a.type === 'InternalIP')?.address || '';
      
      nodes.push({
        name: node.metadata?.name || 'unknown',
        status,
        roles,
        age: getAge(node.metadata?.creationTimestamp),
        version: node.status?.nodeInfo?.kubeletVersion || 'unknown',
        internalIp,
        cpu: {
          capacity: node.status?.capacity?.cpu || '0',
          allocatable: node.status?.allocatable?.cpu || '0',
        },
        memory: {
          capacity: node.status?.capacity?.memory || '0',
          allocatable: node.status?.allocatable?.memory || '0',
        },
        pods: {
          capacity: parseInt(node.status?.capacity?.pods || '0'),
          running: 0, // Will be populated from pod count
        },
      });
    }
    
    return nodes;
  } catch (error) {
    console.error('Failed to get nodes:', error);
    return [];
  }
}

/**
 * Get cluster-wide metrics using kubectl top
 */
export async function getClusterMetrics(): Promise<ClusterMetrics | null> {
  try {
    // Get nodes and pods first
    const [nodes, pods] = await Promise.all([
      getAllNodes(),
      getAllPods(),
    ]);
    
    // Try to get resource usage from metrics-server
    let nodeMetrics: Record<string, { cpu: string; memory: string }> = {};
    let podMetrics: Record<string, { cpu: string; memory: string }> = {};
    
    try {
      const { stdout: nodeTopOutput } = await kubectl('top nodes --no-headers');
      for (const line of nodeTopOutput.trim().split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const [name, cpu, cpuPercent, memory, memPercent] = parts;
          nodeMetrics[name] = { cpu: `${cpu} (${cpuPercent})`, memory: `${memory} (${memPercent})` };
          
          // Update node info with usage
          const node = nodes.find(n => n.name === name);
          if (node) {
            node.cpu.used = cpu;
            node.cpu.percentage = parseInt(cpuPercent);
            node.memory.used = memory;
            node.memory.percentage = parseInt(memPercent);
          }
        }
      }
    } catch (e) {
      console.log('Metrics server not available for node metrics');
    }
    
    try {
      const { stdout: podTopOutput } = await kubectl('top pods -A --no-headers');
      for (const line of podTopOutput.trim().split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const [namespace, name, cpu, memory] = parts;
          podMetrics[`${namespace}/${name}`] = { cpu, memory };
          
          // Update pod info with usage
          const pod = pods.find(p => p.namespace === namespace && p.name === name);
          if (pod) {
            pod.cpu = cpu;
            pod.memory = memory;
          }
        }
      }
    } catch (e) {
      console.log('Metrics server not available for pod metrics');
    }
    
    // Count pods per node
    for (const node of nodes) {
      node.pods.running = pods.filter(p => p.node === node.name && p.status === 'Running').length;
    }
    
    // Calculate total usage
    const readyNodes = nodes.filter(n => n.status === 'Ready');
    const avgCpuUsage = readyNodes.length > 0 
      ? Math.round(readyNodes.reduce((sum, n) => sum + (n.cpu.percentage || 0), 0) / readyNodes.length)
      : 0;
    const avgMemUsage = readyNodes.length > 0
      ? Math.round(readyNodes.reduce((sum, n) => sum + (n.memory.percentage || 0), 0) / readyNodes.length)
      : 0;
    
    // Get unique namespaces
    const namespaces = [...new Set(pods.map(p => p.namespace))].sort();
    
    return {
      nodes: {
        total: nodes.length,
        ready: readyNodes.length,
        details: nodes,
      },
      pods: {
        total: pods.length,
        running: pods.filter(p => p.status === 'Running').length,
        pending: pods.filter(p => p.status === 'Pending').length,
        failed: pods.filter(p => p.status === 'Failed').length,
        details: pods,
      },
      resources: {
        cpuUsage: avgCpuUsage,
        memoryUsage: avgMemUsage,
        cpuRequests: '0', // Would need to aggregate from pods
        cpuLimits: '0',
        memoryRequests: '0',
        memoryLimits: '0',
      },
      namespaces,
    };
  } catch (error) {
    console.error('Failed to get cluster metrics:', error);
    return null;
  }
}

/**
 * Helper: Calculate age from timestamp
 */
function getAge(timestamp: string | undefined): string {
  if (!timestamp) return 'unknown';
  
  const created = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
