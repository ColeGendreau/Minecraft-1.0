# AI-Powered World Creation System - Design Document

## Overview

Extension to the existing Minecraft DevOps pipeline that allows non-technical users to create Minecraft worlds using natural language descriptions.

## Architecture

```
User → Dashboard (Web UI)
         ↓
    Coordinator API (Backend)
         ↓
    AI Planner (LLM → WorldSpec JSON)
         ↓
    Builder (Deterministic artifact generation)
         ↓
    GitHub PR/Commit
         ↓
    Existing deploy.yaml workflow
         ↓
    AKS Helm upgrade → New World Live
```

## Component Responsibilities

### 1. Dashboard (Frontend)
- **Technology**: Next.js 14+ (App Router)
- **Authentication**: GitHub OAuth
- **Pages**:
  - `/` - Home/Current World view
  - `/create` - World creation form
  - `/worlds` - World history
  - `/worlds/[id]` - Individual world/request details
- **No deployment initially**: Run locally via `npm run dev`
- **Future**: Containerize and deploy to AKS with Ingress

### 2. Coordinator API (Backend)
- **Technology**: Node.js + Express (or Hono for modern approach)
- **Responsibilities**:
  - Accept world creation requests
  - Call AI Planner (OpenAI/Azure OpenAI)
  - Validate AI output against schema
  - Invoke Builder
  - Create GitHub PR via GitHub API
  - Track request state
- **State Storage**: SQLite initially (file-based, simple)
- **Deployment**: Local initially, containerize later

### 3. AI Planner
- **Input**: User's natural language description + optional toggles
- **Output**: WorldSpec JSON (validated against schema)
- **LLM**: OpenAI GPT-4 or Azure OpenAI
- **Constraints**:
  - System prompt enforces JSON-only output
  - JSON schema provided to model
  - Output validation before passing to Builder
  - No code generation allowed

### 4. Builder
- **Input**: Validated WorldSpec JSON
- **Output**: File artifacts committed to Git
- **Language**: Node.js or Python (deterministic)
- **Generates**:
  - `worlds/[world-name]/worldspec.json` - Original spec
  - `worlds/[world-name]/values.yaml` - Helm values override
  - `worlds/[world-name]/README.md` - Human-readable summary
  - `worlds/[world-name]/datapacks/` - JSON datapack files (if applicable)
- **Validation**: Schema validation, file safety checks

### 5. Git Integration
- **Library**: Octokit (GitHub API client)
- **Flow**:
  - Create new branch: `world/[world-name]-[timestamp]`
  - Commit generated artifacts
  - Open PR to main with:
    - Clear title: "Add new world: [world-name]"
    - Description: World intent, user who requested, timestamp
  - Existing `deploy.yaml` detects changes to `worlds/**` and deploys
- **Rollback**: Revert PR or checkout previous world

## Directory Structure

```
minecraft/
├── .github/workflows/
│   ├── terraform.yaml          # existing
│   ├── deploy.yaml             # existing - will need updates
│   └── dashboard-build.yaml    # new - optional CI for dashboard
│
├── infra/                      # existing terraform
├── apps/                       # existing
├── environments/               # existing
│
├── dashboard/                  # NEW
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                    # home/current world
│   │   │   ├── create/page.tsx             # creation form
│   │   │   ├── worlds/page.tsx             # world list
│   │   │   └── worlds/[id]/page.tsx        # request details
│   │   ├── components/
│   │   │   ├── WorldCard.tsx
│   │   │   ├── CreateWorldForm.tsx
│   │   │   └── StatusIndicator.tsx
│   │   └── lib/
│   │       └── api.ts                      # API client
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── README.md
│
├── coordinator-api/            # NEW
│   ├── src/
│   │   ├── index.ts                        # Express app entry
│   │   ├── routes/
│   │   │   ├── worlds.ts                   # world CRUD endpoints
│   │   │   └── health.ts                   # health check
│   │   ├── services/
│   │   │   ├── ai-planner.ts               # LLM integration
│   │   │   ├── builder-invoker.ts          # calls builder
│   │   │   └── github-client.ts            # PR creation
│   │   ├── db/
│   │   │   └── schema.ts                   # SQLite schema
│   │   └── middleware/
│   │       ├── auth.ts                     # GitHub OAuth validation
│   │       └── validation.ts               # request validation
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── builder/                    # NEW
│   ├── src/
│   │   ├── index.ts                        # CLI entry point
│   │   ├── generator.ts                    # main generation logic
│   │   ├── templates/
│   │   │   ├── values.yaml.template        # Helm values template
│   │   │   └── README.md.template          # World README template
│   │   ├── validators/
│   │   │   └── worldspec-validator.ts      # JSON schema validation
│   │   └── utils/
│   │       ├── file-writer.ts              # safe file operations
│   │       └── seed-generator.ts           # deterministic seed gen
│   ├── schemas/
│   │   └── worldspec.schema.json           # JSON schema definition
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
└── worlds/                     # NEW - generated by builder
    ├── default/                            # current production world
    │   ├── worldspec.json
    │   ├── values.yaml
    │   └── README.md
    └── [world-name]/                       # future worlds
        ├── worldspec.json
        ├── values.yaml
        ├── datapacks/
        └── README.md
```

## API Endpoints

### Coordinator API

**Base URL**: `http://localhost:3001/api` (local dev)

#### Worlds
- `GET /api/worlds/current` - Get currently deployed world
  - Response: `{ worldName, deployedAt, commitSha, spec }`
  
- `GET /api/worlds` - List all worlds and requests
  - Query: `?status=pending|planned|building|pr_created|deployed|failed`
  - Response: `{ worlds: [...] }`

- `POST /api/worlds` - Create new world request
  - Body: `{ description, difficulty?, gameMode?, size? }`
  - Response: `{ requestId, status: "pending" }`

- `GET /api/worlds/:id` - Get world/request details
  - Response: `{ id, status, worldSpec, prUrl?, error? }`

#### Health
- `GET /health` - API health check

## WorldSpec JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["worldName", "theme", "generation", "rules"],
  "properties": {
    "worldName": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "minLength": 3,
      "maxLength": 32,
      "description": "URL-safe world identifier"
    },
    "displayName": {
      "type": "string",
      "maxLength": 64,
      "description": "Human-readable world name"
    },
    "theme": {
      "type": "string",
      "maxLength": 500,
      "description": "Brief description of world theme"
    },
    "generation": {
      "type": "object",
      "required": ["strategy"],
      "properties": {
        "strategy": {
          "enum": ["new_seed", "fixed_seed", "flat"],
          "description": "World generation approach"
        },
        "seed": {
          "type": "string",
          "description": "Minecraft seed (if fixed_seed)"
        },
        "biomes": {
          "type": "array",
          "items": {
            "enum": [
              "plains", "forest", "mountains", "desert", "taiga",
              "ocean", "jungle", "savanna", "swamp", "ice_spikes"
            ]
          },
          "description": "Preferred biomes (hints only)"
        },
        "structures": {
          "type": "object",
          "properties": {
            "villages": { "type": "boolean" },
            "strongholds": { "type": "boolean" },
            "mineshafts": { "type": "boolean" },
            "temples": { "type": "boolean" }
          }
        }
      }
    },
    "rules": {
      "type": "object",
      "required": ["difficulty", "gameMode"],
      "properties": {
        "difficulty": {
          "enum": ["peaceful", "easy", "normal", "hard"]
        },
        "gameMode": {
          "enum": ["survival", "creative", "adventure"]
        },
        "pvp": {
          "type": "boolean",
          "default": false
        },
        "keepInventory": {
          "type": "boolean",
          "default": false
        },
        "naturalRegeneration": {
          "type": "boolean",
          "default": true
        },
        "doDaylightCycle": {
          "type": "boolean",
          "default": true
        }
      }
    },
    "spawn": {
      "type": "object",
      "properties": {
        "protection": {
          "type": "boolean",
          "default": true
        },
        "radius": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100,
          "default": 16
        }
      }
    },
    "datapacks": {
      "type": "array",
      "items": {
        "enum": [
          "anti_enderman_grief",
          "more_mob_heads",
          "player_head_drops",
          "silence_mobs",
          "wandering_trades"
        ]
      },
      "description": "Pre-approved datapacks to enable"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "requestedBy": { "type": "string" },
        "requestedAt": { "type": "string", "format": "date-time" },
        "userDescription": { "type": "string" }
      }
    }
  }
}
```

## Frontend Pages

### 1. Home/Current World (`/`)

**Layout**:
- Hero section: "Currently Running: [World Name]"
- Stats card:
  - Difficulty
  - Game mode
  - Theme description
  - Deployed: [timestamp]
  - Commit: [SHA link to GitHub]
- CTA: "Create New World" button

### 2. Create World (`/create`)

**Form Fields**:
- **Description** (required): Large textarea
  - Placeholder: "Describe the world you want to create..."
  - Character limit: 1000
  
- **Game Mode** (optional): Radio buttons
  - Survival (default)
  - Creative
  - Adventure
  
- **Difficulty** (optional): Dropdown
  - Peaceful
  - Easy
  - Normal (default)
  - Hard
  
- **World Size** (optional): Radio buttons
  - Small
  - Medium (default)
  - Large
  
- **Submit** button

**Behavior**:
- On submit: POST to API
- Redirect to `/worlds/[id]` to show status
- Show loading indicator during API call

### 3. Worlds List (`/worlds`)

**Display**:
- Table or card grid of all world requests
- Columns: Name, Status, Requested At, Requested By
- Status badge: Pending/Planning/Building/PR Created/Deployed/Failed
- Click row → navigate to detail page

### 4. World Detail (`/worlds/[id]`)

**Sections**:
- Status indicator with progress
- Original description
- Generated WorldSpec (collapsible JSON)
- PR link (if created)
- Error details (if failed)
- Action button: "View in GitHub" or "Retry" (if failed)

## Authentication

**GitHub OAuth Flow**:
1. User clicks "Login with GitHub"
2. Redirect to GitHub OAuth
3. Callback receives code
4. Exchange for token
5. Store session (cookie or JWT)
6. Use token to identify user in API requests

**Required Scopes**:
- `read:user` - Get user profile
- `repo` - Create PRs (coordinator API uses this)

## State Tracking

**SQLite Schema** (coordinator-api):

```sql
CREATE TABLE world_requests (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL, -- pending, planned, building, pr_created, deployed, failed
  user_github_id TEXT NOT NULL,
  user_github_username TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT,
  game_mode TEXT,
  size TEXT,
  worldspec_json TEXT, -- JSON string
  pr_url TEXT,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deployments (
  id TEXT PRIMARY KEY,
  world_name TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  deployed_at DATETIME NOT NULL,
  worldspec_json TEXT,
  is_current BOOLEAN DEFAULT 0
);
```

## Environment Variables

### Dashboard
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
GITHUB_CLIENT_ID=<oauth-app-id>
GITHUB_CLIENT_SECRET=<oauth-app-secret>
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-secret>
```

### Coordinator API
```env
PORT=3001
OPENAI_API_KEY=<openai-key>
# OR
AZURE_OPENAI_ENDPOINT=<endpoint>
AZURE_OPENAI_KEY=<key>
AZURE_OPENAI_DEPLOYMENT=<deployment-name>

GITHUB_TOKEN=<personal-access-token>
GITHUB_OWNER=ColeGendreau
GITHUB_REPO=Minecraft-1.0

DATABASE_PATH=./data/coordinator.db
```

## Workflow Updates

### Update `deploy.yaml`

Add trigger for `worlds/**` changes:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'apps/**'
      - 'environments/**'
      - 'worlds/**'  # NEW
```

Add world deployment logic:

```yaml
- name: Check for world changes
  id: check_worlds
  run: |
    if git diff HEAD~1 HEAD --name-only | grep -q '^worlds/'; then
      echo "worlds_changed=true" >> $GITHUB_OUTPUT
    fi

- name: Deploy new world
  if: steps.check_worlds.outputs.worlds_changed == 'true'
  run: |
    # Determine which world changed
    WORLD=$(git diff HEAD~1 HEAD --name-only | grep '^worlds/' | head -1 | cut -d'/' -f2)
    echo "Deploying world: $WORLD"
    
    # Merge world-specific values with base Minecraft values
    helm upgrade minecraft apps/minecraft \
      --namespace minecraft \
      --values apps/minecraft/values.yaml \
      --values worlds/$WORLD/values.yaml \
      --wait
```

## Next Steps (Phase 2)

1. Implement Dashboard frontend
2. Implement Coordinator API with mock AI planner
3. Test end-to-end flow with stubbed data
4. Iterate on UX

## Open Questions

1. **AI Provider**: OpenAI or Azure OpenAI?
   - Recommendation: Azure OpenAI for integration with existing Azure account
   
2. **Authentication**: Full GitHub OAuth or simple password?
   - Recommendation: GitHub OAuth for production demo
   
3. **PR vs Direct Commit**: Should system auto-merge or require approval?
   - Recommendation: Auto-commit to main for demo, optional PR mode
   
4. **World Persistence**: Keep old worlds or replace?
   - Recommendation: Keep in `worlds/` but only one deployed at a time

5. **Dashboard Deployment**: Deploy to AKS now or later?
   - Recommendation: Local dev first, containerize in Phase 4




