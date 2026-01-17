# Security Guide 🔒

This document covers security considerations for the Minecraft World Forge system.

## Quick Setup

### 1. Dashboard Password Protection

**Option A: Azure Easy Auth (Recommended)**

```bash
# Enable Microsoft authentication on your Container App
az containerapp auth update \
  --name mc-demo-dev-dashboard \
  --resource-group mc-demo-dev-dashboard-rg \
  --unauthenticated-client-action RedirectToLoginPage \
  --enabled true
```

Or via Azure Portal:
1. Go to Container App → **Authentication**
2. Click **Add identity provider** → **Microsoft**
3. Done! Uses your Azure AD login.

**Option B: Simple Password (Built-in)**

Set the `DASHBOARD_PASSWORD` environment variable:

```bash
# In Azure Container Apps
az containerapp update \
  --name mc-demo-dev-dashboard \
  --resource-group mc-demo-dev-dashboard-rg \
  --set-env-vars "DASHBOARD_PASSWORD=your-secret-password"
```

Users will be prompted for a password via HTTP Basic Auth.

### 2. Coordinator API Key

Generate a secure API key:
```bash
openssl rand -base64 32
```

Set it on both services:

```bash
# On Coordinator API
az containerapp update \
  --name mc-demo-dev-coordinator \
  --resource-group mc-demo-dev-dashboard-rg \
  --set-env-vars "API_KEY=your-generated-key"

# On Dashboard (so it can talk to coordinator)
az containerapp update \
  --name mc-demo-dev-dashboard \
  --resource-group mc-demo-dev-dashboard-rg \
  --set-env-vars "API_KEY=your-generated-key"
```

---

## Security Checklist

### ✅ Dashboard
- [ ] Password protection enabled (Azure Easy Auth or DASHBOARD_PASSWORD)
- [ ] HTTPS enforced (automatic with Azure Container Apps)
- [ ] No sensitive data in client-side code

### ✅ Coordinator API  
- [ ] API_KEY environment variable set
- [ ] Running in production mode (NODE_ENV=production)
- [ ] GitHub token has minimal required scopes

### ✅ GitHub Integration
- [ ] Using OIDC for Actions (no long-lived secrets)
- [ ] Personal Access Token has limited scopes:
  - `repo` - for reading/writing files
  - `workflow` - for triggering Actions
- [ ] Token stored as GitHub Secret, not in code

### ✅ Azure Resources
- [ ] RBAC configured (least privilege)
- [ ] Terraform state in secured storage
- [ ] No public endpoints on internal services

### ✅ Minecraft Server
- [ ] Whitelist enabled (ops only)
- [ ] RCON password set (if using)
- [ ] Not exposed to public internet unnecessarily

---

## Environment Variables Reference

### Dashboard (`mc-demo-dev-dashboard`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Coordinator API URL |
| `DASHBOARD_PASSWORD` | No | HTTP Basic Auth password |
| `API_KEY` | Recommended | API key for coordinator auth |

### Coordinator API (`mc-demo-dev-coordinator`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | Yes | Set to `production` |
| `API_KEY` | **Yes** | Secret key for API auth |
| `GITHUB_TOKEN` | Yes | PAT for GitHub API |
| `GITHUB_OWNER` | Yes | GitHub username/org |
| `GITHUB_REPO` | Yes | Repository name |

---

## GitHub Personal Access Token Scopes

Create a **Fine-grained token** at https://github.com/settings/tokens?type=beta

Required permissions:
- **Contents**: Read and write (for committing WorldSpec)
- **Actions**: Read and write (for triggering workflows)
- **Metadata**: Read (required for API access)

Or a **Classic token** with:
- `repo` (full)
- `workflow`

---

## Threat Model

### Who might attack?

1. **Random internet scanners** - Automated bots looking for exposed services
   - Mitigation: Password protection, API keys

2. **Curious visitors** - People who find your dashboard URL
   - Mitigation: Azure AD auth or password

3. **Cost attackers** - Someone trying to rack up your Azure bill
   - Mitigation: API key on coordinator, budget alerts in Azure

### What are they after?

1. **Free compute** - Using your AKS cluster for crypto mining
2. **Data** - Your GitHub token, Azure credentials
3. **Vandalism** - Destroying your Minecraft world
4. **Bill shock** - Spinning up expensive resources

---

## Incident Response

### If you suspect compromise:

1. **Rotate all secrets immediately**:
   ```bash
   # Generate new API key
   openssl rand -base64 32
   
   # Revoke GitHub token at https://github.com/settings/tokens
   # Create new token with same scopes
   
   # Update Azure Container Apps with new values
   ```

2. **Check GitHub Actions history** for unauthorized runs

3. **Review Azure Activity Log** for suspicious operations

4. **Destroy and recreate** infrastructure if needed (it's designed for this!)

---

## Questions?

The security model is simple by design:
- **Dashboard**: Protected by password or Azure AD
- **Coordinator**: Protected by API key
- **Azure**: Protected by OIDC (no stored credentials)
- **GitHub**: Protected by token with limited scope

This provides defense in depth while keeping the system manageable for a personal project.

