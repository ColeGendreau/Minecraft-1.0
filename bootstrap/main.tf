# Bootstrap Terraform configuration for remote backend
# This creates the storage account and container for storing Terraform state
# Run this once manually, then configure the main infrastructure to use this backend

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource group for Terraform state
resource "azurerm_resource_group" "tfstate" {
  name     = "mc-demo-tfstate-rg"
  location = "westus3"

  tags = {
    Purpose    = "Terraform State Storage"
    ManagedBy  = "Terraform Bootstrap"
    Project    = "Minecraft-DevOps"
  }
}

# Storage account for Terraform state
resource "azurerm_storage_account" "tfstate" {
  name                     = "mcdemodevtfstate"
  resource_group_name      = azurerm_resource_group.tfstate.name
  location                 = azurerm_resource_group.tfstate.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  # Security settings
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = true

  tags = {
    Purpose    = "Terraform State Storage"
    ManagedBy  = "Terraform Bootstrap"
    Project    = "Minecraft-DevOps"
  }
}

# Blob container for state files
resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.tfstate.name
  container_access_type = "private"
}

# Outputs
output "storage_account_name" {
  value = azurerm_storage_account.tfstate.name
}

output "container_name" {
  value = azurerm_storage_container.tfstate.name
}

output "resource_group_name" {
  value = azurerm_resource_group.tfstate.name
}

output "access_key" {
  value     = azurerm_storage_account.tfstate.primary_access_key
  sensitive = true
}

