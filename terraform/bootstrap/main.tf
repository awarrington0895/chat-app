module "s3-bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "3.8.2"

  bucket = "asw-state-bucket3"
  acl = "private"

  versioning = {
    enabled = false
  }
}
