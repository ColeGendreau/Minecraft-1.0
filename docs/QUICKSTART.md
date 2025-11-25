# Quick Start Guide

Get the Minecraft DevOps project running in under 10 minutes.

## Prerequisites

- Azure subscription
- Azure CLI installed and logged in (`az login`)
- GitHub account with this repository

## Step 1: Configure Azure OIDC (5 minutes)

Run these commands in your terminal:

```bash
# Set your values
export REPO_OWNER="your-github-username"
export REPO_NAME="Minecraft-1.0"
export APP_NAME="github-minecraft-oidc"

# Create app registration
APP_ID=$(az ad app create --display-name $APP_NAME --query appId -o tsv)
az ad sp create --id $APP_ID

# Configure federated credential for main branch
az ad app federated-credential create --id $APP_ID --parameters '{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'$REPO_OWNER'/'$REPO_NAME':ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Grant permissions
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID

# Display values for GitHub
TENANT_ID=$(az account show --query tenantId -o tsv)
echo ""
echo "=== Add these to GitHub Secrets ==="
echo "AZURE_CLIENT_ID: $APP_ID"
echo "AZURE_TENANT_ID: $TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
```

## Step 2: Add GitHub Secrets (2 minutes)

1. Go to your GitHub repository
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Add three secrets with the values from above:
   - `AZURE_CLIENT_ID`
   - `AZURE_TENANT_ID`
   - `AZURE_SUBSCRIPTION_ID`

## Step 3: Deploy Infrastructure (3 minutes)

Push any change to `infra/` to trigger the workflow:

```bash
cd infra/
terraform fmt
git add .
git commit -m "Initial infrastructure commit"
git push origin main
```

Watch the deployment in **Actions** tab. Takes about 10-15 minutes.

## Step 4: Access Your Cluster

After workflow completes:

```bash
# Get cluster credentials
az aks get-credentials \
  --resource-group mc-demo-dev-rg \
  --name mc-demo-dev-aks

# Verify access
kubectl get nodes
```

## What's Next?

Continue with Helm deployments (Step 3) to add:
- NGINX Ingress Controller
- cert-manager for HTTPS
- Prometheus and Grafana for monitoring
- Minecraft server

See main [README.md](../README.md) for full documentation.

## Troubleshooting

**Workflow fails with auth error:**
- Verify all three secrets are set in GitHub
- Check federated credential subject matches: `repo:OWNER/REPO:ref:refs/heads/main`

**Terraform apply fails:**
- Check service principal has Contributor role
- Verify subscription has available quota for resources

**Can't access cluster:**
- Ensure `az login` is authenticated to same subscription
- Resource group name: `mc-demo-dev-rg`
- Cluster name: `mc-demo-dev-aks`

For detailed troubleshooting, see [SETUP.md](SETUP.md).

