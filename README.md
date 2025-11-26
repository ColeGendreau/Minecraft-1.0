# Minecraft DevOps Pipeline

Production-grade automated DevOps pipeline deploying a Minecraft server on Azure Kubernetes Service with complete CI/CD, HTTPS, and monitoring.

---

## Live Demo

When infrastructure is running, access via:

**Grafana Dashboard:** `https://grafana.<PUBLIC_IP>.nip.io` (see Terraform outputs)  
**Minecraft Server:** `<PUBLIC_IP>:25565` (see Terraform outputs)

To get your current IP and URLs, check the Terraform workflow logs after deployment completes.

---

## What This Does

Complete end-to-end automation from infrastructure to deployment:

1. **Push code** to GitHub
2. **GitHub Actions** detects changes and authenticates via OIDC
3. **Terraform** provisions Azure infrastructure OR **Helm** deploys applications
4. **Kubernetes** performs rolling updates with zero downtime
5. **Live in ~2 minutes** with full monitoring

All configuration is declarative, version-controlled, and automatically deployed.

---


## Tech Stack

**Cloud & Infrastructure**
- Azure Kubernetes Service (AKS)
- Azure Container Registry (ACR)
- Terraform with remote state backend
- Azure Load Balancer + Static Public IP

**Kubernetes & Deployment**
- Helm for package management
- NGINX Ingress Controller
- cert-manager + Let's Encrypt (automated TLS)
- Rolling update deployments

**CI/CD & Security**
- GitHub Actions workflows
- OpenID Connect (OIDC) authentication
- Zero stored credentials
- Kubernetes RBAC

**Monitoring & Observability**
- Prometheus metrics collection
- Grafana dashboards (public HTTPS access)
- Azure Log Analytics + Container Insights

---

## Key Features

- **Full Infrastructure as Code** - Complete Azure setup in Terraform
- **Automated CI/CD** - Push to deploy, no manual steps
- **Zero Stored Credentials** - OIDC authentication everywhere
- **HTTPS Everywhere** - Automated Let's Encrypt certificates
- **Complete Monitoring** - Real-time metrics and dashboards
- **GitOps Workflow** - Git as single source of truth
- **Production Patterns** - Remote state, RBAC, rolling updates

---

## Repository Structure

```
├── .github/workflows/    # CI/CD automation
│   ├── terraform.yaml    # Infrastructure deployment
│   └── deploy.yaml       # Application deployment
├── infra/                # Terraform configuration
│   ├── main.tf          # Resource group
│   ├── aks.tf           # Kubernetes cluster
│   ├── acr.tf           # Container registry
│   └── ...
├── apps/                 # Application configurations
│   ├── minecraft/       # Minecraft server config
│   └── monitoring/      # Prometheus + Grafana
└── environments/         # Helm values
    ├── ingress-values.yaml
    └── cert-manager-values.yaml
```

---

## Architecture

```
Developer → Git Push → GitHub Actions (OIDC) → Azure
                                ↓
                        Terraform or Helm
                                ↓
                        Azure Kubernetes Service
                                ↓
                    Live Services + Monitoring
```

**Infrastructure Pipeline:**
- Triggers on changes to `infra/**`
- Runs Terraform plan and apply
- Provisions AKS, ACR, networking, monitoring

**Application Pipeline:**
- Triggers on changes to `apps/**` or `environments/**`
- Detects which service changed
- Runs Helm upgrade for affected services only
- Waits for pods to be healthy

---

## Quick Start

**Prerequisites:** Azure subscription with Contributor access, GitHub repository

### One-Time Setup

**1. Bootstrap Terraform State Backend**
```bash
cd bootstrap/
terraform init
terraform apply
```

**2. Configure GitHub Secrets**

Add these repository secrets for OIDC authentication:
- `AZURE_CLIENT_ID` - App registration client ID
- `AZURE_TENANT_ID` - Azure tenant ID  
- `AZURE_SUBSCRIPTION_ID` - Azure subscription ID
- `TF_STATE_ACCESS_KEY` - Storage account access key from step 1

### Deploy Infrastructure

```bash
echo "ON" > INFRASTRUCTURE_STATE
git add INFRASTRUCTURE_STATE
git commit -m "deploy infrastructure"
git push
```

**What happens:** GitHub Actions provisions Azure infrastructure (AKS, ACR, networking) and automatically deploys all applications (NGINX Ingress, cert-manager, Minecraft, Grafana). Total time: ~12-15 minutes.

### Destroy Infrastructure

```bash
echo "OFF" > INFRASTRUCTURE_STATE
git add INFRASTRUCTURE_STATE
git commit -m "destroy infrastructure"
git push
```

**What happens:** Kubernetes resources are cleaned up, then Terraform destroys all Azure infrastructure. Total time: ~10-12 minutes.

---

## Configuration

**Change Minecraft settings:** Edit `apps/minecraft/values.yaml` and push to Git. Automated deployment updates the server in ~60 seconds.

**Modify infrastructure:** Edit files in `infra/` and push to Git. Terraform automatically applies changes.

**Scale cluster:** Update `aks_node_count` in `infra/variables.tf` or `terraform.tfvars`.

---

## Cost Estimate

Running infrastructure costs approximately **$3-5/day** (~$100-150/month):
- AKS cluster (2 nodes): ~$3.50/day
- Azure Container Registry (Basic): ~$0.16/day  
- Log Analytics: ~$0.10-0.50/day
- Static Public IP: ~$0.10/day

Can be destroyed and rebuilt in ~10 minutes via automation.

---

## License

MIT License
