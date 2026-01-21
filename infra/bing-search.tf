# Bing Search API for Image Search
# Used to find images from search queries for pixel art conversion

resource "azurerm_cognitive_account" "bing_search" {
  name                = "${var.project_name}-${var.environment}-bing"
  location            = "global" # Bing Search is a global service
  resource_group_name = azurerm_resource_group.main.name
  kind                = "Bing.Search.v7"
  sku_name            = "S1" # Standard tier - $3 per 1000 transactions

  tags = var.tags
}

# Output the Bing Search key for use in the coordinator API
output "bing_search_key" {
  value     = azurerm_cognitive_account.bing_search.primary_access_key
  sensitive = true
}

output "bing_search_endpoint" {
  value = azurerm_cognitive_account.bing_search.endpoint
}

