variable "aws_region" {
  description = "AWS region for regional resources. CloudFront remains global."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short lowercase name used as an AWS resource prefix."
  type        = string
  default     = "technical-assessment"
}

variable "environment" {
  description = "Environment name used in resource names and parameter paths."
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for the application VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "api_instance_type" {
  description = "Small x86 instance for the NestJS modular monolith."
  type        = string
  default     = "t3.micro"
}

variable "db_instance_class" {
  description = "RDS PostgreSQL instance class. Check the Free Tier or Sandbox label in your AWS account before applying."
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Initial PostgreSQL database name."
  type        = string
  default     = "technical_assessment"
}

variable "db_username" {
  description = "Master database username."
  type        = string
  default     = "assessment_admin"
}

variable "initial_admin_email" {
  description = "Email created once by the non-destructive administrator bootstrap."
  type        = string
}

variable "initial_admin_display_name" {
  description = "Display name created once by the administrator bootstrap."
  type        = string
  default     = "Administrador"
}

variable "initial_admin_password" {
  description = "Strong password for the first administrator. Keep it only in an uncommitted tfvars file or TF_VAR environment variable."
  type        = string
  sensitive   = true
}

variable "judge0_base_url" {
  description = "Judge0 endpoint used by the API. A production endpoint should be authenticated and rate-limited."
  type        = string
  default     = "https://ce.judge0.com"
}

variable "judge0_auth_token" {
  description = "Optional Judge0 authorization token. Do not commit it."
  type        = string
  sensitive   = true
  default     = ""
}

variable "force_destroy_frontend_bucket" {
  description = "Whether terraform destroy may delete frontend files from S3. Keep false outside disposable environments."
  type        = bool
  default     = false
}
