locals {
  table_name = "ConnectionTable"
  owning_api = {
    id = aws_apigatewayv2_api.chat_api.id
    role_name = aws_iam_role.api_gateway.name
    role_arn = aws_iam_role.api_gateway.arn
  }

  table = {
    name = local.table_name
    arn = module.connection_table.dynamodb_table_arn
    read_write_policy = module.dynamo_read_write.arn
  }
}

resource "aws_iam_role" "api_gateway" {
  name = "WSChatApiGatewayRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_apigatewayv2_api" "chat_api" {
  name = "chatApi"
  protocol_type = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

resource "aws_apigatewayv2_stage" "production" {
  api_id = aws_apigatewayv2_api.chat_api.id
  name = "production"
  auto_deploy = true
}

module "dynamo_read_write" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-policy"
  version = "5.16.0"

  name = "DynamoReadWrite"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:*"
        ]
        Resource = module.connection_table.dynamodb_table_arn
      }
    ]
  })
}

module "connection_table" {
  source = "terraform-aws-modules/dynamodb-table/aws"
  version = "3.2.0"

  name = local.table_name

  hash_key = "connectionId"

  attributes = [
    {
      name = "connectionId"
      type = "S"
    }
  ]
}

module "newsletter_topic" {
  source  = "terraform-aws-modules/sns/aws"
  version = "5.1.0"

  name = "Newsletter"
}

module "connect" {
  source = "./modules/chat-route"
  function_name = "connect"
  route_name = "$connect"
  owning_api = local.owning_api
  table = local.table
}

module "default" {
  source = "./modules/chat-route"
  function_name = "default"
  route_name = "$default"
  owning_api = local.owning_api
  table = local.table
}

module "disconnect" {
  source = "./modules/chat-route"
  function_name = "disconnect"
  route_name = "$disconnect"
  owning_api = local.owning_api
  table = local.table
}
