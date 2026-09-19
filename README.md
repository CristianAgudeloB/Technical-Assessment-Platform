# Technical Assessment Platform

Plataforma de evaluaciones técnicas construida como modular monolith: React en `apps/web`, NestJS en `apps/api`, PostgreSQL/Prisma y contratos mínimos en `packages/shared-types`.

## Requisitos

- Node.js 22+
- pnpm 11+
- Docker con Docker Compose (solo para PostgreSQL)

## Inicio local

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:generate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000/health
- PostgreSQL: localhost:5432

El seed crea tres assessments publicados, seis ejercicios realistas de programación, Java, JavaScript y Python, y 18 casos de prueba (incluyendo casos ocultos). La aplicación usa Judge0 mediante un adapter; el backend nunca ejecuta código de candidatos localmente.

## Scripts

```bash
pnpm dev          # API y web en paralelo
pnpm dev:api      # Solo NestJS
pnpm dev:web      # Solo React/Vite
pnpm build        # Compila todos los paquetes
pnpm typecheck    # Verifica TypeScript
pnpm db:up        # Inicia PostgreSQL
pnpm db:down      # Detiene PostgreSQL
pnpm db:generate  # Genera el cliente Prisma
pnpm db:migrate   # Crea/aplica una migración de Prisma
pnpm db:migrate:dev # Crea una migración nueva durante desarrollo
pnpm db:seed      # Inserta datos demostrativos idempotentes
pnpm verify:api   # Valida endpoints; requiere `pnpm dev:api` en otra terminal
pnpm verify:judge0 # Verifica Java, JavaScript y Python contra Judge0
pnpm verify:execution # Valida ejecución, resultados persistidos y agregado por intento
```

## Flujo candidato

1. Abrir un assessment publicado e iniciar un intento temporizado.
2. Resolver preguntas con Monaco Editor y uno de sus lenguajes permitidos.
3. Crear una submission y ejecutarla en Judge0 contra todos los casos.
4. Consultar el reporte detallado de tests y el resultado acumulado del assessment.

El resultado acumulado conserva el último resultado evaluado de cada pregunta. Su puntaje es el promedio ponderado por el puntaje configurado de cada pregunta; las preguntas no enviadas aportan cero.

## Modo administrador de demostración

El selector **Candidate / Administrator** del frontend permite recorrer los dos flujos de la demo. El administrador puede crear assessments, definir preguntas, lenguajes permitidos y hasta diez casos de prueba por pregunta. Es una simulación de interfaz: todavía no reemplaza autenticación ni autorización de servidor.

## API actual

```text
POST /assessments
GET  /assessments
GET  /assessments/:id
POST /assessments/:assessmentId/attempts
GET  /assessments/:assessmentId/attempts/:attemptId
GET  /assessments/:assessmentId/attempts/:attemptId/results

POST /assessments/:assessmentId/questions
GET  /assessments/:assessmentId/questions
GET  /questions/:id

POST /submissions
POST /submissions/:id/execute
GET  /submissions/:id/results
```

Los endpoints validan payloads, límites, lenguajes permitidos y el tiempo del intento en el servidor. Solo assessments `PUBLISHED` pueden iniciar intentos. Los casos ocultos no exponen input, resultado esperado ni salida de ejecución al cliente.

## Seguridad y límites

- El código no confiable se envía únicamente a Judge0 a través de `CodeExecutionPort`.
- Judge0 recibe límites de CPU, memoria, procesos, tamaño de archivo, red deshabilitada y timeout total de la operación.
- Las submissions están limitadas a 30 000 caracteres y a 20 por intento.
- `.env` está excluido del repositorio; `.env.example` contiene solo valores simulados.

Autenticación/autorización y una instancia privada de Judge0 quedan fuera de alcance para esta Kata. Para AWS: el frontend puede desplegarse en S3/CloudFront, NestJS en Lambda/API Gateway y PostgreSQL en RDS; Judge0 permanece como proveedor aislado.
