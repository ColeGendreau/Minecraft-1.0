# ⛏️ World Forge

**Describe any Minecraft world in plain English. AI builds it.**

Just type what you imagine — *"a golden castle with emerald towers surrounded by a moat"* — and watch GPT-4o interpret your vision, generate WorldEdit commands, and construct it on a live server.

[![Live](https://img.shields.io/badge/Status-Live-brightgreen)](/) [![Azure](https://img.shields.io/badge/Cloud-Azure-0078D4)](/) [![Kubernetes](https://img.shields.io/badge/Platform-AKS-326CE5)](/) [![TypeScript](https://img.shields.io/badge/Code-TypeScript-3178C6)](/)

---

## 📑 Contents

- [How It Works](#-how-it-works)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Accessing Services](#-accessing-services)
- [GitHub Workflows](#-github-workflows)
- [Tech Stack](#-tech-stack)
- [Self-Hosting](#-self-hosting)
- [Cost Breakdown](#-cost-breakdown)
- [Monitoring](#-monitoring)

---

## ✨ How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  "A massive golden pyramid with four emerald towers"            │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  🤖 GPT-4o interprets your description creatively               │
│     → Generates world config (biomes, rules, structures)        │
│     → Creates 50+ WorldEdit commands for epic builds            │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  🔧 Coordinator API executes via RCON                           │
│     → Loads chunks with forceload                               │
│     → Builds structures with //pos1, //pos2, //set, //faces     │
│     → Announces world name, restarts server                     │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  🎮 Connect and explore your creation!                          │
│     → Creative mode, peaceful, always daytime                   │
│     → Fly around massive AI-built structures                    │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- 🏰 **Massive structures** — Towers 50-150 blocks tall, platforms 100+ blocks wide
- 🎨 **Creative interpretation** — AI generates evocative names, not just your words
- ⚡ **Auto-restart** — Server restarts with new world after building completes
- 🌅 **Always daytime** — Perfect lighting to admire your creations

---

## 🚀 Quick Start

### 1. Deploy Control Plane
```
GitHub → Actions → "1. Control Plane (Dashboard)" → Run workflow → deploy
```
*Wait ~5 minutes for Dashboard + Coordinator to spin up*

### 2. Deploy Minecraft Server
```
Open Dashboard URL → Click "Deploy" button
```
*Wait ~10 minutes for AKS + Minecraft + Monitoring*

### 3. Forge a World
```
Dashboard → "Forge New World" → Describe anything → Submit
```
*AI generates and builds your world, server restarts*

### 4. Play
```
Minecraft → Multiplayer → Add Server → <PUBLIC_IP>:25565
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
│    │  (Next.js)  │         │  (RCON + OpenAI) │                   │
│    └─────────────┘         └────────┬─────────┘                   │
│          │                          │                              │
│    [Deploy] [Destroy]        [Forge Worlds]                       │
└──────────┬──────────────────────────┼──────────────────────────────┘
           │                          │
           ▼                          ▼
┌────────────────────────────────────────────────────────────────────┐
│  MINECRAFT INFRA (Azure Kubernetes Service)       ~$150/month      │
│                                                                    │
│    ┌─────────────┐   ┌───────────────┐   ┌────────────────┐       │
│    │  Minecraft  │   │  Azure OpenAI │   │   Prometheus   │       │
│    │   (Paper)   │   │   (GPT-4o)    │   │   + Grafana    │       │
│    │  WorldEdit  │   │               │   │                │       │
│    └─────────────┘   └───────────────┘   └────────────────┘       │
└────────────────────────────────────────────────────────────────────┘
```

**Why?** Pay $20/month for the dashboard. Only pay $150/month when actually playing.

---

## 🌐 Accessing Services

| Service | URL |
|---------|-----|
| **Dashboard** | Shown in GitHub Actions output after deploy |
| **Minecraft** | `<PUBLIC_IP>:25565` — shown on Dashboard |
| **Grafana** | `https://grafana.<PUBLIC_IP>.nip.io` |
| **Coordinator API** | `https://mc-demo-dev-coordinator.<region>.azurecontainerapps.io` |

### Get Minecraft IP
```bash
# From Azure CLI
az network public-ip show \
  --resource-group MC_mc-demo-dev-rg_mc-demo-dev-aks_westus3 \
  --name mc-demo-dev-ingress-ip \
  --query ipAddress -o tsv
```

---

## ⚙️ GitHub Workflows

| Workflow | Purpose |
|----------|---------|
| **1. Control Plane (Dashboard)** | Deploy/destroy the Dashboard + Coordinator |
| **2. Minecraft Server** | Provision/destroy AKS + OpenAI (triggered by INFRASTRUCTURE_STATE) |
| **3. Deploy Minecraft Apps** | Install Minecraft + monitoring on AKS |
| **Auto: Build Containers** | Rebuild containers when code changes |

### Typical Usage

```bash
# First time setup
1. Run "1. Control Plane (Dashboard)" → deploy

# Start playing  
2. Dashboard → Deploy button

# Stop paying for Minecraft
3. Dashboard → Destroy button

# Completely shut down ($0/month)
4. Run "1. Control Plane (Dashboard)" → destroy
```

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 14, Tailwind CSS, TypeScript |
| **Backend** | Node.js, Express, TypeScript |
| **AI** | Azure OpenAI GPT-4o |
| **Game Server** | Paper MC 1.21 + WorldEdit 7.4 |
| **Control Plane** | Azure Container Apps |
| **Minecraft Infra** | Azure Kubernetes Service (AKS) |
| **IaC** | Terraform |
| **CI/CD** | GitHub Actions + OIDC |
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

*No AI keys needed — Azure OpenAI credentials are pulled dynamically.*

**4. Deploy**
```
GitHub Actions → "1. Control Plane (Dashboard)" → deploy
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
| Azure OpenAI (GPT-4o) | ~$5-20/month |
| Public IP | ~$3/month |
| **Total** | **~$150/month** |

### Cost Tips
- **Destroy when not playing** — Main infra costs $0 when destroyed
- **Use spot instances** — ~60% cheaper AKS nodes
- **Scale coordinator to 0** — Save ~$10/month (adds cold start delay)

---

## 📊 Monitoring

### Grafana Dashboards
Access at `https://grafana.<PUBLIC_IP>.nip.io`
- **Username:** `admin`
- **Password:** See `apps/monitoring/values.yaml`

| Dashboard | Shows |
|-----------|-------|
| Kubernetes / Cluster | Overall cluster health |
| Kubernetes / Node | Per-node CPU/memory |
| Kubernetes / Pod | Minecraft server metrics |

### Prometheus Queries
```promql
# Minecraft CPU usage
rate(container_cpu_usage_seconds_total{namespace="minecraft"}[5m])

# Minecraft memory
container_memory_usage_bytes{namespace="minecraft"}

# Pod restarts
kube_pod_container_status_restarts_total{namespace="minecraft"}
```

### Azure Portal
**AKS Cluster → Insights** for live logs and performance metrics.

---

## 📁 Project Structure

```
world-forge/
├── .github/workflows/       # CI/CD pipelines
├── dashboard/               # Next.js frontend
├── coordinator-api/         # Node.js backend (RCON + AI)
├── infra/                   # Main infrastructure (Terraform)
├── infra-permanent/         # Control plane (Terraform)
├── apps/                    # Helm values (minecraft, monitoring)
└── INFRASTRUCTURE_STATE     # ON/OFF toggle for main infra
```

---

## 📄 License

MIT — Build whatever you want.

---

<p align="center">
  <b>Built with ☕ and ⛏️</b>
</p>
