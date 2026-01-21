/**
 * Azure Cost Management Service
 * 
 * Queries Azure Cost Management API for real spending data.
 * Uses Managed Identity for authentication when running in Azure Container Apps.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Azure configuration
const SUBSCRIPTION_ID = process.env.AZURE_SUBSCRIPTION_ID;
const RESOURCE_GROUP = process.env.AKS_RESOURCE_GROUP || 'mc-demo-dev-rg';
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID; // Managed identity client ID
const COST_MANAGEMENT_SCOPE = SUBSCRIPTION_ID 
  ? `/subscriptions/${SUBSCRIPTION_ID}`
  : null;

// Resource groups to track for World Forge
const TRACKED_RESOURCE_GROUPS = [
  'mc-demo-dev-rg',           // Main infrastructure (AKS, etc)
  'mc-demo-dev-dashboard-rg', // Dashboard & Coordinator (always on)
  'mc-demo-tfstate-rg',       // Terraform state storage
];

export interface CostBreakdown {
  service: string;
  resourceGroup: string;
  cost: number;
  currency: string;
}

export interface DailyCost {
  date: string;
  cost: number;
  currency: string;
}

// Azure Cost Management API response type
interface AzureCostApiResponse {
  properties?: {
    rows?: unknown[][];
    columns?: { name: string; type: string }[];
    nextLink?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CostSummary {
  currentPeriod: {
    total: number;
    currency: string;
    startDate: string;
    endDate: string;
  };
  previousPeriod: {
    total: number;
    currency: string;
    startDate: string;
    endDate: string;
  };
  forecast: {
    endOfMonth: number;
    currency: string;
  };
  byService: CostBreakdown[];
  byResourceGroup: CostBreakdown[];
  dailyCosts: DailyCost[];
  lastUpdated: string;
}

export interface CostResponse {
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

/**
 * Get Azure access token using managed identity (Container Apps) or CLI (local dev)
 */
async function getAzureAccessToken(): Promise<string | null> {
  // Method 1: Try Managed Identity endpoint (works in Azure Container Apps)
  // Container Apps sets IDENTITY_ENDPOINT and IDENTITY_HEADER environment variables
  const identityEndpoint = process.env.IDENTITY_ENDPOINT;
  const identityHeader = process.env.IDENTITY_HEADER;
  
  if (identityEndpoint && identityHeader) {
    try {
      const resource = 'https://management.azure.com/';
      const url = new URL(identityEndpoint);
      url.searchParams.set('resource', resource);
      url.searchParams.set('api-version', '2019-08-01');
      
      // If we have a specific client ID (user-assigned managed identity), add it
      if (AZURE_CLIENT_ID) {
        url.searchParams.set('client_id', AZURE_CLIENT_ID);
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'X-IDENTITY-HEADER': identityHeader,
        },
      });
      
      if (response.ok) {
        const data = await response.json() as { access_token: string };
        console.log('✅ Azure token obtained via managed identity endpoint');
        return data.access_token;
      }
      console.warn('Managed identity token request failed:', response.status, await response.text());
    } catch (error) {
      console.warn('Managed identity endpoint not available:', error);
    }
  }
  
  // Method 2: Try Azure IMDS endpoint (works in Azure VMs and some other services)
  try {
    const resource = encodeURIComponent('https://management.azure.com/');
    let imdsUrl = `http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=${resource}`;
    
    if (AZURE_CLIENT_ID) {
      imdsUrl += `&client_id=${AZURE_CLIENT_ID}`;
    }
    
    const imdsResponse = await fetch(imdsUrl, {
      headers: { 'Metadata': 'true' },
      signal: AbortSignal.timeout(3000), // Quick timeout for IMDS
    });
    
    if (imdsResponse.ok) {
      const data = await imdsResponse.json() as { access_token: string };
      console.log('✅ Azure token obtained via IMDS');
      return data.access_token;
    }
  } catch {
    // IMDS not available, try CLI
  }
  
  // Method 3: Fall back to Azure CLI (for local development)
  try {
    const { stdout } = await execAsync(
      'az account get-access-token --resource https://management.azure.com/ --query accessToken -o tsv',
      { timeout: 15000 }
    );
    console.log('✅ Azure token obtained via Azure CLI');
    return stdout.trim();
  } catch (error) {
    console.error('Failed to get Azure access token via any method:', error);
    return null;
  }
}

/**
 * Query Azure Cost Management API
 */
async function queryCostManagement(
  timeframe: 'MonthToDate' | 'BillingMonthToDate' | 'TheLastMonth' | 'TheLastBillingMonth' | 'Custom',
  grouping: 'ServiceName' | 'ResourceGroup' | 'ResourceId',
  customDates?: { from: string; to: string }
): Promise<{ rows: Array<[number, string, string]>; error?: string }> {
  const token = await getAzureAccessToken();
  if (!token) {
    return { rows: [], error: 'Failed to authenticate to Azure' };
  }

  if (!SUBSCRIPTION_ID) {
    return { rows: [], error: 'AZURE_SUBSCRIPTION_ID not configured' };
  }

  const url = `https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;

  // Build the query body
  const body: Record<string, unknown> = {
    type: 'ActualCost',
    timeframe,
    dataset: {
      granularity: 'None',
      aggregation: {
        totalCost: {
          name: 'Cost',
          function: 'Sum',
        },
      },
      grouping: [
        {
          type: 'Dimension',
          name: grouping,
        },
      ],
      filter: {
        or: TRACKED_RESOURCE_GROUPS.map(rg => ({
          dimensions: {
            name: 'ResourceGroup',
            operator: 'In',
            values: [rg],
          },
        })),
      },
    },
  };

  if (timeframe === 'Custom' && customDates) {
    body.timePeriod = {
      from: customDates.from,
      to: customDates.to,
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cost Management API error:', response.status, errorText);
      return { rows: [], error: `API error: ${response.status}` };
    }

    const data = await response.json() as AzureCostApiResponse;
    return { rows: (data.properties?.rows || []) as Array<[number, string, string]> };
  } catch (error) {
    console.error('Failed to query Cost Management:', error);
    return { rows: [], error: 'Failed to query Azure Cost Management' };
  }
}

/**
 * Query daily costs for trend chart
 */
async function queryDailyCosts(days: number = 30): Promise<DailyCost[]> {
  const token = await getAzureAccessToken();
  if (!token || !SUBSCRIPTION_ID) {
    return [];
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const url = `https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;

  const body = {
    type: 'ActualCost',
    timeframe: 'Custom',
    timePeriod: {
      from: startDate.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0],
    },
    dataset: {
      granularity: 'Daily',
      aggregation: {
        totalCost: {
          name: 'Cost',
          function: 'Sum',
        },
      },
      filter: {
        or: TRACKED_RESOURCE_GROUPS.map(rg => ({
          dimensions: {
            name: 'ResourceGroup',
            operator: 'In',
            values: [rg],
          },
        })),
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as AzureCostApiResponse;
    const rows = (data.properties?.rows || []) as Array<[number, number, string]>;
    
    return rows.map((row) => ({
      date: formatDateFromNumber(row[1]),
      cost: row[0],
      currency: row[2] || 'USD',
    }));
  } catch (error) {
    console.error('Failed to query daily costs:', error);
    return [];
  }
}

/**
 * Format date number (YYYYMMDD) to ISO string
 */
function formatDateFromNumber(dateNum: number): string {
  const str = dateNum.toString();
  return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
}

/**
 * Format cost as currency string
 */
function formatCost(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get comprehensive cost data for the dashboard
 */
export async function getAzureCosts(): Promise<CostResponse> {
  // Check if Azure is configured
  if (!SUBSCRIPTION_ID) {
    return getEstimatedCosts();
  }

  try {
    // Run queries in parallel
    const [
      thisMonthByService,
      thisMonthByRG,
      lastMonthByService,
      dailyCosts,
    ] = await Promise.all([
      queryCostManagement('MonthToDate', 'ServiceName'),
      queryCostManagement('MonthToDate', 'ResourceGroup'),
      queryCostManagement('TheLastMonth', 'ServiceName'),
      queryDailyCosts(30),
    ]);

    // Check for errors
    if (thisMonthByService.error) {
      console.warn('Cost query error:', thisMonthByService.error);
      return getEstimatedCosts();
    }

    // Calculate totals
    const thisMonthTotal = thisMonthByService.rows.reduce((sum, row) => sum + row[0], 0);
    const lastMonthTotal = lastMonthByService.rows.reduce((sum, row) => sum + row[0], 0);
    
    // Get today and yesterday costs from daily data
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const todayCost = dailyCosts.find(d => d.date === today)?.cost || 0;
    const yesterdayCost = dailyCosts.find(d => d.date === yesterday)?.cost || 0;

    // Calculate forecast (simple projection based on current rate)
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const dailyRate = thisMonthTotal / dayOfMonth;
    const forecast = dailyRate * daysInMonth;

    // Build service breakdown
    const byService = thisMonthByService.rows
      .map(row => ({
        service: row[1] || 'Unknown',
        cost: formatCost(row[0]),
        percentage: thisMonthTotal > 0 ? Math.round((row[0] / thisMonthTotal) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);

    // Build resource group breakdown
    const byResourceGroup = thisMonthByRG.rows
      .map(row => ({
        resourceGroup: row[1] || 'Unknown',
        cost: formatCost(row[0]),
        percentage: thisMonthTotal > 0 ? Math.round((row[0] / thisMonthTotal) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Build daily trend (last 14 days)
    const dailyTrend = dailyCosts
      .slice(-14)
      .map(d => ({
        date: d.date,
        cost: Math.round(d.cost * 100) / 100,
      }));

    const currency = 'USD';
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    return {
      available: true,
      today: {
        cost: formatCost(todayCost),
        currency,
      },
      yesterday: {
        cost: formatCost(yesterdayCost),
        currency,
      },
      thisMonth: {
        cost: formatCost(thisMonthTotal),
        forecast: formatCost(forecast),
        currency,
        startDate: monthStart,
        endDate: today,
      },
      lastMonth: {
        cost: formatCost(lastMonthTotal),
        currency,
        startDate: lastMonthStart,
        endDate: lastMonthEnd,
      },
      breakdown: {
        byService,
        byResourceGroup,
      },
      dailyTrend,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to get Azure costs:', error);
    return getEstimatedCosts();
  }
}

/**
 * Get estimated costs when Azure Cost Management is not available
 */
function getEstimatedCosts(): CostResponse {
  const now = new Date();
  const dayOfMonth = now.getDate();
  
  // Estimated daily costs based on typical usage
  const estimatedDaily = 4.50; // ~$3-5/day when running
  const estimatedMonthly = estimatedDaily * dayOfMonth;
  const estimatedForecast = estimatedDaily * 30;

  return {
    available: false,
    error: 'Azure Cost Management not configured. Showing estimates.',
    today: {
      cost: `~$${estimatedDaily.toFixed(2)}`,
      currency: 'USD',
    },
    yesterday: {
      cost: `~$${estimatedDaily.toFixed(2)}`,
      currency: 'USD',
    },
    thisMonth: {
      cost: `~$${estimatedMonthly.toFixed(2)}`,
      forecast: `~$${estimatedForecast.toFixed(2)}`,
      currency: 'USD',
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    },
    lastMonth: {
      cost: '~$135.00',
      currency: 'USD',
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
      endDate: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
    },
    breakdown: {
      byService: [
        { service: 'Azure Kubernetes Service', cost: '~$3.50/day', percentage: 78 },
        { service: 'Container Registry', cost: '~$0.16/day', percentage: 4 },
        { service: 'Log Analytics', cost: '~$0.30/day', percentage: 7 },
        { service: 'Storage', cost: '~$0.15/day', percentage: 3 },
        { service: 'Networking', cost: '~$0.20/day', percentage: 4 },
        { service: 'Other', cost: '~$0.19/day', percentage: 4 },
      ],
      byResourceGroup: [
        { resourceGroup: 'mc-demo-dev-rg', cost: '~$4.00/day', percentage: 89 },
        { resourceGroup: 'mc-demo-dev-dashboard-rg', cost: '~$0.35/day', percentage: 8 },
        { resourceGroup: 'mc-demo-tfstate-rg', cost: '~$0.15/day', percentage: 3 },
      ],
    },
    dailyTrend: generateEstimatedTrend(),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generate estimated daily trend data
 */
function generateEstimatedTrend(): Array<{ date: string; cost: number }> {
  const trend = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    // Vary between $3-5 with some randomness
    const cost = 3.5 + Math.random() * 1.5;
    trend.push({
      date: date.toISOString().split('T')[0],
      cost: Math.round(cost * 100) / 100,
    });
  }
  return trend;
}

/**
 * Check if Azure Cost Management is available
 */
export async function isCostManagementAvailable(): Promise<boolean> {
  if (!SUBSCRIPTION_ID) return false;
  
  const token = await getAzureAccessToken();
  return token !== null;
}

