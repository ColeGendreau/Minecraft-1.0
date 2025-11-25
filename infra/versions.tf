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

  # Backend configuration for remote state
  # State is stored in Azure Storage to persist between workflow runs
  backend "azurerm" {
    resource_group_name  = "mc-demo-tfstate-rg"
    storage_account_name = "mcdemodevtfstate"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
    # Access key is provided via ARM_ACCESS_KEY environment variable
  }
}

