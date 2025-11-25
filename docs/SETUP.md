# Setup Guide

This guide walks through setting up Azure OIDC authentication for GitHub Actions.

## Azure Setup

### 1. Create Azure AD App Registration

```bash
# Set variables
APP_NAME="github-minecraft-oidc"
REPO_OWNER="your-github-username"
REPO_NAME="Minecraft-1.0"

# Create the app registration
az ad app create --display-name $APP_NAME

# Get the app ID
APP_ID=$(az ad app list --display-name $APP_NAME --query '[0].appId' -o tsv)
echo "Application (Client) ID: $APP_ID"

# Create service principal
az ad sp create --id $APP_ID

# Get object ID
OBJECT_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query '[0].id' -o tsv)
```

### 2. Configure Federated Credentials

```bash
# Create federated credential for main branch
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-main-branch",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'"$REPO_OWNER"'/'"$REPO_NAME"':ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Optional: Create credential for pull requests
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-pull-requests",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'"$REPO_OWNER"'/'"$REPO_NAME"':pull_request",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### 3. Assign Azure Permissions

```bash
# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Subscription ID: $SUBSCRIPTION_ID"

# Assign Contributor role at subscription level
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID

# Optional: Assign to specific resource group only (after it's created)
# az role assignment create \
#   --assignee $APP_ID \
#   --role Contributor \
#   --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/mc-demo-dev-rg
```

### 4. Collect Required Values

```bash
# Get tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)

echo "=== GitHub Secrets Values ==="
echo "AZURE_CLIENT_ID: $APP_ID"
echo "AZURE_TENANT_ID: $TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
```

## GitHub Setup

### Add Repository Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add these three secrets:

| Name | Value |
|------|-------|
| `AZURE_CLIENT_ID` | Application (Client) ID from Azure |
| `AZURE_TENANT_ID` | Tenant ID from Azure |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID from Azure |

### Configure Branch Protection (Recommended)

1. Go to **Settings** > **Branches**
2. Add rule for `main` branch:
   - Require pull request reviews before merging
   - Require status checks to pass before merging
   - Include administrators

## Testing the Setup

### Test Workflow Manually

1. Push a change to `infra/`:
```bash
cd infra/
echo "# Test" >> README.md
git add README.md
git commit -m "test: trigger terraform workflow"
git push origin main
```

2. Check workflow run:
   - Go to **Actions** tab in GitHub
   - Watch the `terraform` workflow execute
   - Verify all steps complete successfully

### Test OIDC Authentication

Create a test workflow to verify OIDC:

```yaml
# .github/workflows/test-oidc.yaml
name: Test OIDC
on: workflow_dispatch

permissions:
  id-token: write
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: azure/login@v2
        with:
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
      
      - run: |
          az account show
          az group list
```

Run manually from **Actions** > **Test OIDC** > **Run workflow**.

## Security Notes

### Public Repository Considerations

- GitHub Secrets are encrypted and never exposed in logs
- Workflows from forks cannot access your secrets
- OIDC tokens are short-lived (1 hour)
- Only the configured repository can authenticate

### Additional Security Measures

1. **Scope permissions narrowly**:
```bash
# Use resource group scope instead of subscription
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/mc-demo-dev-rg
```

2. **Set Azure spending limits**:
   - Go to Azure Portal > Cost Management + Billing
   - Set up budget alerts
   - Configure spending limits

3. **Enable Azure Policy**:
```bash
# Example: Block expensive VM sizes
az policy assignment create \
  --name 'restrict-vm-sizes' \
  --policy '/providers/Microsoft.Authorization/policyDefinitions/cccc23c7-8427-4f53-ad12-b6a63eb452b3' \
  --params '{"listOfAllowedSKUs": {"value": ["Standard_D2as_v5", "Standard_B2s"]}}'
```

## Troubleshooting

### "AADSTS70021: No matching federated identity record found"

Check federated credential configuration:
```bash
az ad app federated-credential list --id $APP_ID
```

Verify the subject matches your repository exactly:
- Format: `repo:OWNER/REPO:ref:refs/heads/BRANCH`
- Case-sensitive

### "Authorization failed for template resource"

Check role assignment:
```bash
az role assignment list --assignee $APP_ID --output table
```

Ensure service principal has Contributor role.

### "terraform init" fails

Check Azure CLI is authenticated in the workflow:
```yaml
- name: Azure login (OIDC)
  uses: azure/login@v2
  with:
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
```

This must run before Terraform commands.

## Cleanup

### Remove Azure Resources

```bash
# Delete role assignment
az role assignment delete --assignee $APP_ID

# Delete service principal
az ad sp delete --id $APP_ID

# Delete app registration
az ad app delete --id $APP_ID
```

### Remove GitHub Secrets

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Delete each secret individually

## References

- [Azure OIDC with GitHub Actions](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Terraform Azure Provider Authentication](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_oidc)

