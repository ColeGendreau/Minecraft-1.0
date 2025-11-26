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

## One-Click Infrastructure & Application Deployment

Control your entire stack with a single file:

**To provision everything (infrastructure + all applications):**
```bash
echo "ON" > INFRASTRUCTURE_STATE
git add INFRASTRUCTURE_STATE
git commit -m "provision infrastructure and deploy applications"
git push
```

**What happens automatically:**
1. Terraform provisions Azure infrastructure (~7-10 minutes)
   - AKS cluster, ACR, Log Analytics, Public IP
2. Deploy workflow automatically triggers and deploys all applications (~3-5 minutes)
   - NGINX Ingress Controller
   - cert-manager with Let's Encrypt
   - Minecraft Server (with auto-detected Public IP)
   - Prometheus & Grafana monitoring (with HTTPS)
3. **Result:** Fully functional Minecraft server with monitoring at a new IP address

**Total time:** ~12-15 minutes from zero to fully deployed

---

**To destroy everything (save costs):**
```bash
echo "OFF" > INFRASTRUCTURE_STATE
git add INFRASTRUCTURE_STATE
git commit -m "destroy infrastructure"
git push
```

**What happens automatically:**
1. Workflow cleans up Kubernetes resources (LoadBalancers, namespaces)
2. Terraform destroys all Azure infrastructure
3. **Total time:** ~10-12 minutes

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

**Prerequisites:** Azure subscription, Azure CLI, Terraform, kubectl, Helm

### 1. Bootstrap Terraform State Backend
```bash
cd bootstrap/
terraform init
terraform apply
```

### 2. Deploy Infrastructure
```bash
cd infra/
terraform init
terraform apply
```

### 3. Deploy Applications
```bash
# Connect to cluster
az aks get-credentials --resource-group mc-demo-dev-rg --name mc-demo-dev-aks

# Add Helm repos
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo add itzg https://itzg.github.io/minecraft-server-charts/
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Deploy services (see docs/ for detailed commands)
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace --values environments/ingress-values.yaml
helm upgrade --install cert-manager jetstack/cert-manager -n cert-manager --create-namespace --values environments/cert-manager-values.yaml
kubectl apply -f apps/cert-manager/cluster-issuer.yaml
helm upgrade --install minecraft itzg/minecraft -n minecraft --create-namespace --values apps/minecraft/values.yaml
helm upgrade --install prometheus-community prometheus-community/kube-prometheus-stack -n monitoring --create-namespace --values apps/monitoring/values.yaml
```

### 4. Set up GitHub Actions

Configure repository secrets:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `TF_STATE_ACCESS_KEY`

See [docs/SETUP.md](docs/SETUP.md) for detailed Azure OIDC configuration.

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
