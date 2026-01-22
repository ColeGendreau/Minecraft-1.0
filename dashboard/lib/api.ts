import type {
  CreateWorldRequest,
  CreateWorldResponse,
  WorldListResponse,
  WorldDetailResponse,
  CurrentWorldResponse,
  HealthResponse,
  WorldRequestStatus,
} from './types';

// API URL must be set in production - no localhost fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// API key for authenticating with coordinator (set in environment)
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || '';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 5000
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  // Build headers with optional API key
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  // Add API key if configured
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, error.error || error.message || 'Request failed');
    }

    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(408, 'API request timed out - server may be starting up');
    }
    throw err;
  }
}

// Health check (no auth required)
export async function checkHealth(): Promise<HealthResponse> {
  return fetchApi<HealthResponse>('/health');
}

// Get current deployed world
export async function getCurrentWorld(): Promise<CurrentWorldResponse> {
  return fetchApi<CurrentWorldResponse>('/api/worlds/current');
}

// List all world requests
export async function getWorlds(options?: {
  status?: WorldRequestStatus;
  limit?: number;
  offset?: number;
}): Promise<WorldListResponse> {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());

  const query = params.toString();
  return fetchApi<WorldListResponse>(`/api/worlds${query ? `?${query}` : ''}`);
}

// Create a new world request
export async function createWorld(
  request: CreateWorldRequest
): Promise<CreateWorldResponse> {
  return fetchApi<CreateWorldResponse>('/api/worlds', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// Get world request details
export async function getWorldDetails(id: string): Promise<WorldDetailResponse> {
  return fetchApi<WorldDetailResponse>(`/api/worlds/${id}`);
}

// Retry a failed request
export async function retryWorld(id: string): Promise<CreateWorldResponse> {
  return fetchApi<CreateWorldResponse>(`/api/worlds/${id}/retry`, {
    method: 'POST',
  });
}

// Delete a world request
export async function deleteWorld(id: string): Promise<{ success: boolean; message: string }> {
  return fetchApi(`/api/worlds/${id}`, {
    method: 'DELETE',
  });
}

// Infrastructure types
export interface ServiceStatus {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  status: 'running' | 'stopped' | 'unknown' | 'error';
}

export interface GrafanaEmbeds {
  clusterCpu: string;
  clusterMemory: string;
  namespaceCpu: string;
  podCount: string;
}

export interface InfrastructureMetrics {
  nodes: number;
  pods: number;
  cpuUsage: number;
  memoryUsage: number;
  publicIp: string;
  grafanaUrl: string;
  grafanaHomeUrl?: string;
  prometheusUrl?: string;
  minecraftAddress: string;
  grafanaEmbeds?: GrafanaEmbeds;
}

export interface InfrastructureTransition {
  action: 'deploying' | 'destroying' | 'unknown';
  progress: number;
  startedAt: string;
  runUrl: string | null;
  estimatedMinutes: number;
}

export interface InfrastructureStatusResponse {
  state: 'ON' | 'OFF' | 'UNKNOWN';
  operationalState: 'running' | 'stopped' | 'deploying' | 'destroying';
  isRunning: boolean;
  isTransitioning: boolean;
  transition: InfrastructureTransition | null;
  services: ServiceStatus[];
  metrics: InfrastructureMetrics | null;
  lastUpdated: string;
  gitHub: {
    owner: string;
    repo: string;
    stateFile: string;
    workflowUrl: string;
  };
}

export interface InfrastructureCostResponse {
  available: boolean;
  error?: string;
  today: {
    cost: string;
    currency: string;
  };
  yesterday: {
    cost: string;
    currency: string;
  };
  thisMonth: {
    cost: string;
    forecast: string;
    currency: string;
    startDate: string;
    endDate: string;
  };
  lastMonth: {
    cost: string;
    currency: string;
    startDate: string;
    endDate: string;
  };
  breakdown: {
    byService: Array<{ service: string; cost: string; percentage: number }>;
    byResourceGroup: Array<{ resourceGroup: string; cost: string; percentage: number }>;
  };
  dailyTrend: Array<{ date: string; cost: number }>;
  lastUpdated: string;
}

// Legacy format for backward compatibility
export interface InfrastructureCostSummary {
  daily: { running: string; stopped: string };
  monthly: { running: string; stopped: string; forecast?: string };
  breakdown: Array<{ service: string; daily: string }>;
  note: string;
  isEstimate?: boolean;
}

// Get infrastructure status
export async function getInfrastructureStatus(): Promise<InfrastructureStatusResponse> {
  // 15 second timeout - this queries GitHub for workflow status
  return fetchApi<InfrastructureStatusResponse>('/api/infrastructure/status', {}, 15000);
}

// Toggle infrastructure state
export async function toggleInfrastructure(targetState: 'ON' | 'OFF'): Promise<{
  success: boolean;
  message: string;
  newState: string;
  estimatedTime: string;
  workflowUrl: string;
}> {
  // 30 second timeout - this call commits to GitHub which can be slow
  return fetchApi('/api/infrastructure/toggle', {
    method: 'POST',
    body: JSON.stringify({ targetState }),
  }, 30000);
}

// Get cost estimates (longer timeout - cost queries can be slow)
export async function getInfrastructureCost(): Promise<InfrastructureCostResponse> {
  return fetchApi<InfrastructureCostResponse>('/api/infrastructure/cost', {}, 30000);
}

// ========== WORKFLOW STATUS ==========

export interface WorkflowStep {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'skipped' | null;
}

export interface WorkflowJob {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'skipped' | null;
  steps: WorkflowStep[];
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion: 'success' | 'failure' | 'cancelled' | null;
  url: string;
  startedAt: string;
  updatedAt: string;
  jobs?: WorkflowJob[];
}

export interface LatestWorkflowResponse {
  hasActiveRun: boolean;
  latestRun: WorkflowRun | null;
  error?: string;
}

// Get latest terraform workflow status
export async function getLatestWorkflow(): Promise<LatestWorkflowResponse> {
  return fetchApi<LatestWorkflowResponse>('/api/workflows/latest', {}, 10000);
}

// Get workflow run details with jobs/steps
export async function getWorkflowRunDetails(runId: number): Promise<{
  runId: number;
  jobs: WorkflowJob[];
}> {
  return fetchApi(`/api/workflows/runs/${runId}`, {}, 10000);
}

// ========== AZURE ACTIVITY LOGS ==========

export interface ResourceGroup {
  name: string;
  location: string;
  state: string;
  purpose: string;
}

export interface AKSCluster {
  name: string;
  resourceGroup: string;
  location: string;
  kubernetesVersion: string;
  nodeCount: number;
  state: string;
}

export interface ActivityLogEntry {
  time: string;
  operation: string;
  status: string;
  details?: string;
  url?: string;
}

export interface RecentOperation {
  time: string;
  operation: string;
  status: string;
  resource?: string;
}

export interface InfrastructureLogsResponse {
  timestamp: string;
  infrastructureState: string;
  resourceGroups: ResourceGroup[];
  aksCluster: AKSCluster | null;
  activityLog: ActivityLogEntry[];
  recentOperations: RecentOperation[];
  workflowUrl: string;
  error?: string;
}

// Get Azure infrastructure logs and activity
export async function getInfrastructureLogs(): Promise<InfrastructureLogsResponse> {
  return fetchApi<InfrastructureLogsResponse>('/api/infrastructure/logs', {}, 15000);
}

// ========== MONITORING ==========

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

export interface PrometheusMetrics {
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
  tps: number;
  worldSize: number;
  uptime: number;
  memoryUsed: number;
  memoryMax: number;
}

export interface MonitoringResponse {
  available: boolean;
  timestamp?: string;
  message?: string;
  kubernetes: {
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
    namespaces: string[];
  } | null;
  prometheus: {
    available: boolean;
    metrics: PrometheusMetrics | null;
    alerts: Array<{
      name: string;
      severity: string;
      state: string;
      summary: string;
      since: string;
    }>;
  } | null;
  minecraft: MinecraftMetrics | null;
}

export interface PodsResponse {
  available: boolean;
  timestamp?: string;
  message?: string;
  pods: PodInfo[];
  summary: {
    total: number;
    running: number;
    pending: number;
    failed: number;
  };
}

export interface NodesResponse {
  available: boolean;
  timestamp?: string;
  message?: string;
  nodes: NodeInfo[];
  summary: {
    total: number;
    ready: number;
  };
}

// Get detailed monitoring data
export async function getMonitoringData(): Promise<MonitoringResponse> {
  return fetchApi<MonitoringResponse>('/api/infrastructure/monitoring', {}, 15000);
}

// Get pod details
export async function getPods(): Promise<PodsResponse> {
  return fetchApi<PodsResponse>('/api/infrastructure/pods', {}, 15000);
}

// Get node details
export async function getNodes(): Promise<NodesResponse> {
  return fetchApi<NodesResponse>('/api/infrastructure/nodes', {}, 15000);
}

// ========== ASSETS ==========

export interface Asset {
  id: string;
  name: string;
  imageUrl: string | null;
  prompt: string | null;
  generatedImageUrl: string | null;
  position: {
    x: number;
    y: number;
    z: number;
  };
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  scale: number;
  facing: 'north' | 'south' | 'east' | 'west';
  status: 'building' | 'active' | 'deleted';
  createdBy: string;
  createdAt: string;
}

export interface AssetListResponse {
  assets: Asset[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface AssetStatusResponse {
  totalAssets: number;
  aiImageGeneration: {
    available: boolean;
    deployment: string;
    note: string;
  };
  capabilities: string[];
}

export interface CreateAssetRequest {
  name?: string;
  imageUrl?: string;
  prompt?: string;
  position?: { x: number; y: number; z: number };
  scale?: number;
  depth?: number;
  facing?: 'north' | 'south' | 'east' | 'west';
}

export interface CreateAssetResponse {
  success: boolean;
  asset?: Asset;
  stats?: {
    blocksPlaced: number;
    errors: number;
  };
  error?: string;
}

// Get assets status (including AI availability)
export async function getAssetsStatus(): Promise<AssetStatusResponse> {
  return fetchApi<AssetStatusResponse>('/api/assets/status');
}

// List all assets
export async function getAssets(options?: {
  status?: 'active' | 'deleted' | 'building';
  limit?: number;
  offset?: number;
}): Promise<AssetListResponse> {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());

  const query = params.toString();
  return fetchApi<AssetListResponse>(`/api/assets${query ? `?${query}` : ''}`);
}

// Create a new asset
export async function createAsset(request: CreateAssetRequest): Promise<CreateAssetResponse> {
  // Asset creation can take a while (image processing + building)
  return fetchApi<CreateAssetResponse>('/api/assets', {
    method: 'POST',
    body: JSON.stringify(request),
  }, 120000); // 2 minute timeout
}

// Delete an asset
export async function deleteAsset(id: string): Promise<{ success: boolean; message: string }> {
  return fetchApi(`/api/assets/${id}`, {
    method: 'DELETE',
  }, 30000);
}

// Duplicate an asset
export async function duplicateAsset(id: string, position?: { x: number; y: number; z: number }): Promise<CreateAssetResponse> {
  return fetchApi<CreateAssetResponse>(`/api/assets/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ position }),
  }, 120000);
}

// Nuke all assets
export async function nukeAllAssets(): Promise<{ success: boolean; message: string; deletedCount: number }> {
  return fetchApi('/api/assets/nuke', {
    method: 'POST',
    body: JSON.stringify({ confirm: 'NUKE' }),
  }, 60000);
}

// Build trigger: 1768638888
// Build trigger: 1768867666
