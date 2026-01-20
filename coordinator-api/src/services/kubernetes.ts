/**
 * Kubernetes Service
 * 
 * Handles interactions with the AKS cluster for dynamic server configuration.
 * Uses kubectl commands for simplicity and compatibility.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Kubernetes configuration
const MINECRAFT_NAMESPACE = process.env.MINECRAFT_NAMESPACE || 'minecraft';
const MINECRAFT_DEPLOYMENT = process.env.MINECRAFT_DEPLOYMENT || 'minecraft';

// Check if kubectl is available
let kubectlAvailable: boolean | null = null;

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
 * Execute a kubectl command
 */
async function kubectl(command: string): Promise<{ stdout: string; stderr: string }> {
  if (!await isKubectlAvailable()) {
    throw new Error('kubectl not available');
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
