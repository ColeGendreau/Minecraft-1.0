import type {
  CreateWorldRequest,
  CreateWorldResponse,
  WorldListResponse,
  WorldDetailResponse,
  CurrentWorldResponse,
  HealthResponse,
  WorldRequestStatus,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

// Infrastructure types
export interface ServiceStatus {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  status: 'running' | 'stopped' | 'unknown' | 'error';
}

export interface InfrastructureMetrics {
  nodes: number;
  pods: number;
  cpuUsage: number;
  memoryUsage: number;
  publicIp: string;
  grafanaUrl: string;
  minecraftAddress: string;
}

export interface InfrastructureStatusResponse {
  state: 'ON' | 'OFF' | 'UNKNOWN';
  isRunning: boolean;
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
  daily: { running: string; stopped: string };
  monthly: { running: string; stopped: string };
  breakdown: Array<{ service: string; daily: string }>;
  note: string;
}

// Get infrastructure status
export async function getInfrastructureStatus(): Promise<InfrastructureStatusResponse> {
  return fetchApi<InfrastructureStatusResponse>('/api/infrastructure/status');
}

// Toggle infrastructure state
export async function toggleInfrastructure(targetState: 'ON' | 'OFF'): Promise<{
  success: boolean;
  message: string;
  newState: string;
  estimatedTime: string;
  workflowUrl: string;
}> {
  return fetchApi('/api/infrastructure/toggle', {
    method: 'POST',
    body: JSON.stringify({ targetState }),
  });
}

// Get cost estimates
export async function getInfrastructureCost(): Promise<InfrastructureCostResponse> {
  return fetchApi<InfrastructureCostResponse>('/api/infrastructure/cost');
}
