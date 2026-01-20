# Azure OpenAI Service for AI-powered world generation
# This is deployed as part of the main infrastructure

resource "azurerm_cognitive_account" "openai" {
  name                  = "${var.project_name}-${var.environment}-openai"
  location              = "eastus" # Azure OpenAI has limited region availability
  resource_group_name   = azurerm_resource_group.main.name
  kind                  = "OpenAI"
  sku_name              = "S0"
  custom_subdomain_name = "${var.project_name}-${var.environment}-openai"

  tags = var.tags
}

# Deploy GPT-4o model for world generation
resource "azurerm_cognitive_deployment" "gpt4o" {
  name                 = "gpt-4o"
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format  = "OpenAI"
    name    = "gpt-4o"
    version = "2024-08-06"
  }

  scale {
    type     = "Standard"
    capacity = 10 # 10K tokens per minute - adjust as needed
  }
}

