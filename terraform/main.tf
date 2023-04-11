locals {
  table_name = "ConnectionTable"
  owning_api = {
    id = aws_apigatewayv2_api.chat_api.id
    role_name = aws_iam_role.api_gateway.name
    role_arn = aws_iam_role.api_gateway.arn
    execution_arn = aws_apigatewayv2_api.chat_api.execution_arn
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

  default_route_settings {
    detailed_metrics_enabled = true
    data_trace_enabled = true
    logging_level = "INFO"
    throttling_burst_limit = 50
    throttling_rate_limit = 100
  }

  depends_on = [aws_api_gateway_account.this]
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

  topic_policy_statements = {
    pub = {
      actions = ["sns:Publish"]
      principals = [{
        type = "AWS"
        identifiers = [module.newsletter.function.role_arn]
      }]
    }

    sub = {
      actions = [
        "sns:Subscribe",
        "sns:Receive"
      ]

      principals = [{
        type = "AWS"
        identifiers = ["*"]
      }]

      conditions = [{
        test = "StringLike"
        variable = "sns:Endpoint"
        values = [module.subscriptionnotifier.function.arn]
      }]
    }
  }

  subscriptions = {
    newsletter = {
      protocol = "lambda"
      endpoint = module.subscriptionnotifier.function.arn
    }
  }
}

module "authorizer" {
  source = "./modules/nodejs_lambda"
  function_name = "authorizer"
}

module "newsletter" {
  source = "./modules/nodejs_lambda"
  function_name = "newsletter"
  environment = {
    topicArn = module.newsletter_topic.topic_arn
  }
}

resource "aws_apigatewayv2_authorizer" "connect_authorizer" {
  api_id = local.owning_api.id
  authorizer_type = "REQUEST"
  authorizer_uri = module.authorizer.function.invoke_arn
  identity_sources = ["route.request.querystring.access_token"]
  name = "connect-authorizer"
}

resource "aws_lambda_permission" "authorizer" {
  statement_id = "authorizerAllowExecutionFromAPIGateway"
  action = "lambda:InvokeFunction"
  function_name = "authorizer"
  principal = "apigateway.amazonaws.com"
  source_arn = "${local.owning_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "sns_notifier" {
  statement_id = "authorizerAllowExecutionFromSNS"
  action = "lambda:InvokeFunction"
  function_name = "subscriptionnotifier"
  principal = "sns.amazonaws.com"
  source_arn = module.newsletter_topic.topic_arn
}

# Routes

module "connect" {
  source = "./modules/chat-route"
  function_name = "connect"
  route_name = "$connect"
  owning_api = local.owning_api
  table = local.table
  authorizer = {
    type = "CUSTOM"
    id = aws_apigatewayv2_authorizer.connect_authorizer.id
  }
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

module "sendmessage" {
  source = "./modules/chat-route"
  function_name = "sendmessage"
  route_name = "sendmessage"
  owning_api = local.owning_api
  table = local.table
}

module "subscriptionnotifier" {
  source = "./modules/chat-route"
  function_name = "subscriptionnotifier"
  route_name = "subscriptionnotifier"
  owning_api = local.owning_api
  table = local.table
  extra_envs = {
    apiEndpoint = replace(aws_apigatewayv2_stage.production.invoke_url, "wss", "https")
  }
}
