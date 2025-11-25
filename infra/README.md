# Infrastructure Configuration

Terraform configuration for provisioning Azure infrastructure.

## Files Overview

| File | Purpose |
|------|---------|
| `versions.tf` | Terraform and provider version requirements |
| `providers.tf` | Azure provider configuration with OIDC support |
| `variables.tf` | Input variable definitions with defaults |
| `main.tf` | Resource group definition |
| `acr.tf` | Azure Container Registry and AKS integration |
| `log_analytics.tf` | Log Analytics workspace for monitoring |
| `aks.tf` | AKS cluster with security and monitoring |
| `publicip.tf` | Static public IP for ingress controller |
| `outputs.tf` | Output values for downstream use |

## Quick Start

### Initial Setup

```bash
# Initialize Terraform
terraform init

# Format code
terraform fmt -recursive

# Validate configuration
terraform validate

# Review changes
terraform plan

# Apply infrastructure
terraform apply
```

### After Deployment

```bash
# Get outputs
terraform output

# Configure kubectl
terraform output -raw configure_kubectl_command | bash

# Or manually:
az aks get-credentials \
  --resource-group $(terraform output -raw resource_group_name) \
  --name $(terraform output -raw aks_cluster_name)

# Test cluster access
kubectl get nodes
kubectl get namespaces
```

## Configuration

### Using terraform.tfvars

Create a `terraform.tfvars` file (see `terraform.tfvars.example`):

```hcl
project_name = "mc-demo"
environment  = "dev"
location     = "westus3"
```

### Environment Variables

For CI/CD, use environment variables:

```bash
export TF_VAR_project_name="mc-demo"
export TF_VAR_environment="prod"
export TF_VAR_location="westus3"
```

### OIDC Authentication (GitHub Actions)

The provider is configured to support OIDC authentication from GitHub Actions. Set these environment variables in your workflow:

```yaml
env:
  ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
  ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
  ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
  ARM_USE_OIDC: true
```

## Resource Details

### Resource Group
- **Name Pattern**: `{project_name}-{environment}-rg`
- **Location**: Configurable (default: westus3)

### Azure Container Registry (ACR)
- **Name Pattern**: `{project_name}{environment}acr` (no hyphens)
- **SKU**: Basic (cost-effective for small projects)
- **Admin Access**: Disabled (uses managed identity)
- **AKS Integration**: Automatic pull permissions granted

### Log Analytics Workspace
- **Name Pattern**: `{project_name}-{environment}-logs`
- **SKU**: PerGB2018 (pay-as-you-go)
- **Retention**: 30 days
- **Container Insights**: Enabled for AKS monitoring

### Azure Kubernetes Service (AKS)
- **Name Pattern**: `{project_name}-{environment}-aks`
- **Kubernetes Version**: 1.28 (configurable)
- **Node Pool**:
  - Name: `default`
  - Count: 2 nodes (configurable)
  - VM Size: Standard_D2as_v5 (2 vCPU, 8 GB RAM)
  - OS Disk: 30 GB
- **Network**: kubenet plugin with Calico network policy
- **Monitoring**: Azure Monitor Container Insights enabled
- **RBAC**: Azure AD integration with Azure RBAC
- **Identity**: System-assigned managed identity

### Static Public IP
- **Name Pattern**: `{project_name}-{environment}-ingress-ip`
- **Location**: Same as AKS node resource group
- **SKU**: Standard (required for Standard Load Balancer)
- **Allocation**: Static
- **Purpose**: Assigned to NGINX ingress controller

## Outputs

Key outputs for CI/CD and Helm deployments:

| Output | Description | Usage |
|--------|-------------|-------|
| `ingress_public_ip` | Static IP address | Configure DNS A record |
| `aks_cluster_name` | AKS cluster name | kubectl configuration |
| `acr_login_server` | ACR URL | Container image references |
| `configure_kubectl_command` | kubectl config command | Quick cluster access |

## Security Notes

- Managed Identity: AKS uses system-assigned identity (no stored credentials)
- RBAC: Azure AD integration enabled
- Network Policy: Calico enabled for pod-level security
- Private Registry: ACR integration without admin credentials
- Monitoring: Container Insights enabled for security logging

## Cost Optimization

- Basic ACR: $5/month vs $50/month for Standard
- Standard_D2as_v5: ARM-based VMs are ~20% cheaper than x86
- 2 Nodes: Minimum for HA, scales up as needed
- 30-day Log Retention: Balance between cost and compliance needs

## Cleanup

```bash
# Destroy all resources
terraform destroy

# Delete local state
rm -rf .terraform terraform.tfstate*
```

## Troubleshooting

### "Error: Resource Group not found"
- Ensure your Azure credentials are configured
- Check `az account show` to verify subscription

### "Error: Insufficient quota"
- Request quota increase in Azure Portal
- Try a different region or VM size

### "Error: Public IP not found"
- The public IP is created in the AKS node resource group
- Wait for AKS cluster to be fully provisioned first

### State Lock Issues
```bash
# Force unlock if needed (use with caution)
terraform force-unlock <LOCK_ID>
```

## References

- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [AKS Best Practices](https://docs.microsoft.com/en-us/azure/aks/best-practices)
- [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)



