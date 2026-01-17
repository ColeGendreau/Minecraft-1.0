# Coordinator API

Backend service for the AI-powered Minecraft world creation system. Handles world creation requests, orchestrates AI planning, and manages GitHub integration.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start development server (with mock AI)
npm run dev
```

The API will start on `http://localhost:3001`.

## Configuration

Create a `.env` file with the following variables:

```env
PORT=3001

# AI Provider (choose one)
OPENAI_API_KEY=sk-your-key       # Option 1: OpenAI
# AZURE_OPENAI_ENDPOINT=...       # Option 2: Azure OpenAI
# AZURE_OPENAI_KEY=...
# AZURE_OPENAI_DEPLOYMENT=...

# GitHub Integration
GITHUB_TOKEN=ghp_your_token
GITHUB_OWNER=ColeGendreau
GITHUB_REPO=Minecraft-1.0

# Database
DATABASE_PATH=./data/coordinator.db

# Development
MOCK_AI=true  # Use mock AI planner (no API costs)
```

## API Endpoints

### Health Check

```bash
curl http://localhost:3001/health
```

### Get Current World

```bash
curl http://localhost:3001/api/worlds/current
```

### Create World Request

```bash
curl -X POST http://localhost:3001/api/worlds \
  -H "Content-Type: application/json" \
  -d '{
    "description": "A survival world with mountains and caves, hard difficulty",
    "difficulty": "hard",
    "gameMode": "survival",
    "size": "medium"
  }'
```

### List All Requests

```bash
curl "http://localhost:3001/api/worlds?status=pending&limit=10"
```

### Get Request Details

```bash
curl http://localhost:3001/api/worlds/req_abc12345
```

### Retry Failed Request

```bash
curl -X POST http://localhost:3001/api/worlds/req_abc12345/retry
```

## Development

### Mock Mode

Set `MOCK_AI=true` to use a mock AI planner that generates WorldSpecs based on keyword detection in the description. This avoids API costs during development.

### Database

The API uses SQLite for persistence. The database file is created automatically at `./data/coordinator.db`.

To reset the database, delete the file and restart the server.

### Authentication

In development mode, the API accepts all requests with a default test user. For production, set up GitHub OAuth and provide a valid Bearer token.

You can also test with a specific user using the `X-Mock-User` header:

```bash
curl -H "X-Mock-User: 123456:ColeGendreau" http://localhost:3001/api/worlds
```

## Project Structure

```
coordinator-api/
├── src/
│   ├── index.ts           # Express app entry point
│   ├── routes/
│   │   ├── health.ts      # Health check endpoint
│   │   └── worlds.ts      # World CRUD endpoints
│   ├── services/
│   │   ├── ai-planner.ts  # AI/mock world planning
│   │   └── validator.ts   # JSON schema validation
│   ├── db/
│   │   ├── schema.ts      # SQLite initialization
│   │   └── client.ts      # Database operations
│   ├── middleware/
│   │   ├── auth.ts        # GitHub OAuth validation
│   │   ├── ratelimit.ts   # Rate limiting
│   │   └── validation.ts  # Request validation
│   └── types/
│       └── index.ts       # TypeScript types
├── data/
│   └── coordinator.db     # SQLite database (gitignored)
├── package.json
└── tsconfig.json
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run typecheck` - Run TypeScript type checking

