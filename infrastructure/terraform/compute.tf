resource "aws_ecr_repository" "api" {
  name                 = local.name
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_iam_role" "api_instance" {
  name = "${local.name}-api-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_managed_instance" {
  role       = aws_iam_role.api_instance.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ecr_read_only" {
  role       = aws_iam_role.api_instance.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy" "read_runtime_parameters" {
  name = "${local.name}-read-runtime-parameters"
  role = aws_iam_role.api_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameter"]
      Resource = "arn:${data.aws_partition.current.partition}:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${local.parameter_prefix}/*"
    }]
  })
}

resource "aws_iam_instance_profile" "api" {
  name = "${local.name}-api"
  role = aws_iam_role.api_instance.name
}

resource "aws_ssm_parameter" "web_origin" {
  name  = "${local.parameter_prefix}/web-origin"
  type  = "String"
  value = "https://${aws_cloudfront_distribution.application.domain_name}"
}

resource "aws_instance" "api" {
  ami                         = data.aws_ssm_parameter.amazon_linux_2023_ami.value
  instance_type               = var.api_instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.api.id]
  iam_instance_profile        = aws_iam_instance_profile.api.name
  associate_public_ip_address = true
  user_data_replace_on_change = true
  user_data = templatefile("${path.module}/templates/user-data.sh.tftpl", {
    aws_region             = var.aws_region
    ecr_repository_url     = aws_ecr_repository.api.repository_url
    database_url_parameter = aws_ssm_parameter.database_url.name
    jwt_secret_parameter   = aws_ssm_parameter.jwt_secret.name
    # This literal path intentionally avoids a CloudFront → EC2 → CloudFront dependency cycle.
    # The deployment script reads it only after terraform apply has completed.
    web_origin_parameter                 = "${local.parameter_prefix}/web-origin"
    initial_admin_email_parameter        = aws_ssm_parameter.initial_admin_email.name
    initial_admin_display_name_parameter = aws_ssm_parameter.initial_admin_display_name.name
    initial_admin_password_parameter     = aws_ssm_parameter.initial_admin_password.name
    judge0_base_url                      = var.judge0_base_url
    judge0_auth_token_parameter          = try(aws_ssm_parameter.judge0_auth_token[0].name, "")
  })

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    encrypted   = true
    volume_size = 16
    volume_type = "gp3"
  }

  tags = { Name = "${local.name}-api" }
}

resource "aws_eip" "api" {
  domain = "vpc"
  tags   = { Name = "${local.name}-api" }
}

resource "aws_eip_association" "api" {
  allocation_id = aws_eip.api.id
  instance_id   = aws_instance.api.id
}
