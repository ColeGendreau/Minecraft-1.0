/**
 * Prometheus Service
 * 
 * Queries Prometheus for real metrics data.
 * Works with the Prometheus instance deployed via Helm in the AKS cluster.
 */

// Prometheus configuration
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus-server.monitoring.svc.cluster.local';
const PROMETHEUS_TIMEOUT = 10000;

export interface PrometheusResult {
  metric: Record<string, string>;
  value: [number, string]; // [timestamp, value]
}

export interface PrometheusResponse {
  status: 'success' | 'error';
  data: {
    resultType: 'vector' | 'matrix' | 'scalar' | 'string';
    result: PrometheusResult[];
  };
  error?: string;
  errorType?: string;
}

export interface MetricValue {
  name: string;
  labels: Record<string, string>;
  value: number;
  timestamp: number;
}

export interface ClusterResourceMetrics {
  cpu: {
    usage: number;
    requests: number;
    limits: number;
    usageByNode: Array<{ node: string; usage: number; percentage: number }>;
    usageByNamespace: Array<{ namespace: string; usage: number }>;
  };
  memory: {
    usage: number;
    requests: number;
    limits: number;
    usageByNode: Array<{ node: string; usage: number; percentage: number }>;
    usageByNamespace: Array<{ namespace: string; usage: number }>;
  };
  network: {
    receiveBytesPerSec: number;
    transmitBytesPerSec: number;
    byPod: Array<{ pod: string; namespace: string; rx: number; tx: number }>;
  };
  storage: {
    usedBytes: number;
    totalBytes: number;
    percentage: number;
  };
}

export interface MinecraftMetrics {
  playersOnline: number;
  maxPlayers: number;
  tps: number; // Ticks per second (target 20)
  worldSize: number;
  uptime: number;
  memoryUsed: number;
  memoryMax: number;
}

/**
 * Query Prometheus with PromQL
 */
async function queryPrometheus(query: string): Promise<PrometheusResult[]> {
  try {
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROMETHEUS_TIMEOUT);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Prometheus query failed: ${response.status}`);
      return [];
    }
    
    const data = await response.json() as PrometheusResponse;
    
    if (data.status !== 'success') {
      console.error(`Prometheus error: ${data.error}`);
      return [];
    }
    
    return data.data.result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Prometheus query timed out');
    } else {
      console.error('Prometheus query error:', error);
    }
    return [];
  }
}

/**
 * Parse Prometheus result to simple number
 */
function parseValue(results: PrometheusResult[]): number {
  if (results.length === 0) return 0;
  return parseFloat(results[0].value[1]) || 0;
}

/**
 * Parse Prometheus results to array of values with labels
 */
function parseValues(results: PrometheusResult[]): MetricValue[] {
  return results.map(r => ({
    name: r.metric.__name__ || '',
    labels: r.metric,
    value: parseFloat(r.value[1]) || 0,
    timestamp: r.value[0],
  }));
}

/**
 * Get cluster resource metrics from Prometheus
 */
export async function getClusterResourceMetrics(): Promise<ClusterResourceMetrics | null> {
  try {
    // Run queries in parallel
    const [
      cpuUsage,
      cpuRequests,
      cpuLimits,
      cpuByNode,
      cpuByNamespace,
      memUsage,
      memRequests,
      memLimits,
      memByNode,
      memByNamespace,
      networkRx,
      networkTx,
      networkByPod,
      storageUsed,
      storageTotal,
    ] = await Promise.all([
      // CPU metrics
      queryPrometheus('sum(rate(container_cpu_usage_seconds_total{container!=""}[5m]))'),
      queryPrometheus('sum(kube_pod_container_resource_requests{resource="cpu"})'),
      queryPrometheus('sum(kube_pod_container_resource_limits{resource="cpu"})'),
      queryPrometheus('sum by (node) (rate(container_cpu_usage_seconds_total{container!=""}[5m]))'),
      queryPrometheus('sum by (namespace) (rate(container_cpu_usage_seconds_total{container!=""}[5m]))'),
      
      // Memory metrics
      queryPrometheus('sum(container_memory_working_set_bytes{container!=""})'),
      queryPrometheus('sum(kube_pod_container_resource_requests{resource="memory"})'),
      queryPrometheus('sum(kube_pod_container_resource_limits{resource="memory"})'),
      queryPrometheus('sum by (node) (container_memory_working_set_bytes{container!=""})'),
      queryPrometheus('sum by (namespace) (container_memory_working_set_bytes{container!=""})'),
      
      // Network metrics
      queryPrometheus('sum(rate(container_network_receive_bytes_total[5m]))'),
      queryPrometheus('sum(rate(container_network_transmit_bytes_total[5m]))'),
      queryPrometheus('sum by (pod, namespace) (rate(container_network_receive_bytes_total[5m]) + rate(container_network_transmit_bytes_total[5m]))'),
      
      // Storage metrics
      queryPrometheus('sum(kubelet_volume_stats_used_bytes)'),
      queryPrometheus('sum(kubelet_volume_stats_capacity_bytes)'),
    ]);
    
    // Parse CPU by node with percentage
    const nodeCapacity = await queryPrometheus('kube_node_status_allocatable{resource="cpu"}');
    const cpuByNodeParsed = parseValues(cpuByNode).map(v => {
      const nodeCapacityValue = nodeCapacity.find(c => c.metric.node === v.labels.node);
      const capacity = nodeCapacityValue ? parseFloat(nodeCapacityValue.value[1]) : 1;
      return {
        node: v.labels.node || 'unknown',
        usage: Math.round(v.value * 1000), // Convert to millicores
        percentage: Math.round((v.value / capacity) * 100),
      };
    });
    
    // Parse memory by node with percentage
    const memCapacity = await queryPrometheus('kube_node_status_allocatable{resource="memory"}');
    const memByNodeParsed = parseValues(memByNode).map(v => {
      const nodeCapacityValue = memCapacity.find(c => c.metric.node === v.labels.node);
      const capacity = nodeCapacityValue ? parseFloat(nodeCapacityValue.value[1]) : 1;
      return {
        node: v.labels.node || 'unknown',
        usage: Math.round(v.value / (1024 * 1024)), // Convert to MB
        percentage: Math.round((v.value / capacity) * 100),
      };
    });
    
    return {
      cpu: {
        usage: Math.round(parseValue(cpuUsage) * 1000), // millicores
        requests: Math.round(parseValue(cpuRequests) * 1000),
        limits: Math.round(parseValue(cpuLimits) * 1000),
        usageByNode: cpuByNodeParsed,
        usageByNamespace: parseValues(cpuByNamespace).map(v => ({
          namespace: v.labels.namespace || 'unknown',
          usage: Math.round(v.value * 1000),
        })),
      },
      memory: {
        usage: Math.round(parseValue(memUsage) / (1024 * 1024)), // MB
        requests: Math.round(parseValue(memRequests) / (1024 * 1024)),
        limits: Math.round(parseValue(memLimits) / (1024 * 1024)),
        usageByNode: memByNodeParsed,
        usageByNamespace: parseValues(memByNamespace).map(v => ({
          namespace: v.labels.namespace || 'unknown',
          usage: Math.round(v.value / (1024 * 1024)),
        })),
      },
      network: {
        receiveBytesPerSec: Math.round(parseValue(networkRx)),
        transmitBytesPerSec: Math.round(parseValue(networkTx)),
        byPod: parseValues(networkByPod).slice(0, 10).map(v => ({
          pod: v.labels.pod || 'unknown',
          namespace: v.labels.namespace || 'unknown',
          rx: Math.round(v.value / 2), // Approximate split
          tx: Math.round(v.value / 2),
        })),
      },
      storage: {
        usedBytes: Math.round(parseValue(storageUsed)),
        totalBytes: Math.round(parseValue(storageTotal)),
        percentage: Math.round((parseValue(storageUsed) / parseValue(storageTotal)) * 100) || 0,
      },
    };
  } catch (error) {
    console.error('Failed to get cluster resource metrics:', error);
    return null;
  }
}

/**
 * Get Minecraft-specific metrics (if available)
 * Requires minecraft-exporter sidecar or similar
 */
export async function getMinecraftMetrics(): Promise<MinecraftMetrics | null> {
  try {
    const [
      playersOnline,
      maxPlayers,
      tps,
      worldSize,
      memoryUsed,
      memoryMax,
    ] = await Promise.all([
      queryPrometheus('minecraft_players_online_count'),
      queryPrometheus('minecraft_players_max'),
      queryPrometheus('minecraft_tps'),
      queryPrometheus('minecraft_world_size_bytes'),
      queryPrometheus('minecraft_jvm_memory_bytes_used{area="heap"}'),
      queryPrometheus('minecraft_jvm_memory_bytes_max{area="heap"}'),
    ]);
    
    // If no Minecraft metrics are found, return null
    if (playersOnline.length === 0 && tps.length === 0) {
      return null;
    }
    
    return {
      playersOnline: parseValue(playersOnline),
      maxPlayers: parseValue(maxPlayers) || 20,
      tps: parseValue(tps) || 20,
      worldSize: Math.round(parseValue(worldSize) / (1024 * 1024)), // MB
      uptime: 0, // Would need uptime metric
      memoryUsed: Math.round(parseValue(memoryUsed) / (1024 * 1024)), // MB
      memoryMax: Math.round(parseValue(memoryMax) / (1024 * 1024)), // MB
    };
  } catch (error) {
    console.error('Failed to get Minecraft metrics:', error);
    return null;
  }
}

/**
 * Check if Prometheus is reachable
 */
export async function isPrometheusAvailable(): Promise<boolean> {
  try {
    const result = await queryPrometheus('up');
    return result.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get recent alerts from Prometheus/Alertmanager
 */
export async function getAlerts(): Promise<Array<{
  name: string;
  severity: string;
  state: string;
  summary: string;
  since: string;
}>> {
  try {
    const alerts = await queryPrometheus('ALERTS{alertstate="firing"}');
    
    return alerts.map(a => ({
      name: a.metric.alertname || 'Unknown',
      severity: a.metric.severity || 'warning',
      state: 'firing',
      summary: a.metric.summary || a.metric.alertname || 'Alert triggered',
      since: new Date(a.value[0] * 1000).toISOString(),
    }));
  } catch {
    return [];
  }
}

