#!/bin/bash
# Setup Permanent Infrastructure for Dashboard
# This creates the "always on" infrastructure that hosts the dashboard

set -e

echo "============================================"
echo "  Setting up Permanent Dashboard Infrastructure"
echo "============================================"
echo ""

# Check prerequisites
command -v terraform >/dev/null 2>&1 || { echo "Error: terraform is required but not installed."; exit 1; }
command -v az >/dev/null 2>&1 || { echo "Error: Azure CLI is required but not installed."; exit 1; }

# Check Azure login
echo "Checking Azure login..."
az account show >/dev/null 2>&1 || { echo "Error: Not logged into Azure. Run 'az login' first."; exit 1; }

SUBSCRIPTION=$(az account show --query name -o tsv)
echo "Using Azure subscription: $SUBSCRIPTION"
echo ""

# Navigate to permanent infra directory
cd "$(dirname "$0")/../infra-permanent"

# Initialize Terraform
echo "Initializing Terraform..."
terraform init

# Plan
echo ""
echo "Planning infrastructure changes..."
terraform plan -out=tfplan

# Confirm
echo ""
read -p "Apply these changes? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# Apply
echo ""
echo "Applying infrastructure..."
terraform apply tfplan

# Get outputs
echo ""
echo "============================================"
echo "  Infrastructure Created Successfully!"
echo "============================================"
echo ""
echo "Outputs:"
terraform output

echo ""
echo "============================================"
echo "  Next Steps"
echo "============================================"
echo ""
echo "1. Add these GitHub secrets to your repository:"
echo "   - AZURE_STATIC_WEB_APPS_API_TOKEN: (run 'terraform output -raw dashboard_api_token')"
echo "   - COORDINATOR_API_URL: $(terraform output -raw coordinator_api_url)"
echo ""
echo "2. Push changes to deploy:"
echo "   git add ."
echo "   git commit -m 'Deploy dashboard to Azure'"
echo "   git push"
echo ""
echo "3. Access your dashboard at:"
echo "   $(terraform output -raw dashboard_url)"
echo ""

