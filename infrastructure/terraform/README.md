# Infraestructura AWS

Esta configuración crea una versión de bajo coste para la Kata:

```text
CloudFront
├── S3 privado (React)
└── /api/* → EC2 + Nginx + NestJS
                 ├── RDS PostgreSQL privado
                 └── Judge0 externo
```

No usa NAT Gateway, Load Balancer, RDS Proxy ni Multi-AZ. La instancia EC2 pública puede salir a Judge0 y ECR a través del Internet Gateway; la base de datos permanece privada y solo acepta tráfico del Security Group de EC2.

## Antes de aplicar

1. Instala Terraform >= 1.8 y AWS CLI v2.
2. Configura credenciales AWS de un rol/usuario de despliegue con permisos para VPC, EC2, IAM, RDS, S3, CloudFront, ECR, SSM Parameter Store y DynamoDB.
3. Activa MFA y un presupuesto antes de crear recursos.
4. Crea primero el estado remoto cifrado y su bloqueo. Este paso no crea la aplicación y no contiene secretos:

```bas
cd infrastructure/terraform/state-bootstrap
terraform init
terraform apply

STATE_BUCKET=$(terraform output -raw state_bucket_name)
LOCK_TABLE=$(terraform output -raw lock_table_name)
cd ..
terraform init -reconfigure \
  -backend-config="bucket=$STATE_BUCKET" \
  -backend-config="key=technical-assessment/prod/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="encrypt=true" \
  -backend-config="dynamodb_table=$LOCK_TABLE"
```

5. Copia el archivo de variables sin versionarlo:

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
```

6. Sustituye `initial_admin_password` por una contraseña fuerte. No uses `admin123`.

## Crear infraestructura

```bash
terraform init
terraform fmt -check
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

Guarda los valores de salida: bucket, distribución CloudFront, repositorio ECR e ID de EC2.

## Publicar API

Desde la raíz del monorepo, construye una imagen compatible con la instancia x86 de EC2 y súbela a ECR:

```bash
AWS_REGION=us-east-1
ECR_REPOSITORY_URL=$(terraform -chdir=infrastructure/terraform output -raw ecr_repository_url)
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "${ECR_REPOSITORY_URL%%/*}"

docker buildx build --platform linux/amd64 \
  --file apps/api/Dockerfile \
  --tag "$ECR_REPOSITORY_URL:$(git rev-parse --short HEAD)" \
  --push .
```

El comando de despliegue ejecuta `prisma migrate deploy` antes de iniciar la API y después corre el bootstrap idempotente del administrador. Por eso se puede usar en cada versión sin recrear datos.

```bash
INSTANCE_ID=$(terraform -chdir=infrastructure/terraform output -raw api_instance_id)
IMAGE_TAG=$(git rev-parse --short HEAD)

aws ssm send-command \
  --region "$AWS_REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --parameters "commands=[\"/usr/local/bin/technical-assessment-deploy-api $IMAGE_TAG\"]"
```

No ejecutes `db:seed` en AWS: ese seed borra datos de demostración.

## Publicar frontend

```bash
pnpm build:web:aws
BUCKET=$(terraform -chdir=infrastructure/terraform output -raw frontend_bucket_name)
DISTRIBUTION_ID=$(terraform -chdir=infrastructure/terraform output -raw cloudfront_distribution_id)
aws s3 sync apps/web/dist "s3://$BUCKET" --delete
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths '/*'
```

Abre la URL `frontend_url` de Terraform. La API se consume con la ruta relativa `/api`, por lo que no hay mixed content ni una URL de backend expuesta al navegador.

## Destruir recursos

`terraform destroy` elimina RDS sin snapshot final porque está configurado para una Kata de demostración. Confirma que exportaste los datos que quieras conservar. Si el bucket contiene objetos, cambia `force_destroy_frontend_bucket` a `true` de forma consciente antes de destruirlo.
