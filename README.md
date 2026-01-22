# ⛏️ World Forge

**Build pixel art in Minecraft from images — watch it construct block by block!**

Paste an image URL or search for any image on the web. Then watch as it builds live in your Minecraft world via RCON commands.

[![Live](https://img.shields.io/badge/Status-Live-brightgreen)](/) [![Azure](https://img.shields.io/badge/Cloud-Azure-0078D4)](/) [![Kubernetes](https://img.shields.io/badge/Platform-AKS-326CE5)](/) [![TypeScript](https://img.shields.io/badge/Code-TypeScript-3178C6)](/)

---

## 📑 Contents

- [How It Works](#-how-it-works)
- [Dashboard Features](#-dashboard-features)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Infrastructure (IaC)](#-infrastructure-iac)
- [GitHub Workflows](#-github-workflows)
- [Tech Stack](#-tech-stack)
- [Self-Hosting](#-self-hosting)
- [Cost Breakdown](#-cost-breakdown)

---

## ✨ How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  Provide an image URL                                           │
│  "https://upload.wikimedia.org/wikipedia/commons/apple-logo.png"│
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  🎨 Image-to-Voxel Converter                                    │
│     → Fetches image, analyzes pixels                            │
│     → Maps colors to Minecraft blocks (wool, concrete, etc.)    │
│     → Generates setblock commands                               │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  🔧 Coordinator API executes via RCON                           │
│     → Forceloads chunks                                         │
│     → Places blocks one by one (watch it build!)                │
│     → Your character stays where you are                        │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  🖼️ Your pixel art is now in Minecraft!                         │
│     → Company logos, game sprites, icons                        │
│     → Scales from small (1x) to huge (4x)                       │
│     → Auto-spaced to prevent overlap                            │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- 🖼️ **Image URL mode** — Paste any PNG/JPG URL and watch it build
- 📍 **Auto-positioning** — Assets automatically spaced, never overlap
- ⚡ **Live building** — Watch blocks appear in real-time via RCON
- 🎮 **No restart needed** — Assets build instantly on the live server
- ☢️ **Nuke button** — Clear all assets and reset the world

---


## 🚀 Quick Start

### 1. Deploy Infrastructure
```
Dashboard → Admin → Click "DEPLOY" (or GitHub Actions → "Terraform Apply")
```
*Wait ~12-15 minutes for AKS + Minecraft to spin up — watch progress in the deployment modal!*

### 2. Open Dashboard
```
Dashboard URL shown in GitHub Actions output
```

### 3. Create Your First Asset
```
Dashboard → Create → Enter image URL or search → Build!
```

### 4. Play
```
Minecraft Java → Multiplayer → Add Server → <PUBLIC_IP>:25565
```

### 5. Save Money
```
Dashboard → Admin → Destroy (or run "Terraform Destroy" workflow)
```

---

## 🏗️ Architecture

World Forge uses a **two-tier model** — cheap always-on control plane, expensive Minecraft infra only when needed.

```
┌────────────────────────────────────────────────────────────────────┐
│  CONTROL PLANE (Azure Container Apps)              ~$20/month      │
│                                                                    │
│    ┌─────────────┐         ┌──────────────────┐                   │
│    │  Dashboard  │────────▶│  Coordinator API │                   │
│    │  (Next.js)  │         │  (Express + RCON)│                   │
│    └─────────────┘         └────────┬─────────┘                   │
│          │                          │                              │
│    [Create Assets]          [Build via RCON]                      │
│    [Admin Panel]            [Toggle Infra]                        │
└──────────┬──────────────────────────┼──────────────────────────────┘
           │                          │
           ▼                          ▼
┌────────────────────────────────────────────────────────────────────┐
│  MINECRAFT INFRA (Azure Kubernetes Service)       ~$150/month      │
│                                                                    │
│    ┌─────────────┐   ┌───────────────┐   ┌────────────────┐       │
│    │  Minecraft  │   │   NGINX       │   │   Prometheus   │       │
│    │   (Vanilla) │   │   Ingress     │   │   + Grafana    │       │
│    │             │   │               │   │                │       │
│    └─────────────┘   └───────────────┘   └────────────────┘       │
└────────────────────────────────────────────────────────────────────┘
```

**Why two tiers?** Pay $20/month for the dashboard. Only pay $150/month when actually playing.

---

## 🏗️ Infrastructure (IaC)

All infrastructure is managed with **Terraform**. Nothing is manually created.

### Terraform Files (`infra/`)

| File | Resources |
|------|-----------|
| `main.tf` | Resource group, tags |
| `aks.tf` | Kubernetes cluster |
| `acr.tf` | Container registry |
| `publicip.tf` | Static public IP |
| `log_analytics.tf` | Logging workspace |

### Deploy/Destroy

```bash
# Deploy everything
cd infra && terraform apply

# Destroy everything (stop billing)
cd infra && terraform destroy
```

Or use GitHub Actions workflows for one-click deploy/destroy.

---

## ⚙️ GitHub Workflows

| Workflow | Purpose |
|----------|---------|
| **2. Minecraft Server** | Deploy/destroy AKS infrastructure (triggered by INFRASTRUCTURE_STATE file) |
| **3. Deploy Minecraft Apps** | Deploy Helm charts (Minecraft, monitoring) after AKS is ready |
| **Auto: Build Containers** | Auto-triggered on dashboard/coordinator code changes |

### Typical Usage

```bash
# Start playing  
1. Run "Terraform Apply" workflow

# Create pixel art
2. Dashboard → Create → Build assets

# Stop paying
3. Run "Terraform Destroy" workflow (or Dashboard → Admin → Destroy)
```

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 14, Tailwind CSS, TypeScript |
| **Backend** | Node.js, Express, TypeScript |
| **Game Server** | Minecraft Java Edition 1.21 |
| **Control Plane** | Azure Container Apps |
| **Minecraft Infra** | Azure Kubernetes Service (AKS) |
| **IaC** | Terraform |
| **CI/CD** | GitHub Actions + Azure OIDC |
| **Monitoring** | Prometheus + Grafana |

---

## 🏠 Self-Hosting

### Prerequisites
- Azure subscription with Contributor access
- GitHub repository (fork this)
- Azure CLI + Terraform installed

### Setup

**1. Bootstrap Terraform state storage**
```bash
cd bootstrap && terraform init && terraform apply
```

**2. Create Azure OIDC credentials**
```bash
# Create app registration
az ad app create --display-name "world-forge-github"

# Add federated credential for GitHub Actions
az ad app federated-credential create \
  --id <APP_ID> \
  --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:<YOUR_ORG>/<YOUR_REPO>:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

**3. Set GitHub secrets**

| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | App registration client ID |
| `AZURE_TENANT_ID` | Your Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID |

*Azure credentials use OIDC federation — no secrets needed in GitHub.*

**4. Deploy**
```
GitHub Actions → "Terraform Apply" → Run
```

---

## 💰 Cost Breakdown

### Control Plane (always on)
| Resource | Cost |
|----------|------|
| Dashboard (Container App) | ~$2/month |
| Coordinator (Container App) | ~$12/month |
| Container Registry | ~$5/month |
| **Total** | **~$20/month** |

### Minecraft Infrastructure (when deployed)
| Resource | Cost |
|----------|------|
| AKS (2x Standard_D2ds_v5) | ~$140/month |
| Public IP | ~$3/month |
| **Total** | **~$145/month** |

### Cost Tips
- **Destroy when not playing** — Main infra costs $0 when destroyed
- **Use Dashboard Admin panel** — One-click deploy/destroy with progress tracking
- **Control plane is cheap** — Only ~$20/month for dashboard + coordinator

---

## 📁 Project Structure

```
world-forge/
├── .github/workflows/       # CI/CD pipelines
├── dashboard/               # Next.js frontend
│   ├── app/                 # Pages (home, create, gallery, admin)
│   ├── components/          # React components (Header, Providers)
│   └── lib/                 # API client, types, theme
├── coordinator-api/         # Node.js backend
│   ├── routes/              # API endpoints
│   └── services/            # RCON, image-to-voxel, prometheus, azure-costs, kubernetes
├── infra/                   # Terraform infrastructure
├── apps/                    # Helm values (minecraft, monitoring)
└── schemas/                 # JSON schemas
```

---

## 🛠️ Development

### Cloud-Only Architecture

This project is designed to run entirely in Azure. There is no local development mode.

**To make changes:**

```bash
# Clone the repository
git clone https://github.com/ColeGendreau/Minecraft-1.0.git
cd Minecraft-1.0

# Make your changes...

# Build locally to check for TypeScript/ESLint errors
cd coordinator-api && npm install && npm run build
cd ../dashboard && npm install && npm run build

# Push to main - GitHub Actions will deploy automatically
git add -A && git commit -m "feat: your change" && git push
```

### Building & Pushing Code

```bash
# 1. Make your changes

# 2. Build locally to check for errors
cd coordinator-api && npm run build  # Check TypeScript errors
cd ../dashboard && npm run build     # Check Next.js build + ESLint

# 3. Stage, commit, and push
git add -A
git commit -m "feat/fix: Your descriptive message"
git push origin main

# 4. Monitor the build
# Go to: https://github.com/ColeGendreau/Minecraft-1.0/actions
# Watch "Auto: Build Containers" workflow
```

### Common Build Issues

| Error | Fix |
|-------|-----|
| Missing `.js` extension | Add `.js` to imports in coordinator-api (ESM requires it) |
| Unused variable | Remove it or prefix with `_` |
| Type 'unknown' | Cast with `as TypeName` after `response.json()` |

---

## 📊 Accessing Logs & Monitoring

### GitHub Actions Logs
```
https://github.com/ColeGendreau/Minecraft-1.0/actions
```
- **Auto: Build Containers** — Triggered on every push, builds Docker images
- **1. Control Plane (Dashboard)** — Deploys dashboard + coordinator to Azure Container Apps  
- **2. Minecraft Server** — Deploys/destroys AKS infrastructure
- **3. Deploy Minecraft Apps** — Deploys Minecraft, Prometheus, Grafana to AKS

Click any workflow run → Click a job → View step logs

### Azure Portal Logs

**Container Apps (Dashboard & Coordinator):**
```
https://portal.azure.com → Container Apps → mc-demo-dev-dashboard or mc-demo-dev-coordinator
→ Monitoring → Log stream (real-time)
→ Monitoring → Logs (query with KQL)
```

**AKS Kubernetes Logs:**
```
https://portal.azure.com → Kubernetes services → mc-demo-dev-aks
→ Workloads → Pods → Select pod → Logs
```

### Kubernetes CLI (kubectl)

```bash
# Get all pods
kubectl get pods -A

# View Minecraft server logs
kubectl logs -n minecraft -l app=minecraft-minecraft --tail=100 -f

# View coordinator logs (when running in AKS)
kubectl logs -n default -l app=coordinator --tail=100 -f

# Describe a failing pod
kubectl describe pod <pod-name> -n <namespace>
```

### Prometheus & Grafana (when AKS is deployed)

- **Grafana:** `https://grafana.<PUBLIC_IP>.nip.io` — Direct link to Kubernetes cluster dashboard
- **Prometheus:** `https://prometheus.<PUBLIC_IP>.nip.io` — Raw metrics, PromQL queries

Both use HTTPS with Let's Encrypt certificates via cert-manager + nginx-ingress.

---

## 🤖 AI Agent Handoff Instructions

### Project Overview
World Forge is a Minecraft pixel art builder. Users provide image URLs or search for images, and the app builds them block-by-block in a live Minecraft server via RCON commands.

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `dashboard/` | Next.js frontend (React, Tailwind, TypeScript) |
| `dashboard/app/admin/page.tsx` | Admin panel with infrastructure controls |
| `dashboard/components/Header.tsx` | Global header with nav, hearts, status |
| `coordinator-api/src/` | Express backend (TypeScript) |
| `coordinator-api/src/routes/` | API endpoints |
| `coordinator-api/src/services/` | Business logic (RCON, image processing, monitoring) |
| `infra/` | Terraform IaC for Azure resources |
| `.github/workflows/` | CI/CD pipelines |

### Important Files

| File | What It Does |
|------|--------------|
| `dashboard/lib/api.ts` | Frontend API client + TypeScript types |
| `coordinator-api/src/routes/infrastructure.ts` | Infrastructure status (pings Grafana), deploy/destroy, costs, monitoring, Azure IP lookup |
| `coordinator-api/src/services/prometheus.ts` | Queries Prometheus for cluster metrics |
| `coordinator-api/src/services/azure-costs.ts` | Queries Azure Cost Management API |
| `coordinator-api/src/services/rcon-client.ts` | Sends commands to Minecraft server |
| `coordinator-api/src/services/image-to-voxel.ts` | Converts images to Minecraft blocks |

### Infrastructure Status Detection

The coordinator API determines if infrastructure is running by **pinging Grafana** at the public IP. This is necessary because:
- The API runs in **Azure Container Apps** (separate from AKS)
- It cannot use `kubectl` since it's not inside the Kubernetes cluster
- The public IP is **dynamically looked up** from Azure using the `@azure/arm-network` SDK
- Results are cached for 5 minutes to avoid excessive Azure API calls

### TypeScript Build Requirements

**Coordinator API (ESM module):**
- All imports MUST have `.js` extension: `import { foo } from './bar.js'`
- Use `as TypeName` for `response.json()` calls
- Run `npm run build` in `coordinator-api/` to check

**Dashboard (Next.js):**
- ESLint enforces no unused variables (remove or prefix with `_`)
- Run `npm run build` in `dashboard/` to check

### Git Workflow

```bash
# Always build locally first
cd coordinator-api && npm run build
cd ../dashboard && npm run build

# Then commit and push
git add -A
git commit -m "type: description"
git push origin main

# Watch GitHub Actions for build status
# https://github.com/ColeGendreau/Minecraft-1.0/actions
```

### Environment Variables

The app uses these key environment variables (set in Azure/GitHub):

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | GitHub API access for reading INFRASTRUCTURE_STATE file |
| `AZURE_SUBSCRIPTION_ID` | For Azure Cost Management + public IP lookup |
| `AZURE_CLIENT_ID` | Managed identity client ID (for Azure API auth) |
| `AKS_RESOURCE_GROUP` | Resource group containing AKS (for IP lookup) |
| `MINECRAFT_RCON_HOST` | RCON server IP |
| `MINECRAFT_RCON_PASSWORD` | RCON authentication |

**GitHub Secrets Required:**

| Secret | Purpose |
|--------|---------|
| `AZURE_CLIENT_ID` | Azure AD app registration for OIDC |
| `AZURE_TENANT_ID` | Azure AD tenant |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription |
| `GH_PAT` | Personal Access Token for coordinator to read/write GitHub files |
| `COORDINATOR_API_KEY` | API key for dashboard → coordinator auth (baked at build time) |

**Note:** The public IP is **dynamically looked up** from Azure at runtime. When infrastructure is destroyed and redeployed, the new IP is automatically discovered.

### Common Tasks

**Deploy infrastructure from dashboard:**
- Go to Admin page → Click "DEPLOY" button
- Or run "2. Minecraft Server" workflow manually with action=apply

**Destroy infrastructure:**
- Admin page → Click "DESTROY" button  
- Or run "2. Minecraft Server" workflow with action=destroy

**Check why build failed:**
1. Go to GitHub Actions
2. Click the failed workflow run
3. Expand the failed step
4. Read the error message
5. Fix locally, build, push

**Add a new API endpoint:**
1. Add route in `coordinator-api/src/routes/<file>.ts`
2. Add types in `coordinator-api/src/types/index.ts`
3. Add client function in `dashboard/lib/api.ts`
4. Use in dashboard components

### Public API Endpoints (no auth required)

These read-only endpoints are publicly accessible:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/infrastructure/status` | Server status, services, metrics |
| `GET /api/infrastructure/cost` | Azure cost data (5-min cache) |
| `GET /api/infrastructure/monitoring` | Kubernetes cluster metrics |
| `GET /api/infrastructure/logs` | Azure activity logs |
| `GET /api/infrastructure/pods` | Pod status list |
| `GET /api/infrastructure/nodes` | Node status list |
| `GET /api/assets` | List all built assets |
| `GET /api/workflows/latest` | GitHub workflow status |

Write operations (POST/DELETE) require API key authentication via `X-API-Key` header.

---

## 📄 License

MIT — Build whatever you want.

---

<p align="center">
  <b>Built with ☕ and ⛏️ by Cole Gendreau</b>
</p>
