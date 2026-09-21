output "frontend_url" {
  description = "HTTPS URL for the deployed React application."
  value       = "https://${aws_cloudfront_distribution.application.domain_name}"
}

output "frontend_bucket_name" {
  description = "Private S3 bucket receiving apps/web/dist during a frontend deployment."
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "Distribution ID used to invalidate cached frontend assets."
  value       = aws_cloudfront_distribution.application.id
}

output "ecr_repository_url" {
  description = "ECR repository where the Linux/amd64 API image must be pushed."
  value       = aws_ecr_repository.api.repository_url
}

output "api_instance_id" {
  description = "EC2 instance ID used by AWS Systems Manager to trigger a deployment."
  value       = aws_instance.api.id
}

output "api_instance_public_dns" {
  description = "CloudFront origin hostname. Do not use it as the public application URL."
  value       = aws_eip.api.public_dns
}
