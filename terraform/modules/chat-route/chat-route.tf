variable "function_name" {
  type = string
}

variable "route_name" {
  type = string
}

variable "owning_api" {
  type = object({
    id            = string
    role_name     = string
    role_arn      = string
    execution_arn = string
  })
}

variable "table" {
  type = object({
    name              = string
    arn               = string
    read_write_policy = string
  })
}

variable "extra_envs" {
  type    = map(string)
  default = {}
}

variable "authorizer" {
  type = object({
    type = string
    id   = string
  })

  default = {
    type = "NONE"
    id   = ""
  }
}

module "manage_connection_policy" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-policy"
  version = "5.16.0"

  name = "AllowManageConnection${var.function_name}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "execute-api:ManageConnections"
        ]
        Resource = "${var.owning_api.execution_arn}/*/*/@connections/*"
      }
    ]
  })
}

resource "aws_apigatewayv2_integration" "this" {
  api_id               = var.owning_api.id
  integration_type     = "AWS_PROXY"
  integration_uri      = module.route_handler.function.invoke_arn
  credentials_arn      = var.owning_api.role_arn
  passthrough_behavior = "WHEN_NO_MATCH"
}


resource "aws_apigatewayv2_route" "this" {
  api_id             = var.owning_api.id
  route_key          = var.route_name
  target             = "integrations/${aws_apigatewayv2_integration.this.id}"
  authorization_type = var.authorizer.type
  authorizer_id      = var.authorizer.id
}

resource "aws_iam_role_policy_attachment" "this" {
  for_each = {
    dynamo = var.table.read_write_policy
    apigw  = module.manage_connection_policy.arn
  }

  role       = module.route_handler.function.role_name
  policy_arn = each.value
}


module "api_invoke_policy" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-policy"
  version = "5.16.0"

  name = "AllowInvoke${var.function_name}Route"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = module.route_handler.function.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "gateway" {
  role       = var.owning_api.role_name
  policy_arn = module.api_invoke_policy.arn
}

resource "aws_lambda_permission" "this" {
  statement_id  = "${var.function_name}AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.owning_api.execution_arn}/*/*"
}

module "route_handler" {
  source = "../nodejs_lambda"

  function_name = var.function_name
  environment = merge(
    var.extra_envs,
    { table = var.table.name }
  )
}

output "function" {
  value = {
    arn        = module.route_handler.function.arn
    invoke_arn = module.route_handler.function.invoke_arn
  }
}
