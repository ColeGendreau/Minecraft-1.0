# World Forge Dashboard

AI-powered Minecraft world creation dashboard with infrastructure control.

## Features

- **Unlimited Creativity**: Describe ANY world idea in natural language
  - "Pink banana themed world"
  - "Ferrari racing paradise"  
  - "Giant Michael Jordan statues"
  - No restrictions on input

- **Infrastructure Control**: Full ON/OFF control of Azure infrastructure
  - One-click deploy/destroy
  - Real-time service status indicators
  - Cost tracking ($0 when off, ~$3-5/day when running)

- **Service Monitoring**: Visual status for all services
  - Azure Resource Group
  - AKS Kubernetes Cluster
  - Container Registry
  - NGINX Ingress
  - Cert Manager
  - Minecraft Server
  - Prometheus
  - Grafana
  - Log Analytics

## Quick Start

```bash
# Start the dashboard (port 3000)
npm run dev

# Requires coordinator-api running on port 3001
cd ../coordinator-api && npm run dev
```

## Pages

- `/` - Home: Infrastructure control + current world
- `/create` - Create any world you can imagine
- `/worlds` - History of all world requests
- `/worlds/[id]` - Request details and AI interpretation

## Design Philosophy

**"Unlimited creativity at the input layer. Strict constraints at the execution layer."**

1. **INPUT**: Accept any natural language description
2. **AI PLANNER**: Interprets intent, theme, motifs → WorldSpec JSON
3. **BUILDER**: Maps to Minecraft primitives (biomes, structures, rules)
4. **DEPLOY**: Git commit → GitHub Actions → Helm → AKS

The AI never rejects input. It approximates creative ideas using available primitives.

## Configuration

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Custom dark theme with Minecraft-inspired colors
