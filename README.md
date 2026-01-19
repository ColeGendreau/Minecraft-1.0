# ⛏️ World Forge

**Create ANY Minecraft world you can imagine using natural language.**

Floating sky islands? Neon cyberpunk city? Viking fortress with fjords? Just describe it — AI interprets your vision and builds it in a live Minecraft server.

![World Forge Dashboard](https://img.shields.io/badge/Status-Live-brightgreen) ![Azure](https://img.shields.io/badge/Cloud-Azure-0078D4) ![Kubernetes](https://img.shields.io/badge/Platform-Kubernetes-326CE5) ![TypeScript](https://img.shields.io/badge/Code-TypeScript-3178C6)

---

## 📑 Table of Contents

- [What is World Forge?](#-what-is-world-forge)
- [Try It](#-try-it)
- [Example Worlds](#-example-worlds)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Self-Hosting Guide](#-self-hosting-guide)
- [Accessing Services](#-accessing-services)
- [Monitoring & Observability](#-monitoring--observability)
- [Configuration](#-configuration)
- [Cost](#-cost)
- [Features](#-features)
- [Roadmap](#-roadmap)

---

## ✨ What is World Forge?

World Forge is an AI-powered Minecraft world creation platform. You describe any world in plain English, and the system:

1. **Interprets** your description using AI (Claude)
2. **Generates** a structured world configuration (biomes, structures, game rules)
3. **Deploys** it to a live Minecraft Java server
4. **Builds** custom structures using WorldEdit commands via RCON

No Minecraft knowledge required. No complex configuration. Just imagination.

### How It Works

```
You: "I want a floating sky island kingdom with waterfalls and rope bridges"
        ↓
   AI Planner interprets your vision
        ↓
   Generates: void world + custom structures + adventure mode
        ↓
   WorldEdit builds islands, bridges, water features
        ↓
   You connect and explore your creation
```

---

## 🎮 Try It

### Dashboard
Access the web dashboard to describe worlds and control infrastructure:
```
https://mc-demo-dev-dashboard.<PUBLIC_IP>.nip.io
```

### Minecraft Server
Connect with Minecraft Java Edition:
```
Server Address: <PUBLIC_IP>:25565
```

### How to Connect
1. Open **Minecraft Java Edition**
2. Click **Multiplayer**
3. Click **Add Server**
4. Paste the server address
5. Join and explore!

---

## 🌍 Example Worlds

Just describe what you want — the AI figures out the rest:

| Your Description | What Gets Built |
|-----------------|-----------------|
| *"Floating sky islands connected by rope bridges with waterfalls"* | Superflat void world with custom island structures, water features |
| *"Ancient Egyptian pyramid complex with hidden tombs"* | Desert biome, pyramid monuments, underground chambers, treasure |
| *"Neon cyberpunk cityscape with towering skyscrapers"* | Flat urban terrain, beacon-lit towers, dark atmosphere |
| *"Enchanted mushroom forest with giant glowing fungi"* | Dark oak/mushroom hybrid biome, custom oversized fungi |
| *"Viking village with longhouses and fjord coastlines"* | Snowy taiga, custom Nordic buildings, coastal terrain |
| *"Haunted gothic castle with graveyards"* | Dark forest, castle structure, crypts, cobwebs, bats |
| *"Japanese cherry blossom temple gardens"* | Cherry grove biome, torii gates, koi ponds, pagodas |
| *"Volcanic realm with lava rivers"* | Basalt deltas, lava lakes, obsidian fortresses |

The AI maps your creative vision to Minecraft's building blocks, biomes, and game mechanics.

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Dashboard     │────▶│  Coordinator    │────▶│   Minecraft     │
│   (Next.js)     │     │  API (Hono)     │     │   Server        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐            │
        │               │   AI Planner    │            │
        │               │   (Claude API)  │            │
        │               └─────────────────┘            │
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐            │
        └──────────────▶│   WorldEdit     │◀───────────┘
                        │   (via RCON)    │
                        └─────────────────┘
```

### Request Flow

1. **User** describes world in the dashboard
2. **Dashboard** sends request to Coordinator API
3. **Coordinator** calls Claude AI with the description
4. **AI Planner** returns structured world spec (JSON)
5. **Coordinator** validates spec against schema
6. **Coordinator** configures Minecraft via RCON commands
7. **WorldEdit** executes structure building commands
8. **User** connects to Minecraft and explores

### Infrastructure Flow

```
Git Push → GitHub Actions → Terraform/Helm → Azure AKS → Live Services
```

- **Terraform workflow** provisions/destroys Azure infrastructure
- **Deploy workflow** deploys applications via Helm
- **OIDC authentication** — no stored credentials

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, Tailwind CSS, TypeScript | Dashboard UI |
| **API** | Node.js, Hono, TypeScript | Backend coordination |
| **AI** | Claude API (Anthropic) | Natural language interpretation |
| **Game Server** | Paper MC 1.21+ | Minecraft server |
| **Plugins** | WorldEdit 7.4 | Structure building |
| **Infrastructure** | Azure Kubernetes Service (AKS) | Container orchestration |
| **IaC** | Terraform | Infrastructure as Code |
| **CI/CD** | GitHub Actions | Automated deployments |
| **Auth** | OIDC (OpenID Connect) | Passwordless Azure auth |
| **Monitoring** | Prometheus | Metrics collection |
| **Visualization** | Grafana | Dashboards & alerts |
| **Ingress** | NGINX Ingress Controller | Traffic routing |
| **TLS** | cert-manager + Let's Encrypt | Automated HTTPS |
| **DNS** | nip.io | Wildcard DNS for IPs |

---

## 📁 Project Structure

```
world-forge/
├── .github/workflows/      # CI/CD pipelines
│   ├── terraform.yaml     # Infrastructure provisioning
│   └── deploy.yaml        # Application deployment
│
├── dashboard/              # Next.js frontend
│   ├── app/               # App router pages
│   │   ├── page.tsx       # Home page
│   │   ├── create/        # World creation page
│   │   └── worlds/        # World list & details
│   ├── components/        # React components
│   │   ├── Header.tsx
│   │   ├── InfrastructurePanel.tsx
│   │   └── ...
│   └── lib/               # API client & types
│
├── coordinator-api/        # Backend API server
│   ├── src/
│   │   ├── index.ts       # Entry point
│   │   ├── routes/        # API endpoints
│   │   │   ├── health.ts
│   │   │   ├── worlds.ts
│   │   │   ├── minecraft.ts
│   │   │   └── infrastructure.ts
│   │   ├── services/      # Business logic
│   │   │   ├── ai-planner.ts      # Claude integration
│   │   │   ├── rcon-client.ts     # Minecraft RCON
│   │   │   └── structure-generator.ts
│   │   └── types/         # TypeScript definitions
│   └── Dockerfile
│
├── infra/                  # Terraform configuration
│   ├── main.tf            # Resource group
│   ├── aks.tf             # Kubernetes cluster
│   ├── acr.tf             # Container registry
│   ├── publicip.tf        # Static IP
│   ├── log_analytics.tf   # Monitoring
│   └── variables.tf       # Configuration
│
├── apps/                   # Helm value files
│   ├── minecraft/         # MC server config
│   │   └── values.yaml
│   ├── monitoring/        # Prometheus/Grafana
│   │   └── values.yaml
│   └── cert-manager/      # TLS certificates
│
├── environments/           # Environment configs
│   ├── ingress-values.yaml
│   └── cert-manager-values.yaml
│
├── schemas/                # JSON schemas
│   └── worldspec.schema.json
│
├── bootstrap/              # Terraform state backend
│
└── INFRASTRUCTURE_STATE    # ON/OFF toggle file
```

---

## 🚀 Self-Hosting Guide

### Prerequisites

- **Azure subscription** with Contributor access
- **GitHub repository** (fork this repo)
- **Anthropic API key** for Claude AI
- **Azure CLI** installed locally
- **Terraform** installed locally

### Step 1: Bootstrap Terraform State

Create the Azure Storage backend for Terraform state:

```bash
cd bootstrap
terraform init
terraform apply
```

This creates a storage account to store Terraform state remotely.

### Step 2: Create Azure Service Principal

```bash
# Create service principal for GitHub Actions
az ad sp create-for-rbac \
  --name "world-forge-github" \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID> \
  --sdk-auth
```

### Step 3: Configure GitHub OIDC

1. Go to **Azure Portal** → **App Registrations** → your app
2. Add **Federated Credential** for GitHub Actions
3. Set subject to: `repo:<owner>/<repo>:ref:refs/heads/main`

### Step 4: Set GitHub Secrets

Add these secrets to your GitHub repository:

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | App registration client ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `TF_STATE_ACCESS_KEY` | Storage account access key |
| `ANTHROPIC_API_KEY` | Claude API key |

### Step 5: Deploy Infrastructure

```bash
# Turn on infrastructure
echo "ON" > INFRASTRUCTURE_STATE
git add INFRASTRUCTURE_STATE
git commit -m "deploy infrastructure"
git push
```

**What happens:**
1. GitHub Actions triggers Terraform workflow
2. Terraform provisions AKS, ACR, networking (~8-10 min)
3. Deploy workflow installs Helm charts (~3-5 min)
4. All services come online

**Total time:** ~12-15 minutes

### Step 6: Destroy Infrastructure

```bash
# Turn off infrastructure (stop billing)
echo "OFF" > INFRASTRUCTURE_STATE
git add INFRASTRUCTURE_STATE
git commit -m "destroy infrastructure"
git push
```

---

## 🌐 Accessing Services

Once infrastructure is running, access services at:

### Dashboard (Web UI)
```
https://mc-demo-dev-dashboard.<PUBLIC_IP>.nip.io
```
- Create worlds with natural language
- Deploy/destroy infrastructure
- Monitor server status
- View Azure activity logs

### Minecraft Server
```
<PUBLIC_IP>:25565
```
- Connect with Minecraft Java Edition 1.21+
- No whitelist by default

### Grafana (Monitoring Dashboards)
```
https://grafana.<PUBLIC_IP>.nip.io
```
- **Username:** `admin`
- **Password:** Check `apps/monitoring/values.yaml` or Kubernetes secret

Pre-configured dashboards:
- Kubernetes cluster metrics
- Node resource usage
- Pod health and restarts

### Prometheus (Raw Metrics)
```
http://prometheus.<PUBLIC_IP>.nip.io
```
Access via port-forward if not exposed:
```bash
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
```
Then open: `http://localhost:9090`

### Getting Your Public IP

After deployment, find your IP:

```bash
# From Terraform output
cd infra && terraform output public_ip

# Or from Azure CLI
az network public-ip show \
  --resource-group MC_mc-demo-dev-rg_mc-demo-dev-aks_westus3 \
  --name mc-demo-dev-ingress-ip \
  --query ipAddress -o tsv

# Or from Kubernetes
kubectl get svc -n ingress-nginx
```

---

## 📊 Monitoring & Observability

### Grafana Dashboards

World Forge includes pre-configured Grafana with:

| Dashboard | Description |
|-----------|-------------|
| **Kubernetes / Compute Resources / Cluster** | Overall cluster CPU, memory, network |
| **Kubernetes / Compute Resources / Node** | Per-node resource usage |
| **Kubernetes / Compute Resources / Pod** | Per-pod metrics |
| **Kubernetes / Networking / Cluster** | Network traffic and errors |

### Prometheus Metrics

Key metrics available:

```promql
# Minecraft server CPU
container_cpu_usage_seconds_total{namespace="minecraft"}

# Minecraft memory usage
container_memory_usage_bytes{namespace="minecraft"}

# Pod restart count (detect crashes)
kube_pod_container_status_restarts_total{namespace="minecraft"}

# Node CPU utilization
node_cpu_seconds_total
```

### Azure Log Analytics

Container Insights enabled by default:
- **Azure Portal** → **AKS Cluster** → **Insights**
- Live container logs
- Performance metrics
- Failure analysis

### Alerting (Optional)

Configure Grafana alerts for:
- High CPU/memory usage
- Pod crash loops
- Node unhealthy
- Minecraft server offline

---

## ⚙️ Configuration

### Minecraft Server Settings

Edit `apps/minecraft/values.yaml`:

```yaml
minecraftServer:
  version: "LATEST"        # Minecraft version
  type: "PAPER"            # Server type (PAPER, SPIGOT, VANILLA)
  difficulty: normal       # peaceful, easy, normal, hard
  gameMode: survival       # survival, creative, adventure, spectator
  maxPlayers: 20
  motd: "§6§lWorld Forge §r§7- §b§lAI-Crafted Worlds"
  
  # RCON for WorldEdit commands
  rcon:
    enabled: true
    password: "your-secure-password"
  
  # Plugins
  modrinth:
    projects:
      - worldedit          # Required for structure building
```

### Infrastructure Settings

Edit `infra/terraform.tfvars`:

```hcl
project_name    = "mc-demo"
environment     = "dev"
location        = "westus3"
aks_node_count  = 2
aks_node_size   = "Standard_D2s_v3"
```

### AI Settings

The AI planner uses Claude. Configure in coordinator API:

```typescript
// coordinator-api/src/services/ai-planner.ts
const model = "claude-sonnet-4-20250514";  // AI model
const maxTokens = 4096;                     // Response length
```

---

## 💰 Cost

### Running Infrastructure: ~$3-5/day

| Resource | Cost/Day | Notes |
|----------|----------|-------|
| AKS (2 nodes, D2s_v3) | ~$3.50 | Main cost |
| Container Registry (Basic) | ~$0.16 | Image storage |
| Log Analytics | ~$0.10-0.50 | Depends on log volume |
| Static Public IP | ~$0.10 | Reserved IP |
| Storage (Terraform state) | ~$0.01 | Minimal |

### Monthly Estimate: ~$100-150

### Cost Optimization

- **Destroy when not using** — $0/day when OFF
- **Use spot instances** — ~60% cheaper nodes
- **Reduce node count** — 1 node for testing
- **Disable Log Analytics** — Save ~$15/month

---

## 🎯 Features

### Core Features
- ✅ **Natural Language Input** — Describe worlds in plain English
- ✅ **AI Interpretation** — Claude translates vision to Minecraft primitives
- ✅ **Live Building** — Watch structures appear via WorldEdit
- ✅ **One-Click Deploy/Destroy** — Full infrastructure control from dashboard
- ✅ **Real-Time Status** — See server health, player count, costs

### Infrastructure Features
- ✅ **GitOps Workflow** — All changes tracked in Git
- ✅ **Zero Stored Credentials** — OIDC authentication throughout
- ✅ **Automated TLS** — HTTPS via Let's Encrypt
- ✅ **Full Monitoring** — Prometheus + Grafana included
- ✅ **Azure Activity Logs** — Track all infrastructure changes

### Developer Features
- ✅ **TypeScript Throughout** — Frontend, backend, types
- ✅ **Schema Validation** — JSON schema for world specs
- ✅ **Modular Architecture** — Easy to extend
- ✅ **Docker Support** — Containerized services

---

## 🔮 Roadmap

### Planned Features
- [ ] **Multi-world support** — Switch between saved worlds
- [ ] **Structure templates** — Pre-built structures library
- [ ] **Collaborative building** — Multiple users contribute
- [ ] **World export** — Download world as zip
- [ ] **More AI providers** — OpenAI, local models (Ollama)
- [ ] **Schematic import** — Upload .schematic files
- [ ] **Live preview** — 3D preview before building
- [ ] **Build progress** — Real-time building status

### Infrastructure Roadmap
- [ ] **Multi-region support** — Deploy closer to players
- [ ] **Auto-scaling** — Scale based on player count
- [ ] **Backup/restore** — Automated world backups
- [ ] **Custom domains** — Use your own domain

---

## 🤝 Contributing

Contributions welcome! Areas to help:

- **AI Prompts** — Improve world interpretation
- **Structure Templates** — Add pre-built structures
- **Dashboard UI** — Enhance user experience
- **Documentation** — Improve guides and examples

---

## 📄 License

MIT License — build whatever you want.

---

<p align="center">
  <strong>Built with ☕ and ⛏️ by Cole Gendreau</strong>
  <br><br>
  <a href="#-world-forge">Back to top ↑</a>
</p>
