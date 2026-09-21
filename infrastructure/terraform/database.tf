resource "random_password" "database" {
  length  = 32
  special = false
}

resource "random_password" "jwt" {
  length  = 48
  special = false
}

resource "aws_db_instance" "postgres" {
  identifier                   = local.name
  engine                       = "postgres"
  instance_class               = var.db_instance_class
  allocated_storage            = 20
  storage_type                 = "gp3"
  storage_encrypted            = true
  db_name                      = var.db_name
  username                     = var.db_username
  password                     = random_password.database.result
  port                         = 5432
  db_subnet_group_name         = aws_db_subnet_group.main.name
  vpc_security_group_ids       = [aws_security_group.database.id]
  publicly_accessible          = false
  multi_az                     = false
  backup_retention_period      = 1
  deletion_protection          = false
  skip_final_snapshot          = true
  auto_minor_version_upgrade   = true
  apply_immediately            = true
  performance_insights_enabled = false

  tags = { Name = "${local.name}-postgres" }
}

resource "aws_ssm_parameter" "database_url" {
  name  = "${local.parameter_prefix}/database-url"
  type  = "SecureString"
  value = "postgresql://${var.db_username}:${random_password.database.result}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${var.db_name}?schema=public&sslmode=require"
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "${local.parameter_prefix}/jwt-secret"
  type  = "SecureString"
  value = random_password.jwt.result
}

resource "aws_ssm_parameter" "initial_admin_email" {
  name  = "${local.parameter_prefix}/initial-admin-email"
  type  = "SecureString"
  value = var.initial_admin_email
}

resource "aws_ssm_parameter" "initial_admin_display_name" {
  name  = "${local.parameter_prefix}/initial-admin-display-name"
  type  = "SecureString"
  value = var.initial_admin_display_name
}

resource "aws_ssm_parameter" "initial_admin_password" {
  name  = "${local.parameter_prefix}/initial-admin-password"
  type  = "SecureString"
  value = var.initial_admin_password
}

resource "aws_ssm_parameter" "judge0_auth_token" {
  count = var.judge0_auth_token == "" ? 0 : 1
  name  = "${local.parameter_prefix}/judge0-auth-token"
  type  = "SecureString"
  value = var.judge0_auth_token
}
