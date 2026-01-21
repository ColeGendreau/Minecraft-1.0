# Coordinator API

Backend service for the World Forge Minecraft project. Handles pixel art creation via RCON, infrastructure control via GitHub, and monitoring.

## ☁️ Cloud-Only Architecture

This API runs **entirely in Azure** as a Container App. There is no local development mode.

**Deployment**: Automatic via GitHub Actions when code changes are pushed to `main`.

## Features

- **Pixel Art Building**: Convert images to Minecraft blocks via RCON
- **Infrastructure Control**: Toggle Azure infra ON/OFF via INFRASTRUCTURE_STATE file
- **GitHub Integration**: Commit state changes that trigger Terraform workflows
- **Kubernetes Monitoring**: Query AKS cluster for pod/node status
- **Cost Tracking**: Query Azure Cost Management API

## API Endpoints

All endpoints (except health) require API key authentication.

### Health Check
```
GET /health
```

### Assets (Pixel Art)
```
GET  /api/assets              # List all assets
POST /api/assets              # Create from image URL or search
DELETE /api/assets/:id        # Delete asset
POST /api/assets/nuke         # Remove all assets
```

### Infrastructure
```
GET  /api/infrastructure/status     # Current state (ON/OFF/deploying/destroying)
POST /api/infrastructure/toggle     # Deploy or destroy infra
GET  /api/infrastructure/cost       # Azure cost data
GET  /api/infrastructure/monitoring # Kubernetes metrics
```

### Workflows
```
GET /api/workflows/latest           # Latest GitHub Actions run
GET /api/workflows/runs/:runId      # Run details with jobs/steps
```

## Configuration

Environment variables are set **automatically by GitHub Actions** during deployment:

| Variable | Description | Source |
|----------|-------------|--------|
| `PORT` | Server port | Default: 3001 |
| `GITHUB_TOKEN` | GitHub API access | Azure Secret |
| `GITHUB_OWNER` | Repository owner | CI/CD |
| `GITHUB_REPO` | Repository name | CI/CD |
| `MINECRAFT_RCON_HOST` | RCON server IP | CI/CD (from AKS) |
| `MINECRAFT_RCON_PORT` | RCON port | Default: 25575 |
| `MINECRAFT_RCON_PASSWORD` | RCON password | CI/CD |
| `PUBLIC_IP` | Minecraft server IP | CI/CD (from AKS) |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI URL | CI/CD |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key | Azure Secret |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription for cost queries | CI/CD |
| `AZURE_CLIENT_ID` | Managed Identity | CI/CD |
| `AKS_RESOURCE_GROUP` | AKS resource group | CI/CD |
| `AKS_CLUSTER_NAME` | AKS cluster name | CI/CD |

## How It Works

1. **Dashboard** calls coordinator API endpoints
2. **Infrastructure toggle** commits INFRASTRUCTURE_STATE change to GitHub
3. **GitHub Actions** runs Terraform to create/destroy Azure resources
4. **Pixel art** commands sent via RCON to Minecraft server running in AKS
5. **Monitoring** queries Kubernetes API and Prometheus (when infra is ON)

## Project Structure

```
coordinator-api/
├── src/
│   ├── index.ts           # Express app entry point
│   ├── routes/
│   │   ├── health.ts      # Health check
│   │   ├── assets.ts      # Pixel art management
│   │   ├── infrastructure.ts  # Infra control
│   │   ├── workflows.ts   # GitHub Actions status
│   │   └── minecraft.ts   # Direct RCON commands
│   ├── services/
│   │   ├── image-to-voxel.ts   # Image → Minecraft blocks
│   │   ├── rcon-client.ts      # RCON connection
│   │   ├── kubernetes.ts       # kubectl queries
│   │   ├── prometheus.ts       # Metrics queries
│   │   └── azure-costs.ts      # Cost Management API
│   ├── db/
│   │   ├── schema.ts      # SQLite initialization
│   │   └── client.ts      # Database operations
│   └── middleware/
│       ├── auth.ts        # API key validation
│       └── ratelimit.ts   # Rate limiting
├── Dockerfile
├── package.json
└── tsconfig.json
```
