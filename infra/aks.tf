# Azure Kubernetes Service Cluster
resource "azurerm_kubernetes_cluster" "aks" {
  name                = "${var.project_name}-${var.environment}-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "${var.project_name}-${var.environment}"
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "default"
    node_count          = var.aks_node_count
    vm_size             = var.aks_node_size
    os_disk_size_gb     = 30
    type                = "VirtualMachineScaleSets"
    enable_auto_scaling = false

    # Network settings
    vnet_subnet_id = null # Using kubenet (basic networking)
  }

  # Identity for AKS cluster
  identity {
    type = "SystemAssigned"
  }

  # Network profile
  network_profile {
    network_plugin    = "kubenet"
    load_balancer_sku = "standard"
    network_policy    = "calico"
  }

  # Enable Azure Monitor for containers
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.aks.id
  }

  # Security and compliance
  azure_policy_enabled = false

  # RBAC
  azure_active_directory_role_based_access_control {
    managed            = true
    azure_rbac_enabled = true
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      default_node_pool[0].node_count
    ]
  }
}

# Look up the coordinator managed identity from permanent infrastructure
data "azurerm_user_assigned_identity" "coordinator" {
  name                = "${var.project_name}-${var.environment}-coordinator-identity"
  resource_group_name = "${var.project_name}-${var.environment}-dashboard-rg"
}

# Grant coordinator identity access to AKS cluster
# "Azure Kubernetes Service Cluster User Role" allows getting credentials
resource "azurerm_role_assignment" "coordinator_aks_user" {
  scope                = azurerm_kubernetes_cluster.aks.id
  role_definition_name = "Azure Kubernetes Service Cluster User Role"
  principal_id         = data.azurerm_user_assigned_identity.coordinator.principal_id
}

# Grant coordinator identity RBAC Admin on AKS for kubectl operations
# This allows patching deployments in the minecraft namespace
resource "azurerm_role_assignment" "coordinator_aks_rbac_writer" {
  scope                = azurerm_kubernetes_cluster.aks.id
  role_definition_name = "Azure Kubernetes Service RBAC Writer"
  principal_id         = data.azurerm_user_assigned_identity.coordinator.principal_id
}

