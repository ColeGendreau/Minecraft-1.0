# ⛏️ World Forge

**Build pixel art in Minecraft from images or AI lookup — watch it construct block by block!**

Upload an image URL (logos, sprites, icons) or describe what you want and AI finds it. Then watch as it builds live in your Minecraft world.

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
│  Option A: Provide an image URL                                 │
│  "https://upload.wikimedia.org/wikipedia/commons/apple-logo.png"│
├─────────────────────────────────────────────────────────────────┤
│  Option B: Describe what you want (AI Lookup)                   │
│  "Apple logo" → AI finds a real image URL                       │
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
│     → Teleports you to view your creation                       │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  🖼️ Your pixel art is now in Minecraft!                         │
│     → Company logos, game sprites, famous icons                 │
│     → Scales from small (1x) to huge (4x)                       │
│     → Assets organized in zones to prevent overlap              │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- 🖼️ **Image URL mode** — Paste any PNG/JPG URL and watch it build
- 🔍 **AI Lookup mode** — Describe what you want, GPT-4o finds a real image
- 📍 **Auto-positioning** — Assets placed in zones, never overlap
- ⚡ **Live building** — Watch blocks appear in real-time via RCON
- 🎮 **No restart needed** — Assets build instantly on the live server

---

## 🚀 Quick Start

### 1. Deploy Infrastructure
```
GitHub → Actions → "Terraform Apply" → Run workflow
```
*Wait ~10 minutes for AKS + Azure OpenAI + Minecraft to spin up*

### 2. Open Dashboard
```
Dashboard URL shown in GitHub Actions output
```

### 3. Create Your First Asset
```
Dashboard → Create → Enter image URL or use AI Lookup → Build!
```

### 4. Play
```
Minecraft Java → Multiplayer → Add Server → <PUBLIC_IP>:25565
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
│    [Create Assets]          [Build via RCON]                      │
│    [View Gallery]           [AI Image Lookup]                     │
└──────────┬──────────────────────────┼──────────────────────────────┘
           │                          │
           ▼                          ▼
┌────────────────────────────────────────────────────────────────────┐
│  MINECRAFT INFRA (Azure Kubernetes Service)       ~$150/month      │
│                                                                    │
│    ┌─────────────┐   ┌───────────────┐   ┌────────────────┐       │
│    │  Minecraft  │   │  Azure OpenAI │   │   Prometheus   │       │
│    │   (Paper)   │   │   (GPT-4o)    │   │   + Grafana    │       │
│    │             │   │               │   │                │       │
│    └─────────────┘   └───────────────┘   └────────────────┘       │
└────────────────────────────────────────────────────────────────────┘
```

**Why two tiers?** Pay $20/month for the dashboard. Only pay $150/month when actually playing.

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
| **Terraform Apply** | Deploy all infrastructure (AKS, OpenAI, Container Apps) |
| **Terraform Destroy** | Tear down infrastructure to stop billing |
| **Build Containers** | Rebuild containers when code changes |

### Typical Usage

```bash
# Start playing  
1. Run "Terraform Apply" workflow

# Create pixel art
2. Dashboard → Create → Build assets

# Stop paying
3. Run "Terraform Destroy" workflow
```

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 14, Tailwind CSS, TypeScript |
| **Backend** | Node.js, Express, TypeScript |
| **AI** | Azure OpenAI GPT-4o (image lookup) |
| **Game Server** | Paper MC 1.21 |
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
| Azure OpenAI (GPT-4o) | ~$5-20/month |
| Public IP | ~$3/month |
| **Total** | **~$150/month** |

### Cost Tips
- **Destroy when not playing** — Main infra costs $0 when destroyed
- **Use spot instances** — ~60% cheaper AKS nodes

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
├── infra/                   # Terraform infrastructure
├── apps/                    # Helm values (minecraft, monitoring)
└── schemas/                 # JSON schemas
```

---

## 📄 License

MIT — Build whatever you want.

---

<p align="center">
  <b>Built with ☕ and ⛏️</b>
</p>
