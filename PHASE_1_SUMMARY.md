# Phase 1 Complete: Design & Specification

## What Was Created

### 1. Design Documentation (`DESIGN.md`)
Complete architectural design including:
- Component responsibilities (Dashboard, Coordinator API, AI Planner, Builder)
- Directory structure for new components
- Technology choices (Next.js, Express, SQLite)
- Database schema
- Authentication strategy (GitHub OAuth)
- Deployment considerations
- Open questions for decision-making

### 2. WorldSpec JSON Schema (`schemas/worldspec.schema.json`)
Strict JSON schema defining:
- World identification (name, display name, theme)
- Generation parameters (seed, biomes, structures)
- Game rules (difficulty, game mode, pvp, etc.)
- Spawn configuration
- Datapack selections (pre-approved list)
- Server settings (MOTD, player limits, view distance)
- Metadata (requester, timestamps, AI model)

**Key Constraint**: AI can ONLY output JSON conforming to this schema. No code generation.

### 3. Example WorldSpec (`schemas/worldspec.example.json`)
Reference implementation showing:
- Floating islands survival world
- Amplified terrain with fixed seed
- Normal difficulty, survival mode
- Enabled datapacks and structures
- Complete metadata trail

### 4. API Specification (`API_SPEC.md`)
Complete REST API documentation:
- 7 endpoints covering full CRUD lifecycle
- Authentication requirements
- Request/response formats for all scenarios
- Status lifecycle diagram
- Error handling patterns
- Rate limiting strategy
- Future webhook considerations

## Key Decisions Made

### Architecture
- **Separation of Concerns**: Dashboard (UI) → Coordinator (orchestration) → AI Planner → Builder → GitHub
- **No Direct Deployment**: System creates PRs/commits; existing `deploy.yaml` handles deployment
- **Stateful Tracking**: SQLite database tracks request lifecycle
- **Deterministic After AI**: Builder is pure, testable, non-AI logic

### Technology Stack
- **Frontend**: Next.js 14+ with App Router (TypeScript, React)
- **Backend**: Node.js + Express (TypeScript)
- **Database**: SQLite (simple, file-based, no infrastructure)
- **AI**: OpenAI GPT-4 or Azure OpenAI (decision pending)
- **Auth**: GitHub OAuth for production demo
- **Git Integration**: Octokit (GitHub REST API)

### Constraints Enforced
1. AI produces ONLY JSON (WorldSpec schema)
2. No executable code generation (Java, scripts, shell)
3. All changes go through Git (auditable, rollbackable)
4. Pre-approved datapack list only
5. Builder is deterministic and testable
6. No direct server mutation

### Integration with Existing Pipeline
- **Minimal Changes**: Only `deploy.yaml` needs update to detect `worlds/**` changes
- **Reuses Infrastructure**: AKS, NGINX Ingress, existing Helm charts
- **GitOps Friendly**: Fits existing Git → Actions → Deploy flow
- **No Infrastructure Changes**: No new Terraform needed initially

## Directory Structure Preview

```
minecraft/
├── dashboard/              # Next.js frontend (Phase 2)
│   ├── src/app/
│   └── package.json
├── coordinator-api/        # Express backend (Phase 2)
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── db/
│   └── package.json
├── builder/                # Artifact generator (Phase 3)
│   ├── src/
│   ├── templates/
│   └── schemas/
├── schemas/                # ✅ Created
│   ├── worldspec.schema.json
│   └── worldspec.example.json
├── worlds/                 # Generated worlds (Phase 3)
│   └── default/
└── DESIGN.md              # ✅ Created
    API_SPEC.md            # ✅ Created
    PHASE_1_SUMMARY.md     # ✅ Created (this file)
```

## What's NOT Decided Yet (Open Questions)

1. **AI Provider**: OpenAI vs Azure OpenAI?
   - Leaning toward Azure OpenAI for existing Azure integration
   - Need to set up Azure OpenAI resource or use OpenAI API key

2. **Auto-Commit vs PR**: Should system auto-merge or require approval?
   - Recommendation: Auto-commit to main for demo (faster)
   - Optional: Add approval mode later

3. **World Replacement Strategy**: Keep old worlds or replace?
   - Recommendation: Keep all worlds in `worlds/` directory
   - Only one deployed at a time (tracked in DB)
   - Easy rollback by redeploying different world

4. **Dashboard Deployment**: Deploy to AKS now or later?
   - Phase 2: Local dev only (`npm run dev`)
   - Phase 4: Containerize and add to AKS with Ingress

5. **Datapack Support**: Build custom datapacks or use pre-existing?
   - Phase 2-3: Reference pre-approved datapacks only
   - Future: Generate simple JSON datapacks for loot tables, recipes

## Success Criteria for Phase 1

- [x] Architectural design documented
- [x] Component responsibilities defined
- [x] WorldSpec JSON schema created and validated
- [x] API endpoints specified with examples
- [x] Directory structure proposed
- [x] Integration strategy with existing pipeline
- [x] Authentication approach defined
- [x] Database schema designed
- [x] Example WorldSpec created

## Next Steps: Phase 2

**Goal**: Implement working dashboard and API with mock AI

1. **Initialize Projects**:
   - Create `dashboard/` Next.js app
   - Create `coordinator-api/` Express app
   - Set up TypeScript, linting, dependencies

2. **Implement Dashboard**:
   - Home page: Current world view
   - Create page: World request form
   - Worlds page: Request list
   - Detail page: Request status and WorldSpec
   - GitHub OAuth integration

3. **Implement Coordinator API**:
   - Set up Express server
   - Implement all 7 endpoints from API spec
   - Set up SQLite database
   - Mock AI planner (return example WorldSpec)
   - Request validation
   - Auth middleware

4. **Test End-to-End Flow** (with mock):
   - User submits description via dashboard
   - API creates request, returns mock WorldSpec
   - Status updates properly
   - Dashboard shows WorldSpec

5. **Documentation**:
   - README for each component
   - Environment variable setup guides
   - Development setup instructions

**Estimated Time**: 4-6 hours (dashboard 2-3 hrs, API 2-3 hrs)

## Ready to Proceed?

Phase 1 design is complete. Review the following files:
- `DESIGN.md` - Full architectural design
- `API_SPEC.md` - Complete API documentation
- `schemas/worldspec.schema.json` - AI output schema
- `schemas/worldspec.example.json` - Example world

**Questions to answer before Phase 2**:
1. OpenAI API key or Azure OpenAI? (can use mock for now)
2. Any changes to the design?
3. Ready to start building?

