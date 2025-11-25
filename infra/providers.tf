provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }

  # When using OIDC authentication from GitHub Actions, these will be set automatically
  # via environment variables (ARM_CLIENT_ID, ARM_SUBSCRIPTION_ID, ARM_TENANT_ID, ARM_USE_OIDC)
}

provider "azuread" {
  # Uses the same authentication as azurerm provider
}

