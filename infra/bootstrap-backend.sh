#!/bin/bash
set -e

# Bootstrap script to create Azure Storage backend for Terraform state
# This needs to run once manually before using remote backend

# Configuration
BACKEND_RG="mc-demo-tfstate-rg"
BACKEND_LOCATION="westus3"
STORAGE_ACCOUNT="mcdemodevtfstate"
CONTAINER_NAME="tfstate"

echo "Creating backend infrastructure for Terraform state..."

# Create resource group for backend
echo "1. Creating resource group: $BACKEND_RG"
az group create \
  --name "$BACKEND_RG" \
  --location "$BACKEND_LOCATION" \
  --tags "ManagedBy=Manual" "Purpose=TerraformState"

# Create storage account
echo "2. Creating storage account: $STORAGE_ACCOUNT"
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$BACKEND_RG" \
  --location "$BACKEND_LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --tags "ManagedBy=Manual" "Purpose=TerraformState"

# Get storage account key
echo "3. Getting storage account key..."
ACCOUNT_KEY=$(az storage account keys list \
  --resource-group "$BACKEND_RG" \
  --account-name "$STORAGE_ACCOUNT" \
  --query '[0].value' -o tsv)

# Create blob container
echo "4. Creating blob container: $CONTAINER_NAME"
az storage container create \
  --name "$CONTAINER_NAME" \
  --account-name "$STORAGE_ACCOUNT" \
  --account-key "$ACCOUNT_KEY"

echo ""
echo "✅ Backend infrastructure created successfully!"
echo ""
echo "Add this to your Terraform backend configuration (infra/providers.tf):"
echo ""
echo "terraform {"
echo "  backend \"azurerm\" {"
echo "    resource_group_name  = \"$BACKEND_RG\""
echo "    storage_account_name = \"$STORAGE_ACCOUNT\""
echo "    container_name       = \"$CONTAINER_NAME\""
echo "    key                  = \"terraform.tfstate\""
echo "  }"
echo "}"
echo ""
echo "Storage account key (save as GitHub secret: TF_STATE_ACCESS_KEY):"
echo "$ACCOUNT_KEY"

