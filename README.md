# Minecraft 1.0 - DevOps Project

Fully automated pipeline that provisions and deploys a Minecraft server on Azure Kubernetes Service with HTTPS and public monitoring dashboards.

## Architecture

This project uses:
- **Terraform** for infrastructure provisioning on Azure
- **Helm** for Kubernetes application deployments
- **GitHub Actions** for CI/CD automation
- **cert-manager** for automatic HTTPS certificates via Let's Encrypt
- **Prometheus + Grafana + Loki** for monitoring and logging
- **NGINX Ingress Controller** for routing and TLS termination

## Automated Workflows

### Infrastructure Pipeline (`.github/workflows/terraform.yaml`)
**Triggers**: Changes to `infra/**` files
**Actions**: Runs `terraform plan` and `terraform apply` to provision/update Azure resources
**Authentication**: OIDC (no stored credentials)

### Application Deployment Pipeline (`.github/workflows/deploy.yaml`)
**Triggers**: Changes to `apps/**` or `environments/**` files
**Actions**: 
- Automatically runs `helm upgrade` for modified applications
- Detects which service changed and deploys only that service
- Waits for deployments to be healthy before completing

**Example**: Change `apps/minecraft/values.yaml` → Push to GitHub → Minecraft automatically redeploys in ~60 seconds

## Prerequisites

- Azure subscription with appropriate permissions
- Azure CLI installed (`az`)
- Terraform >= 1.5.0
- kubectl
- Helm >= 3.0
- GitHub repository with OIDC configured for Azure

## Step 1: Infrastructure Provisioning with Terraform

### What Gets Created

The Terraform configuration in `infra/` provisions:

| Resource | Description |
|----------|-------------|
| **Resource Group** | Container for all Azure resources |
| **Azure Container Registry (ACR)** | Private container registry (Basic SKU) |
| **Azure Kubernetes Service (AKS)** | Managed Kubernetes cluster with 2 nodes |
| **Log Analytics Workspace** | Centralized logging and monitoring |
| **Static Public IP** | Dedicated IP for NGINX ingress controller |

### Configuration Files

```
infra/
├── versions.tf         # Terraform and provider version constraints
├── providers.tf        # Azure provider configuration
├── variables.tf        # Input variables with defaults
├── main.tf            # Resource group
├── acr.tf             # Azure Container Registry + AKS integration
├── log_analytics.tf   # Log Analytics workspace and Container Insights
├── aks.tf             # AKS cluster with monitoring enabled
├── publicip.tf        # Static public IP for ingress
└── outputs.tf         # Output values for use in CI/CD
```

### Key Configuration Details

- **Project Name**: `mc-demo` (customizable via variable)
- **Default Region**: `westus3`
- **Node Size**: `Standard_D2as_v5` (cost-effective ARM-based VMs)
- **Node Count**: 2 (for high availability)
- **Kubernetes Version**: 1.28
- **ACR SKU**: Basic (low-cost option)
- **Network Plugin**: kubenet (simpler networking model)

### Local Deployment

1. **Navigate to the infrastructure directory:**
   ```bash
   cd infra/
   ```

2. **Initialize Terraform:**
   ```bash
   terraform init
   ```

3. **Review the execution plan:**
   ```bash
   terraform plan
   ```

4. **Apply the configuration:**
   ```bash
   terraform apply
   ```

5. **Save important outputs:**
   ```bash
   # Get the ingress public IP
   terraform output ingress_public_ip
   
   # Configure kubectl to access your cluster
   az aks get-credentials --resource-group mc-demo-dev-rg --name mc-demo-dev-aks
   
   # Verify cluster access
   kubectl get nodes
   ```

### Customization

Create a `terraform.tfvars` file to override defaults:

```hcl
project_name    = "my-mc-server"
environment     = "prod"
location        = "eastus"
aks_node_count  = 3
aks_node_size   = "Standard_D4as_v5"
```

### Outputs

After successful deployment, Terraform provides:

- `ingress_public_ip` - Use this for DNS configuration
- `aks_cluster_name` - Cluster name for kubectl configuration
- `acr_login_server` - Container registry URL
- `configure_kubectl_command` - Ready-to-run kubectl config command

### Cost Estimation

Expected monthly costs (approximate):
- AKS: ~$140 (2x Standard_D2as_v5 nodes)
- ACR Basic: ~$5
- Public IP: ~$3
- Log Analytics: ~$2-10 (usage-based)

**Total: ~$150-160/month**

### Cleanup

To destroy all resources:

```bash
cd infra/
terraform destroy
```

**Warning**: This permanently deletes all resources and data.

---

## Step 2: GitHub Actions Automation

The Terraform workflow at `.github/workflows/terraform.yaml` automatically runs on pushes to `main` that modify `infra/**`.

### Workflow Steps

1. **Format Check** - Validates Terraform code formatting
2. **Initialize** - Downloads providers and modules
3. **Validate** - Checks configuration syntax
4. **Plan** - Creates execution plan
5. **Apply** - Applies infrastructure changes (main branch only)

### Authentication

Uses Azure OIDC (no stored credentials). Requires three repository secrets:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

See [docs/SETUP.md](docs/SETUP.md) for complete Azure and GitHub configuration instructions.

### Manual Trigger

You can also trigger the workflow manually from the Actions tab using `workflow_dispatch`.

---

## Step 3: Kubernetes Cluster Setup

### Step 3A: Local Bootstrap (Helm)

After Terraform has provisioned the infrastructure, bootstrap the cluster with required components using Helm.

**Prerequisites:**
- Infrastructure deployed via Terraform
- kubectl configured to access the AKS cluster
- Helm 3.x installed

**Configuration Files:**
- `environments/ingress-values.yaml` - NGINX Ingress Controller settings
- `environments/cert-manager-values.yaml` - cert-manager installation options
- `apps/cert-manager/cluster-issuer.yaml` - Let's Encrypt ClusterIssuer

**Bootstrap Commands:**

```bash
# Get cluster credentials
az aks get-credentials --resource-group mc-demo-dev-rg --name mc-demo-dev-aks

# Add Helm repositories
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install NGINX Ingress Controller
# Update environments/ingress-values.yaml with the actual ingress IP first
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --values environments/ingress-values.yaml

# Install cert-manager
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --values environments/cert-manager-values.yaml

# Apply Let's Encrypt ClusterIssuer
# Update apps/cert-manager/cluster-issuer.yaml with your email first
kubectl apply -f apps/cert-manager/cluster-issuer.yaml

# Verify installations
kubectl get pods -n ingress-nginx
kubectl get pods -n cert-manager
kubectl get clusterissuer
```

**Next:** Configure monitoring stack (Prometheus, Grafana, Loki) and Minecraft server deployment.

---

## Next Steps

- [x] Step 1: Infrastructure as Code with Terraform
- [x] Step 2: GitHub Actions with OIDC authentication
- [ ] Step 3: Configure Helm charts for in-cluster components (ingress, cert-manager, monitoring, Minecraft)
- [ ] Step 4: Create CI/CD pipeline for automated Helm deployments
- [ ] Step 5: Add demonstration configuration (MOTD change trigger)

## Additional Resources

- [Azure Kubernetes Service Documentation](https://docs.microsoft.com/en-us/azure/aks/)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Helm Documentation](https://helm.sh/docs/)

## License

MIT License
