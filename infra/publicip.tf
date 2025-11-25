# Public IP for NGINX Ingress Controller
# This IP will be created in the node resource group managed by AKS
data "azurerm_resource_group" "node_rg" {
  name = azurerm_kubernetes_cluster.aks.node_resource_group
}

resource "azurerm_public_ip" "ingress" {
  name                = "${var.project_name}-${var.environment}-ingress-ip"
  location            = data.azurerm_resource_group.node_rg.location
  resource_group_name = data.azurerm_resource_group.node_rg.name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = merge(
    var.tags,
    {
      "service" = "ingress-nginx"
    }
  )

  depends_on = [
    azurerm_kubernetes_cluster.aks
  ]
}

