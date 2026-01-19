# ⛏️ World Forge

**Create ANY Minecraft world you can imagine using natural language.**

Floating sky islands? Neon cyberpunk city? Viking fortress with fjords? Just describe it — AI interprets your vision and builds it in a live Minecraft server.

![World Forge Dashboard](https://img.shields.io/badge/Status-Live-brightgreen) ![Azure](https://img.shields.io/badge/Cloud-Azure-0078D4) ![Kubernetes](https://img.shields.io/badge/Platform-Kubernetes-326CE5)

---

## ✨ What is World Forge?

World Forge is an AI-powered Minecraft world creation platform. You describe any world in plain English, and the system:

1. **Interprets** your description using AI
2. **Generates** a structured world configuration
3. **Deploys** it to a live Minecraft Java server
4. **Builds** custom structures using WorldEdit commands

No Minecraft knowledge required. No complex configuration. Just imagination.

---

## 🎮 Try It

**Dashboard:** Describe your world and watch it come to life  
**Minecraft Server:** Connect with Java Edition and explore your creation

```
Server Address: <your-ip>:25565
```

---

## 🌍 Example Worlds

Just describe what you want:

| Your Description | What Gets Built |
|-----------------|-----------------|
| *"Floating sky islands connected by rope bridges with waterfalls"* | Superflat void world with custom island structures |
| *"Ancient Egyptian pyramid complex with hidden tombs"* | Desert biome with pyramid monuments and underground chambers |
| *"Neon cyberpunk cityscape with towering skyscrapers"* | Custom urban terrain with beacon-lit towers |
| *"Enchanted mushroom forest with giant glowing fungi"* | Dark oak/mushroom hybrid biome with custom fungi structures |
| *"Viking village with longhouses and fjord coastlines"* | Snowy taiga with custom Nordic buildings |

The AI maps your creative vision to Minecraft's building blocks and biomes.

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Dashboard     │────▶│  Coordinator    │────▶│   Minecraft     │
│   (Next.js)     │     │  API (Node.js)  │     │   Server        │
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
                        │   (RCON)        │
                        └─────────────────┘
```

**Flow:**
1. User describes world in dashboard
2. Coordinator sends description to AI planner
3. AI generates world spec (biomes, structures, rules)
4. Coordinator configures Minecraft server
5. WorldEdit executes build commands via RCON
6. User connects and explores

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, Tailwind CSS, TypeScript |
| **API** | Node.js, Hono, TypeScript |
| **AI** | Claude API (Anthropic) |
| **Game Server** | Paper MC with WorldEdit plugin |
| **Infrastructure** | Azure Kubernetes Service (AKS) |
| **IaC** | Terraform |
| **CI/CD** | GitHub Actions with OIDC |
| **Monitoring** | Prometheus + Grafana |
| **Ingress** | NGINX with Let's Encrypt TLS |

---

## 📁 Project Structure

```
world-forge/
├── dashboard/              # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/               # API client & types
│
├── coordinator-api/        # Backend API
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # AI planner, RCON client
│   │   └── types/         # TypeScript definitions
│   └── Dockerfile
│
├── infra/                  # Terraform infrastructure
│   ├── aks.tf             # Kubernetes cluster
│   ├── acr.tf             # Container registry
│   └── ...
│
├── apps/                   # Helm configurations
│   ├── minecraft/         # MC server values
│   └── monitoring/        # Prometheus/Grafana
│
├── schemas/                # World spec JSON schema
│
└── .github/workflows/      # CI/CD pipelines
    ├── terraform.yaml     # Infrastructure
    └── deploy.yaml        # Applications
```

---

## 🚀 Self-Hosting

### Prerequisites

- Azure subscription
- GitHub repository  
- Anthropic API key (for Claude)

### Quick Start

**1. Bootstrap Terraform state:**
```bash
cd bootstrap && terraform init && terraform apply
```

**2. Set GitHub secrets:**
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `TF_STATE_ACCESS_KEY`
- `ANTHROPIC_API_KEY`

**3. Deploy infrastructure:**
```bash
echo "ON" > INFRASTRUCTURE_STATE
git add . && git commit -m "deploy" && git push
```

Infrastructure deploys in ~12 minutes. Dashboard and Minecraft server come online automatically.

**4. Destroy when done:**
```bash
echo "OFF" > INFRASTRUCTURE_STATE
git add . && git commit -m "destroy" && git push
```

---

## 💰 Cost

Running infrastructure: **~$3-5/day**

| Resource | Cost/Day |
|----------|----------|
| AKS (2 nodes) | ~$3.50 |
| Container Registry | ~$0.16 |
| Log Analytics | ~$0.10-0.50 |
| Static IP | ~$0.10 |

**$0/day when destroyed** — spin up only when needed.

---

## 🎯 Features

- **Natural Language Input** — Describe worlds in plain English
- **AI Interpretation** — Claude translates vision to Minecraft primitives  
- **Live Building** — Watch structures appear via WorldEdit
- **One-Click Deploy/Destroy** — Full infrastructure control from dashboard
- **Real-Time Monitoring** — Grafana dashboards for server metrics
- **GitOps Workflow** — All changes tracked in version control
- **Zero Stored Credentials** — OIDC authentication throughout

---

## 🔮 Roadmap

- [ ] Multi-world support (switch between saved worlds)
- [ ] Structure templates library
- [ ] Collaborative building (multiple users)
- [ ] World export/download
- [ ] More AI providers (OpenAI, local models)

---

## 📄 License

MIT License — build whatever you want.

---

<p align="center">
  <strong>Built with ☕ and ⛏️ by Cole Gendreau</strong>
</p>
