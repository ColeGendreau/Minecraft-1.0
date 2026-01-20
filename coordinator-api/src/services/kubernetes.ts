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

/**
 * Execute a kubectl command
 */
async function kubectl(command: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execAsync(`kubectl ${command}`, {
      timeout: 30000,
      env: {
        ...process.env,
        KUBECONFIG: process.env.KUBECONFIG || '/root/.kube/config',
      },
    });
    return result;
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    throw new Error(err.stderr || err.message || 'kubectl command failed');
  }
}

/**
 * Update the Minecraft server by patching the deployment
 * This triggers a rolling restart with the new annotation.
 */
export async function updateMinecraftMOTD(worldName: string, _theme?: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Updating Minecraft deployment with world: ${worldName}`);

    // Patch the deployment's pod template annotations to trigger a restart
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
        },
      },
    });

    await kubectl(
      `patch deployment ${MINECRAFT_DEPLOYMENT} -n ${MINECRAFT_NAMESPACE} ` +
      `--type=strategic -p '${patchJson}'`
    );

    console.log(`✅ Deployment patched - server will restart with world: ${worldName}`);
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to patch deployment:', errorMessage);
    
    return { 
      success: false, 
      error: `kubectl error: ${errorMessage}. Restart will proceed via RCON stop.`
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
