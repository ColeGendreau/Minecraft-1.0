# ⛏️ World Forge

**Build pixel art in Minecraft from images — watch it construct block by block!**

Paste an image URL or search for any image on the web. Then watch as it builds live in your Minecraft world via RCON commands.

[![Live](https://img.shields.io/badge/Status-Live-brightgreen)](/) [![Azure](https://img.shields.io/badge/Cloud-Azure-0078D4)](/) [![Kubernetes](https://img.shields.io/badge/Platform-AKS-326CE5)](/) [![TypeScript](https://img.shields.io/badge/Code-TypeScript-3178C6)](/)

---

## 📑 Contents

- [How It Works](#-how-it-works)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Infrastructure (IaC)](#-infrastructure-iac)
- [GitHub Workflows](#-github-workflows)
- [Tech Stack](#-tech-stack)
- [Self-Hosting (Fork & Deploy)](#-self-hosting-fork--deploy) ← **Start here if forking!**
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

> **Forking this repo?** Start at [Self-Hosting (Fork & Deploy)](#-self-hosting-fork--deploy) first!

### 1. Deploy Control Plane (one-time)
```
GitHub → Actions → "1. Control Plane (Dashboard)" → Run with action=deploy
```
*Wait ~5 min for Dashboard URL to appear in workflow output*

### 2. Deploy Minecraft Server
```
Dashboard → Admin → Click "DEPLOY"
```
*Wait ~12-15 minutes for AKS + Minecraft to spin up — watch progress in the deployment modal!*

### 3. Create Your First Asset
```
Dashboard → Create → Enter image URL → Build!
```

### 4. Play
```
Minecraft Java → Multiplayer → Add Server → <PUBLIC_IP>:25565
```

### 5. Save Money
```
Dashboard → Admin → Destroy (stops Minecraft, keeps dashboard ~$6/mo)
— or —
GitHub → Actions → "1. Control Plane" → destroy (stops everything, $0/mo)
```

---

## 🏗️ Architecture

World Forge uses a **three-tier cost model** — pay only for what you need.

```
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 0: FULL SHUTDOWN                                   $0/month   │
│                                                                     │
│    Everything destroyed. Re-deploy from GitHub Actions when ready.  │
│    → GitHub → Actions → "1. Control Plane" → destroy                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ deploy
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 1: CONTROL PLANE (Azure Container Apps)           ~$6/month   │
│                                                                     │
│    ┌─────────────┐         ┌──────────────────┐                    │
│    │  Dashboard  │────────▶│  Coordinator API │                    │
│    │  (Next.js)  │         │  (Express + RCON)│                    │
│    └─────────────┘         └────────┬─────────┘                    │
│          │                          │                               │
│    [Create Assets]          [Build via RCON]                       │
│    [Admin Panel]            [Toggle Infra]                         │
└──────────┬──────────────────────────┼───────────────────────────────┘
           │                          │
           ▼ deploy                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 2: MINECRAFT INFRA (Azure Kubernetes Service)    ~$75/month   │
│                                                                     │
│    ┌─────────────┐   ┌───────────────┐   ┌────────────────┐        │
│    │  Minecraft  │   │   NGINX       │   │   Prometheus   │        │
│    │   (Vanilla) │   │   Ingress     │   │   + Grafana    │        │
│    │             │   │               │   │                │        │
│    └─────────────┘   └───────────────┘   └────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

**Why three tiers?**
- **$0/month** — Full shutdown, zero cost, deploy from GitHub when needed
- **~$6/month** — Dashboard always ready, deploy Minecraft with one click
- **~$80/month** — Full system running, ready to play

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

All workflows are accessible from **GitHub → Actions → (left sidebar)**.

| # | Workflow | Purpose | When to Use |
|---|----------|---------|-------------|
| 0 | **Initial Setup (Run First!)** | One-time setup for new forks | After forking, before anything else |
| 1 | **Control Plane (Dashboard)** | Deploy/destroy the always-on dashboard + coordinator | Initial setup, or to stop ALL billing |
| 2 | **Minecraft Server** | Deploy/destroy AKS infrastructure | Start/stop the Minecraft server |
| 3 | **Deploy Minecraft Apps** | Deploy Helm charts (Minecraft, monitoring) | After AKS is ready |
| Auto | **Build Containers** | Auto-triggered on code changes | Automatic (no manual trigger needed) |

### Three-Tier Cost Control

```
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 0: FULL SHUTDOWN ($0/month)                                   │
│  → Run "1. Control Plane" with action=destroy                       │
│  → Everything is gone, zero Azure costs                             │
│  → Re-deploy from GitHub when ready to use again                    │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ workflow "1. Control Plane" → destroy
                              │
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 1: STANDBY MODE (~$6/month)                                   │
│  → Control Plane running (Dashboard + Coordinator)                  │
│  → Minecraft Server destroyed                                       │
│  → Can deploy Minecraft anytime from Dashboard                      │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Dashboard → Destroy (or workflow 2)
                              │
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 2: FULL RUNNING (~$80/month)                                  │
│  → Control Plane + Minecraft Server + Monitoring                    │
│  → Ready to play and build pixel art                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Typical Usage

**Initial Setup (one-time):**
```
1. GitHub → Actions → "1. Control Plane (Dashboard)" → Run with action=deploy
2. Wait ~5 min for Dashboard URL to appear in workflow output
```

**Daily Usage:**
```
# Start playing  
Dashboard → Admin → Click "DEPLOY" (or run workflow "2. Minecraft Server")

# Create pixel art
Dashboard → Create → Build assets

# Stop paying for Minecraft (keep dashboard)
Dashboard → Admin → Click "DESTROY"
```

**Full Shutdown (stop all billing):**
```
GitHub → Actions → "1. Control Plane (Dashboard)" → Run with action=destroy
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

## 🏠 Self-Hosting (Fork & Deploy)

**No local tools required!** Fork this repo and deploy your own instance in ~15 minutes.

### Step 1: Fork the Repository

Click the **Fork** button at the top of this page.

### Step 2: Get Azure Credentials (via browser)

1. Go to [portal.azure.com](https://portal.azure.com) and sign in
2. Click the **Cloud Shell** icon (`>_`) in the top nav bar
3. Paste this command:

```bash
SUB_ID=$(az account show --query id -o tsv)
echo "AZURE_SUBSCRIPTION_ID: $SUB_ID"
az ad sp create-for-rbac --name "minecraft-devops-setup" --role Contributor --scopes /subscriptions/$SUB_ID \
  --query "{AZURE_CLIENT_ID: appId, AZURE_CLIENT_SECRET: password, AZURE_TENANT_ID: tenant}" -o table
```

4. Copy the 4 values that appear

### Step 3: Create GitHub Personal Access Token

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Check: `repo` (all) + `workflow`
4. Copy the token

### Step 4: Add 5 Secrets to GitHub

Go to your fork → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Value |
|-------------|-------|
| `AZURE_CLIENT_ID` | `appId` from step 2 |
| `AZURE_CLIENT_SECRET` | `password` from step 2 |
| `AZURE_TENANT_ID` | `tenant` from step 2 |
| `AZURE_SUBSCRIPTION_ID` | subscription ID from step 2 |
| `GH_PAT` | token from step 3 |

### Step 5: Run Setup Workflow

1. Go to **Actions** tab in your fork
2. Click **"0. Initial Setup (Run First!)"**
3. Click **Run workflow** → type `setup` → **Run workflow**
4. Wait ~2 minutes ✅

### Step 6: Deploy!

1. Run **"1. Control Plane (Dashboard)"** with `action=deploy`
2. Run **"2. Minecraft Server"** with `action=apply`
3. Play! 🎮

### What Gets Auto-Configured

| Secret | Created By |
|--------|------------|
| `TF_STATE_ACCESS_KEY` | **Auto** (setup workflow) |
| `COORDINATOR_API_KEY` | **Auto** (setup workflow) |
| OIDC Federated Credential | **Auto** (setup workflow) |
| `AZURE_CLIENT_SECRET` | **Deleted** after setup (OIDC replaces it) |

📖 **[Full Guide with Screenshots →](docs/FORK_SETUP.md)**

---

## 💰 Cost Breakdown

*Based on actual Azure Cost Management data (January 2026)*

### Tier 1: Control Plane (Standby Mode)
| Resource | Cost |
|----------|------|
| Container Apps (Dashboard + Coordinator) | ~$4/month |
| Container Registry | ~$2/month |
| **Total** | **~$6/month** |

### Tier 2: Minecraft Infrastructure (added when running)
| Resource | Cost |
|----------|------|
| AKS (2x Standard_D2ds_v5) | ~$70/month |
| Public IP | ~$3/month |
| Log Analytics | ~$1/month |
| **Total** | **+~$75/month** |

### Real Cost Data (from our dashboard)
| Period | Cost |
|--------|------|
| Today | $0.82 |
| This Month (22 days) | $5.03 |
| Monthly Forecast | $7.09 |

### Cost Tips
- **Destroy Minecraft when not playing** — AKS costs $0 when destroyed, but dashboard stays on (~$6/mo)
- **Full shutdown from GitHub** — Run "1. Control Plane" with destroy to stop ALL billing ($0/mo)
- **Use Dashboard Admin panel** — One-click deploy/destroy with progress tracking
- **Real costs displayed** — Admin panel shows live Azure Cost Management data

### Three Cost States

| State | Monthly Cost | How to Enter |
|-------|--------------|--------------|
| **Full Shutdown** | $0 | GitHub → "1. Control Plane" → destroy |
| **Standby** | ~$6 | Dashboard → Admin → Destroy (keeps control plane) |
| **Running** | ~$80 | Dashboard → Admin → Deploy |

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
