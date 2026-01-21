# Bing Search API for Image Search
# Note: Bing Search moved out of Cognitive Services to Microsoft.Bing provider
# We use ARM template deployment since azurerm doesn't natively support it

resource "azurerm_resource_group_template_deployment" "bing_search" {
  name                = "bing-search-deployment"
  resource_group_name = azurerm_resource_group.main.name
  deployment_mode     = "Incremental"

  template_content = jsonencode({
    "$schema"        = "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#"
    "contentVersion" = "1.0.0.0"
    "parameters"     = {}
    "resources" = [
      {
        "type"       = "Microsoft.Bing/accounts"
        "apiVersion" = "2020-06-10"
        "name"       = "${var.project_name}-${var.environment}-bing"
        "location"   = "global"
        "sku" = {
          "name" = "S1"
        }
        "kind" = "Bing.Search.v7"
        "properties" = {
          "statisticsEnabled" = false
        }
      }
    ]
    "outputs" = {
      "bingSearchKey" = {
        "type"  = "string"
        "value" = "[listKeys(resourceId('Microsoft.Bing/accounts', '${var.project_name}-${var.environment}-bing'), '2020-06-10').key1]"
      }
      "bingSearchEndpoint" = {
        "type"  = "string"
        "value" = "https://api.bing.microsoft.com/v7.0/images/search"
      }
    }
  })

  tags = var.tags
}

# Output the Bing Search key for use in the coordinator API
output "bing_search_key" {
  value     = jsondecode(azurerm_resource_group_template_deployment.bing_search.output_content).bingSearchKey.value
  sensitive = true
}

output "bing_search_endpoint" {
  value = jsondecode(azurerm_resource_group_template_deployment.bing_search.output_content).bingSearchEndpoint.value
}

