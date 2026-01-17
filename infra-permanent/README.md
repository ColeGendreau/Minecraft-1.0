# Permanent Dashboard Infrastructure

This Terraform configuration creates the "always on" infrastructure that hosts the World Forge dashboard. This infrastructure is designed to be:

- **Minimal cost** - Uses free tier and scale-to-zero services
- **Always available** - So you can control the main infrastructure
- **Separate from main infra** - Won't be destroyed when you turn off the Minecraft environment

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Resource Group: mc-demo-dev-dashboard-rg               │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────────┐  │
│  │ Azure Static Web    │  │ Azure Container Apps    │  │
│  │ Apps (Free tier)    │  │ (scales to 0)           │  │
│  │                     │  │                         │  │
│  │ Dashboard UI        │  │ Coordinator API         │  │
│  │ (Next.js)           │  │ (Express)               │  │
│  └─────────────────────┘  └─────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Log Analytics Workspace                          │   │
│  │ (30 day retention)                               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Cost Estimate

| Service | Cost |
|---------|------|
| Azure Static Web Apps | **Free** (Free tier) |
| Azure Container Apps | **~$0** (scales to zero when idle) |
| Log Analytics | **~$0.10/day** (minimal logs) |
| **Total when idle** | **< $5/month** |

## Prerequisites

1. Azure CLI installed and logged in
2. Terraform installed
3. Existing Terraform state backend (from main infrastructure)

## Deployment

### Option 1: Using the setup script

```bash
cd scripts
./setup-permanent-infra.sh
```

### Option 2: Manual Terraform

```bash
cd infra-permanent

# Initialize
terraform init

# Preview changes
terraform plan

# Apply
terraform apply
```

## Outputs

After deployment, Terraform will output:

- `coordinator_api_url` - URL of the Coordinator API
- `dashboard_url` - URL of the Dashboard
- `dashboard_api_token` - Deployment token (add to GitHub secrets)

## GitHub Secrets Required

Add these secrets to your GitHub repository:

| Secret | Description |
|--------|-------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | From `terraform output -raw dashboard_api_token` |
| `COORDINATOR_API_URL` | From `terraform output -raw coordinator_api_url` |

## How It Controls Main Infrastructure

The dashboard controls the main Minecraft infrastructure by:

1. Reading/writing the `INFRASTRUCTURE_STATE` file in the repo
2. This triggers the `terraform.yaml` GitHub Actions workflow
3. Terraform provisions or destroys all Azure resources

```
Dashboard → GitHub API → INFRASTRUCTURE_STATE → GitHub Actions → Terraform → Azure
```

## Destroying

To destroy the permanent infrastructure:

```bash
cd infra-permanent
terraform destroy
```

**Warning**: This will remove your dashboard. You'll need to use the CLI or GitHub directly to control the main infrastructure.

