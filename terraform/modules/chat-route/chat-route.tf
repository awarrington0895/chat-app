variable "function_name" {
  type = string
}

variable "route_name" {
  type = string
}

variable "owning_api" {
  type = object({
    id = string
    role_name = string
    role_arn = string
    execution_arn = string
  })
}

variable "table" {
  type = object({
    name = string
    arn  = string
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
    id = string
  })

  default = {
    type = "NONE"
    id = ""
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

module "logging_policy" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-policy"
  version = "5.16.0"

  name = "AllowLogging${var.function_name}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_apigatewayv2_integration" "this" {
  api_id = var.owning_api.id
  integration_type = "AWS_PROXY"
  integration_uri = aws_lambda_function.route_handler.invoke_arn
  credentials_arn = var.owning_api.role_arn
  # content_handling_strategy = "CONVERT_TO_TEXT"
  passthrough_behavior = "WHEN_NO_MATCH"
}

# resource "aws_apigatewayv2_integration_response" "this" {
#   api_id = var.owning_api.id
#   integration_id = aws_apigatewayv2_integration.this.id
#   integration_response_key = "/200/"
# }

resource "aws_apigatewayv2_route" "this" {
  api_id = var.owning_api.id
  route_key = var.route_name
  target = "integrations/${aws_apigatewayv2_integration.this.id}"
  authorization_type = var.authorizer.type
  authorizer_id = var.authorizer.id
}

# resource "aws_apigatewayv2_route_response" "this" {
#   api_id = var.owning_api.id
#   route_id = aws_apigatewayv2_route.this.id
#   route_response_key = var.route_name
# }

resource "aws_iam_role" "route_lambda_role" {
  name = "${var.function_name}Role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "this" {
  for_each = {
    logging = module.logging_policy.arn
    dynamo  = var.table.read_write_policy
    apigw = module.manage_connection_policy.arn
  }


  role       = aws_iam_role.route_lambda_role.name
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
        Resource = aws_lambda_function.route_handler.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "gateway" {
  role = var.owning_api.role_name
  policy_arn = module.api_invoke_policy.arn
}

resource "aws_cloudwatch_log_group" "this" {
  name = "/aws/lambda/${var.function_name}"
}

data "archive_file" "route_zip" {
  type        = "zip"
  source_file = "${path.root}/../build/${var.function_name}/index.js"
  output_path = "${path.root}/../build/${var.function_name}/index.zip"
}

resource "aws_lambda_permission" "this" {
  statement_id = "${var.function_name}AllowExecutionFromAPIGateway"
  action = "lambda:InvokeFunction"
  function_name = var.function_name
  principal = "apigateway.amazonaws.com"
  source_arn = "${var.owning_api.execution_arn}/*/*"
}

resource "aws_lambda_function" "route_handler" {
  filename         = data.archive_file.route_zip.output_path
  function_name    = var.function_name
  role             = aws_iam_role.route_lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.route_zip.output_base64sha256
  environment {
    variables = merge(
      var.extra_envs,
      { table = var.table.name }
    )
  }
}

output "function" {
  value = {
    arn = aws_lambda_function.route_handler.arn
    invoke_arn = aws_lambda_function.route_handler.invoke_arn
  }
}
