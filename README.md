# ⛏️ World Forge

**Create ANY Minecraft world you can imagine using natural language.**

Floating sky islands? Neon cyberpunk city? Giant basketball houses? Just describe it — AI interprets your vision and builds it in a live Minecraft server.

![World Forge Dashboard](https://img.shields.io/badge/Status-Live-brightgreen) ![Azure](https://img.shields.io/badge/Cloud-Azure-0078D4) ![Kubernetes](https://img.shields.io/badge/Platform-Kubernetes-326CE5) ![TypeScript](https://img.shields.io/badge/Code-TypeScript-3178C6)

---

## 📑 Table of Contents

- [What is World Forge?](#-what-is-world-forge)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Example Worlds](#-example-worlds)
- [Infrastructure Control](#-infrastructure-control)
- [Accessing Services](#-accessing-services)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Self-Hosting Guide](#-self-hosting-guide)
- [Monitoring & Observability](#-monitoring--observability)
- [Cost](#-cost)
- [Features](#-features)
- [Roadmap](#-roadmap)

---

## ✨ What is World Forge?

World Forge is an AI-powered Minecraft world creation platform. You describe any world in plain English, and the system:

1. **Interprets** your description using Azure OpenAI (GPT-4o)
2. **Generates** a structured world configuration (biomes, structures, game rules)
3. **Configures** a live Minecraft server via RCON
4. **Builds** custom structures using WorldEdit commands

No Minecraft knowledge required. No complex configuration. Just imagination.

### How It Works

```
You: "Giant basketball-shaped houses with a court made of gold blocks"
        ↓
   GPT-4o interprets your vision creatively
        ↓
   Generates: flat world + WorldEdit commands for basketball structures
        ↓
   RCON executes commands to BUILD your world
        ↓
   You connect and explore your creation
```

---

## 🏗️ Architecture

World Forge uses a **two-tier infrastructure** model for cost efficiency:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  "Permanent Infrastructure" workflow                               │  │
│  │  • Deploy  → creates Dashboard + Coordinator (~$20/month)          │  │
│  │  • Destroy → tears down control plane                              │  │
│  │  • Status  → shows current state                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PERMANENT INFRA (Azure Container Apps)              ~$20/month         │
│  ┌──────────────────┐    ┌────────────────────┐                        │
│  │    Dashboard     │───▶│  Coordinator API   │                        │
│  │    (Next.js)     │    │  (Node.js + RCON)  │                        │
│  └──────────────────┘    └─────────┬──────────┘                        │
│                                    │                                    │
│                          ┌─────────┴─────────┐                         │
│                          ▼                   ▼                         │
│                   [Deploy Button]    [Destroy Button]                  │
└──────────────────────────┬───────────────────┬──────────────────────────┘
                           │                   │
                           ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  MAIN INFRA (Azure Kubernetes Service)               ~$150/month        │
│  ┌───────────┐  ┌─────────────────┐  ┌──────────────┐                  │
│  │    AKS    │  │  Azure OpenAI   │  │  Monitoring  │                  │
│  │ (MC svr)  │  │    (GPT-4o)     │  │  (Grafana)   │                  │
│  └───────────┘  └─────────────────┘  └──────────────┘                  │
│         Deployed/Destroyed via Dashboard buttons                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why Two Tiers?

| Tier | Cost | Purpose | Controlled By |
|------|------|---------|---------------|
| **Permanent** | ~$20/month | Dashboard + Coordinator (always on) | GitHub Actions |
| **Main** | ~$150/month | Minecraft + AI + Monitoring | Dashboard buttons |

**Result:** Pay ~$20/month to have the dashboard always available. Only pay ~$150/month when actually playing Minecraft.

---

## 🚀 Quick Start

### 1. Deploy Permanent Infrastructure (from GitHub)

1. Go to **Actions** → **"Permanent Infrastructure"**
2. Click **"Run workflow"** → Select **"deploy"**
3. Wait ~5 minutes

### 2. Deploy Minecraft (from Dashboard)

1. Open the Dashboard URL (shown in workflow output)
2. Click **"Deploy"** button
3. Wait ~10 minutes for Minecraft to start

### 3. Create a World

1. Click **"Forge New World"**
2. Describe your world: *"A medieval castle on a floating island with waterfalls"*
3. Watch GPT-4o interpret and build it!

### 4. Connect to Minecraft

```
Server Address: <PUBLIC_IP>:25565
```

---

## 🌍 Example Worlds

Just describe what you want — the AI figures out the rest:

| Your Description | What Gets Built |
|-----------------|-----------------|
| *"Floating sky islands connected by rope bridges with waterfalls"* | Void world with custom island structures, water features |
| *"Neon cyberpunk cityscape with towering skyscrapers"* | Flat urban terrain, beacon-lit towers, dark atmosphere |
| *"Giant basketball-shaped houses with gold block courts"* | Creative structures using spheres and colored blocks |
| *"A Fullscript-inspired wellness city with tech buildings"* | Green-themed metropolis with emerald and quartz towers |
| *"Viking village with longhouses and fjord coastlines"* | Snowy taiga, custom Nordic buildings, coastal terrain |
| *"Haunted gothic castle with graveyards"* | Dark forest, castle structure, crypts, cobwebs, bats |
| *"Japanese cherry blossom temple gardens"* | Cherry grove biome, torii gates, koi ponds, pagodas |

The AI generates **creative names** (not just your prompt words) and **WorldEdit commands** to actually build the structures!

---

## 🎮 Infrastructure Control

### From GitHub Actions

| Workflow | Action | What It Does |
|----------|--------|--------------|
| **Permanent Infrastructure** | `deploy` | Creates Dashboard + Coordinator |
| **Permanent Infrastructure** | `destroy` | Removes control plane |
| **Permanent Infrastructure** | `status` | Shows current state |

### From Dashboard

| Button | What It Does |
|--------|--------------|
| **Deploy** | Starts AKS + Minecraft + Monitoring |
| **Destroy** | Stops everything (saves money) |

### Current World View

The **Worlds** page shows:
- **Current World** — The active deployed world
- **Building** — Shows when a new world is being forged
- **History** — Past worlds with "Rebuild" button

---

## 🌐 Accessing Services

### Dashboard
```
https://mc-demo-dev-dashboard.salmonground-cc71667a.westus3.azurecontainerapps.io
```

### Minecraft Server
```
<PUBLIC_IP>:25565
```
Get the IP from Dashboard or:
```bash
az network public-ip show \
  --resource-group MC_mc-demo-dev-rg_mc-demo-dev-aks_westus3 \
  --name mc-demo-dev-ingress-ip \
  --query ipAddress -o tsv
```

### Grafana (Monitoring)
```
https://grafana.<PUBLIC_IP>.nip.io
```
- **Username:** `admin`
- **Password:** Check `apps/monitoring/values.yaml`

### Coordinator API
```
https://mc-demo-dev-coordinator.salmonground-cc71667a.westus3.azurecontainerapps.io
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, Tailwind CSS | Dashboard UI |
| **API** | Node.js, Express, TypeScript | Backend coordination |
| **AI** | Azure OpenAI (GPT-4o) | Natural language → world config |
| **Game Server** | Paper MC 1.21+ | Minecraft server |
| **Plugins** | WorldEdit 7.4 | Structure building via RCON |
| **Permanent Infra** | Azure Container Apps | Dashboard + Coordinator |
| **Main Infra** | Azure Kubernetes Service | Minecraft + Monitoring |
| **IaC** | Terraform | Infrastructure as Code |
| **CI/CD** | GitHub Actions | Automated deployments |
| **Auth** | OIDC (OpenID Connect) | Passwordless Azure auth |
| **Monitoring** | Prometheus + Grafana | Metrics & dashboards |

---

## 📁 Project Structure

```
world-forge/
├── .github/workflows/
│   ├── permanent-infra.yaml  # Deploy/destroy Dashboard + Coordinator
│   ├── terraform.yaml        # Main infrastructure provisioning
│   ├── deploy.yaml           # Minecraft + apps deployment
│   └── dashboard-deploy.yaml # Build & push containers
│
├── dashboard/                 # Next.js frontend
│   ├── app/
│   │   ├── page.tsx          # Home page
│   │   ├── create/           # World creation
│   │   └── worlds/           # World list & details
│   └── components/
│
├── coordinator-api/           # Backend API
│   └── src/
│       ├── routes/worlds.ts  # World creation endpoints
│       ├── services/
│       │   ├── ai-planner.ts # Azure OpenAI integration
│       │   └── rcon-client.ts# Minecraft RCON
│       └── types/
│
├── infra/                     # Main infrastructure (Terraform)
│   ├── aks.tf                # Kubernetes cluster
│   ├── openai.tf             # Azure OpenAI service
│   ├── acr.tf                # Container registry
│   └── publicip.tf           # Static IP
│
├── infra-permanent/           # Permanent infrastructure (Terraform)
│   └── main.tf               # Dashboard + Coordinator Container Apps
│
├── apps/                      # Helm values
│   ├── minecraft/values.yaml
│   └── monitoring/values.yaml
│
└── INFRASTRUCTURE_STATE       # ON/OFF toggle for main infra
```

---

## 🚀 Self-Hosting Guide

### Prerequisites

- **Azure subscription** with Contributor access
- **GitHub repository** (fork this repo)
- **Azure CLI** installed locally
- **Terraform** installed locally

### Step 1: Bootstrap Terraform State

```bash
cd bootstrap
terraform init
terraform apply
```

### Step 2: Configure GitHub OIDC

1. Create Azure App Registration
2. Add Federated Credential for GitHub Actions
3. Set subject: `repo:<owner>/<repo>:ref:refs/heads/main`

### Step 3: Set GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | App registration client ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

**Note:** No AI API keys needed! Azure OpenAI credentials are pulled dynamically from the infrastructure.

### Step 4: Deploy

1. **GitHub Actions** → **Permanent Infrastructure** → **Run workflow** → `deploy`
2. Wait for Dashboard URL
3. Click **Deploy** button on Dashboard

---

## 📊 Monitoring & Observability

### Grafana Dashboards

| Dashboard | Description |
|-----------|-------------|
| **Kubernetes / Compute Resources / Cluster** | Overall cluster metrics |
| **Kubernetes / Compute Resources / Node** | Per-node usage |
| **Kubernetes / Compute Resources / Pod** | Per-pod metrics |

### Prometheus Metrics

```promql
# Minecraft server CPU
container_cpu_usage_seconds_total{namespace="minecraft"}

# Minecraft memory usage
container_memory_usage_bytes{namespace="minecraft"}

# Pod restart count
kube_pod_container_status_restarts_total{namespace="minecraft"}
```

### Azure Log Analytics

- **Azure Portal** → **AKS Cluster** → **Insights**
- Live container logs
- Performance metrics

---

## 💰 Cost

### Permanent Infrastructure (always on)

| Resource | Monthly Cost |
|----------|--------------|
| Dashboard (Container App) | ~$1.50 |
| Coordinator (Container App) | ~$12 |
| Container Registry (Basic) | $5 |
| Log Analytics | ~$1 |
| **Total** | **~$20/month** |

### Main Infrastructure (when deployed)

| Resource | Monthly Cost |
|----------|--------------|
| AKS (2 nodes, D2ds_v6) | ~$140 |
| Azure OpenAI (GPT-4o) | ~$5-20 (usage) |
| Public IP | ~$3 |
| **Total** | **~$150/month** |

### Cost Optimization

- **Destroy main infra when not playing** — $0/day when OFF
- **Set coordinator minReplicas=0** — Save ~$10/month (adds cold start)
- **Use spot instances** — ~60% cheaper AKS nodes

---

## 🎯 Features

### Core Features
- ✅ **Natural Language Input** — Describe worlds in plain English
- ✅ **AI Interpretation** — GPT-4o translates vision to Minecraft
- ✅ **Live Building** — WorldEdit constructs structures via RCON
- ✅ **Creative Naming** — AI generates evocative world names
- ✅ **World History** — View and rebuild past worlds

### Infrastructure Features
- ✅ **Two-Tier Architecture** — Pay only for what you use
- ✅ **GitHub Actions Control** — Deploy/destroy permanent infra
- ✅ **Dashboard Control** — Deploy/destroy Minecraft infra
- ✅ **Zero Stored Credentials** — OIDC + dynamic secrets
- ✅ **Full Monitoring** — Prometheus + Grafana included

### Developer Features
- ✅ **TypeScript Throughout** — Frontend, backend, types
- ✅ **100% IaC** — Everything in Terraform
- ✅ **Modular Architecture** — Easy to extend
- ✅ **Docker Support** — Containerized services

---

## 🔮 Roadmap

### Planned Features
- [ ] **Multi-world support** — Switch between saved worlds
- [ ] **Structure templates** — Pre-built structures library
- [ ] **World export** — Download world as zip
- [ ] **Build progress** — Real-time building status
- [ ] **Live preview** — 3D preview before building

### Infrastructure Roadmap
- [ ] **Multi-region support** — Deploy closer to players
- [ ] **Auto-scaling** — Scale based on player count
- [ ] **Backup/restore** — Automated world backups
- [ ] **Custom domains** — Use your own domain

---

## 📄 License

MIT License — build whatever you want.

---

<p align="center">
  <strong>Built with ☕ and ⛏️</strong>
  <br><br>
  <a href="#-world-forge">Back to top ↑</a>
</p>
