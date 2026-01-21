# World Forge Dashboard

AI-powered Minecraft world creation dashboard with infrastructure control.

## ☁️ Cloud-Only Architecture

This dashboard runs **entirely in Azure** as a Container App. There is no local development mode.

**Deployment**: Automatic via GitHub Actions when code changes are pushed to `main`.

## Features

- **Pixel Art Builder**: Create pixel art in Minecraft from images
  - Paste any image URL
  - Search for images on the web
  - Watch it build live via RCON

- **Infrastructure Control**: Full ON/OFF control of Azure infrastructure
  - One-click deploy/destroy via GitHub Actions
  - Real-time workflow progress modal
  - Cost tracking ($0 when off, ~$3-5/day when running)

- **Service Monitoring**: Visual status for all services
  - AKS Kubernetes Cluster
  - Container Registry
  - NGINX Ingress
  - Cert Manager
  - Minecraft Server
  - Prometheus
  - Grafana

## Pages

- `/` - Home: Pixel art gallery + server status
- `/admin` - Admin: Infrastructure control + monitoring
- `/assets/create` - Create pixel art from images

## How Deployment Works

1. Push code to `main` branch
2. GitHub Actions detects dashboard/ or coordinator-api/ changes
3. Builds container image in Azure Container Registry
4. Deploys to Azure Container Apps
5. Environment variables (API URL, etc.) set automatically

## Configuration

Environment variables are set **automatically by GitHub Actions** during deployment:

| Variable | Description | Set By |
|----------|-------------|--------|
| `NEXT_PUBLIC_API_URL` | Coordinator API URL | CI/CD |
| `DASHBOARD_PASSWORD` | Optional password protection | Azure Secret |
| `API_KEY` | Coordinator auth key | Azure Secret |

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Custom Minecraft-inspired theme (day/night mode)
