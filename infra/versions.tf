terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.45"
    }
  }

  # Backend configuration for remote state (optional)
  # Uncomment and configure if using Azure Storage for state
  # backend "azurerm" {
  #   resource_group_name  = "terraform-state-rg"
  #   storage_account_name = "tfstatexxxxx"
  #   container_name       = "tfstate"
  #   key                  = "minecraft.tfstate"
  # }
}

