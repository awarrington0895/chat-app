variable "function_name" {
  type = string
}

variable "environment" {
  type = map(string)
  default = {}
}

resource "aws_iam_role" "this" {
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

resource "aws_lambda_function" "this" {
  filename         = data.archive_file.this.output_path
  function_name    = var.function_name
  role             = aws_iam_role.this.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.this.output_base64sha256
  environment {
    variables = var.environment
  }
}

data "archive_file" "this" {
  type        = "zip"
  source_file = "${path.root}/../build/${var.function_name}/index.js"
  output_path = "${path.root}/../build/${var.function_name}/index.zip"
}

output "function" {
  value = {
    arn = aws_lambda_function.this.arn
    invoke_arn = aws_lambda_function.this.invoke_arn
    role_arn = aws_iam_role.this.arn
  }
}