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
│  Option A: Provide an image URL                                 │
│  "https://upload.wikimedia.org/wikipedia/commons/apple-logo.png"│
├─────────────────────────────────────────────────────────────────┤
│  Option B: Search for an image (Bing Image Search)              │
│  "Ferrari logo" → Bing finds a real image on the web            │
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
│     → Company logos, game sprites, icons                        │
│     → Scales from small (1x) to huge (4x)                       │
│     → Auto-spaced to prevent overlap                            │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- 🖼️ **Image URL mode** — Paste any PNG/JPG URL and watch it build
- 🔍 **Image Search** — Search the web via Bing, find any image
- 📍 **Auto-positioning** — Assets automatically spaced, never overlap
- ⚡ **Live building** — Watch blocks appear in real-time via RCON
- 🎮 **No restart needed** — Assets build instantly on the live server
- ☢️ **Nuke button** — Clear all assets and reset the world

---

## 🎨 Dashboard Features

### Home Page
- Server status and IP address
- How to join instructions
- Asset gallery preview
- Day/night theme toggle ☀️🌙

### Create Page
- **Image URL** — Paste a direct image link
- **Image Search** — Search the web for any image
- Scale selector (1x-4x blocks per pixel)
- Depth selector (flat or 3D relief)
- Facing direction (N/S/E/W)

### Gallery Page
- View all built assets
- Delete individual assets
- Duplicate assets
- Nuke all assets

### Admin Panel
- Server control (deploy/destroy)
- Service status grid
- Cost breakdown
- Monitoring links (Grafana, Prometheus)
- Recent activity log

---

## 🚀 Quick Start

### 1. Deploy Infrastructure
```
GitHub → Actions → "Terraform Apply" → Run workflow
```
*Wait ~10 minutes for AKS + Bing Search + Minecraft to spin up*

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
│    [Admin Panel]            [Image Search]                        │
└──────────┬──────────────────────────┼──────────────────────────────┘
           │                          │
           ▼                          ▼
┌────────────────────────────────────────────────────────────────────┐
│  MINECRAFT INFRA (Azure Kubernetes Service)       ~$150/month      │
│                                                                    │
│    ┌─────────────┐   ┌───────────────┐   ┌────────────────┐       │
│    │  Minecraft  │   │  Bing Search  │   │   Prometheus   │       │
│    │   (Paper)   │   │     API       │   │   + Grafana    │       │
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
| `openai.tf` | Azure OpenAI (GPT-4o) |
| `bing-search.tf` | Bing Image Search API |
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
| **Terraform Apply** | Deploy all infrastructure (AKS, Bing Search, Container Apps) |
| **Terraform Destroy** | Tear down infrastructure to stop billing |
| **Build Containers** | Auto-triggered on code changes |

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
| **Image Search** | Bing Image Search API |
| **Game Server** | Paper MC 1.21 |
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

*No API keys needed — Bing Search credentials are pulled dynamically from Terraform outputs.*

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
| Bing Search API | ~$3/month (1000 searches) |
| Public IP | ~$3/month |
| **Total** | **~$150/month** |

### Cost Tips
- **Destroy when not playing** — Main infra costs $0 when destroyed
- **Use Dashboard Admin panel** — One-click deploy/destroy
- **Image URL mode is free** — Only Image Search uses Bing API

---

## 📁 Project Structure

```
world-forge/
├── .github/workflows/       # CI/CD pipelines
├── dashboard/               # Next.js frontend
│   ├── app/                 # Pages (home, create, gallery, admin)
│   ├── components/          # React components
│   └── lib/                 # API client, types, theme
├── coordinator-api/         # Node.js backend
│   ├── routes/              # API endpoints
│   └── services/            # Bing search, RCON, image-to-voxel
├── infra/                   # Terraform infrastructure
├── apps/                    # Helm values (minecraft, monitoring)
└── schemas/                 # JSON schemas
```

---

## 📄 License

MIT — Build whatever you want.

---

<p align="center">
  <b>Built with ☕ and ⛏️ by Cole Gendreau</b>
</p>
