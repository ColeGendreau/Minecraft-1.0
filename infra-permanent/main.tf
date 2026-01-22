# Permanent Infrastructure - Always On
# This hosts the dashboard and coordinator API that control the main infrastructure
# Designed for minimal cost - scales to zero when idle

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  # Use same backend as main infra but different key
  backend "azurerm" {
    resource_group_name  = "mc-demo-tfstate-rg"
    storage_account_name = "mcdemodevtfstate"
    container_name       = "tfstate"
    key                  = "dashboard.tfstate"
  }
}

provider "azurerm" {
  features {}
}

# Variables
variable "location" {
  description = "Azure region"
  default     = "westus3"
}

variable "environment" {
  description = "Environment name"
  default     = "dev"
}

variable "project" {
  description = "Project name"
  default     = "mc-demo"
}

variable "github_token" {
  description = "GitHub token for workflow API access"
  default     = ""
  sensitive   = true
}

# Note: RCON and Azure OpenAI config are injected at deploy time
# by the dashboard-deploy workflow from the main infrastructure outputs

locals {
  name_prefix = "${var.project}-${var.environment}"
  tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "dashboard-permanent"
  }
}

# Resource Group for permanent infrastructure
resource "azurerm_resource_group" "dashboard" {
  name     = "${local.name_prefix}-dashboard-rg"
  location = var.location
  tags     = local.tags
}

# Container Registry (use existing or create minimal one)
resource "azurerm_container_registry" "dashboard" {
  name                = "${replace(local.name_prefix, "-", "")}dashboardacr"
  resource_group_name = azurerm_resource_group.dashboard.name
  location            = azurerm_resource_group.dashboard.location
  sku                 = "Basic"
  admin_enabled       = true
  tags                = local.tags
}

# Log Analytics Workspace for Container Apps
resource "azurerm_log_analytics_workspace" "dashboard" {
  name                = "${local.name_prefix}-dashboard-logs"
  location            = azurerm_resource_group.dashboard.location
  resource_group_name = azurerm_resource_group.dashboard.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

# Container Apps Environment
resource "azurerm_container_app_environment" "dashboard" {
  name                       = "${local.name_prefix}-dashboard-env"
  location                   = azurerm_resource_group.dashboard.location
  resource_group_name        = azurerm_resource_group.dashboard.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.dashboard.id
  tags                       = local.tags
}

# User-Assigned Managed Identity for Coordinator
# This identity is used to authenticate to AKS for kubectl operations
# and to query Azure Cost Management API
resource "azurerm_user_assigned_identity" "coordinator" {
  name                = "${local.name_prefix}-coordinator-identity"
  location            = azurerm_resource_group.dashboard.location
  resource_group_name = azurerm_resource_group.dashboard.name
  tags                = local.tags
}

# Get current subscription for role assignments
data "azurerm_subscription" "current" {}

# Grant Cost Management Reader role to coordinator identity
# This allows the coordinator API to query Azure Cost Management for real spending data
resource "azurerm_role_assignment" "coordinator_cost_reader" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Cost Management Reader"
  principal_id         = azurerm_user_assigned_identity.coordinator.principal_id
}

# Coordinator API - Container App (scales to zero)
resource "azurerm_container_app" "coordinator" {
  name                         = "${local.name_prefix}-coordinator"
  container_app_environment_id = azurerm_container_app_environment.dashboard.id
  resource_group_name          = azurerm_resource_group.dashboard.name
  revision_mode                = "Single"
  tags                         = local.tags

  # Managed Identity for AKS access
  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.coordinator.id]
  }

  registry {
    server               = azurerm_container_registry.dashboard.login_server
    username             = azurerm_container_registry.dashboard.admin_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = azurerm_container_registry.dashboard.admin_password
  }

  template {
    min_replicas = 1 # Keep at least 1 replica for responsiveness
    max_replicas = 2

    container {
      name   = "coordinator-api"
      image  = "${azurerm_container_registry.dashboard.login_server}/coordinator-api:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "PORT"
        value = "3001"
      }

      # GitHub config for workflow triggers
      env {
        name  = "GITHUB_OWNER"
        value = "ColeGendreau"
      }

      env {
        name  = "GITHUB_REPO"
        value = "Minecraft-1.0"
      }

      env {
        name  = "INFRA_STATE_PATH"
        value = "/tmp/INFRASTRUCTURE_STATE"
      }

      # AKS config for kubectl MOTD updates
      env {
        name  = "AKS_RESOURCE_GROUP"
        value = "${local.name_prefix}-rg"
      }

      env {
        name  = "AKS_CLUSTER_NAME"
        value = "${local.name_prefix}-aks"
      }

      env {
        name  = "AZURE_CLIENT_ID"
        value = azurerm_user_assigned_identity.coordinator.client_id
      }

      # Note: Azure OpenAI and RCON config are set by dashboard-deploy workflow
      # at deploy time from the main infrastructure outputs
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3001
    transport        = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}

# Dashboard - Container App (scales to zero)
resource "azurerm_container_app" "dashboard" {
  name                         = "${local.name_prefix}-dashboard"
  container_app_environment_id = azurerm_container_app_environment.dashboard.id
  resource_group_name          = azurerm_resource_group.dashboard.name
  revision_mode                = "Single"
  tags                         = local.tags

  registry {
    server               = azurerm_container_registry.dashboard.login_server
    username             = azurerm_container_registry.dashboard.admin_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = azurerm_container_registry.dashboard.admin_password
  }

  template {
    min_replicas = 0
    max_replicas = 2

    container {
      name   = "dashboard"
      image  = "${azurerm_container_registry.dashboard.login_server}/dashboard:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "PORT"
        value = "3000"
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "https://${azurerm_container_app.coordinator.ingress[0].fqdn}"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  depends_on = [azurerm_container_app.coordinator]
}

# Outputs
output "coordinator_api_url" {
  description = "URL of the Coordinator API"
  value       = "https://${azurerm_container_app.coordinator.ingress[0].fqdn}"
}

output "dashboard_url" {
  description = "URL of the Dashboard"
  value       = "https://${azurerm_container_app.dashboard.ingress[0].fqdn}"
}

output "container_registry" {
  description = "Container Registry login server"
  value       = azurerm_container_registry.dashboard.login_server
}

output "resource_group_name" {
  description = "Resource group name for permanent infrastructure"
  value       = azurerm_resource_group.dashboard.name
}

output "acr_username" {
  description = "ACR admin username"
  value       = azurerm_container_registry.dashboard.admin_username
}

output "acr_password" {
  description = "ACR admin password"
  value       = azurerm_container_registry.dashboard.admin_password
  sensitive   = true
}

output "coordinator_identity_principal_id" {
  description = "Principal ID of the coordinator managed identity (for AKS RBAC)"
  value       = azurerm_user_assigned_identity.coordinator.principal_id
}

output "coordinator_identity_client_id" {
  description = "Client ID of the coordinator managed identity"
  value       = azurerm_user_assigned_identity.coordinator.client_id
}
