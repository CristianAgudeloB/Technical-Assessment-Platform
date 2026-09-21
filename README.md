# Technical Assessment Platform

Plataforma web para crear, asignar y resolver evaluaciones técnicas de programación. Está construida como un **monolito modular** con React, NestJS, PostgreSQL/Prisma, Judge0 y SonarQube Community Build.

## Capacidades

- Administración de assessments, ejercicios, lenguajes permitidos y casos de prueba.
- Registro e inicio de sesión con roles `ADMIN` y `CANDIDATE`.
- Asignación de retos a candidatos con ventana de disponibilidad.
- Intentos temporizados validados en el servidor.
- Editor Monaco, ejecución de prueba y envío definitivo de soluciones.
- Evaluación determinística en Judge0 con casos visibles y ocultos.
- Puntajes por ejercicio y resultado acumulado por assessment.
- Consulta administrativa de código, resultados de pruebas y reportes de calidad.
- Análisis informativo de calidad con SonarQube: bugs potenciales, *code smells* y vulnerabilidades. No altera el puntaje funcional.

## Arquitectura

```text
React + Monaco
      │ HTTP / JWT
      ▼
NestJS modular monolith
 ├── Assessments / Questions / Assignments
 ├── Attempts / Submissions / Evaluation
 ├── ExecutionPort → Judge0
 └── CodeQualityPort → worker aislado → SonarQube
      │
PostgreSQL + Prisma
```

El backend no ejecuta código de candidatos. Judge0 gestiona la compilación y ejecución en sandbox; SonarScanner corre en un worker Docker aislado que solo analiza estáticamente el código fuente.

## Requisitos

- Node.js 22+
- pnpm 11+
- Docker Desktop con Docker Compose

## Inicio local

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm quality:up
pnpm dev
```

Servicios locales:

- Web: `http://localhost:5173`
- API: `http://localhost:3000/health`
- PostgreSQL: `localhost:5432`
- SonarQube: `http://localhost:9000`

El seed es exclusivamente para desarrollo: elimina los datos actuales y crea assessments de demostración, un administrador y una candidata. El acceso del administrador local es `admin@admin.com` / `admin123`.

## Scripts principales

```bash
pnpm dev                    # API y web
pnpm dev:api                # Solo NestJS
pnpm dev:web                # Solo React/Vite
pnpm build                  # Build de todos los paquetes
pnpm typecheck              # Validación TypeScript

pnpm db:up                  # PostgreSQL local
pnpm db:down                # Detiene Docker local
pnpm db:generate            # Genera Prisma Client
pnpm db:migrate             # Aplica migraciones existentes
pnpm db:migrate:dev         # Crea una migración durante desarrollo
pnpm db:seed                # Restaura los datos demostrativos (destructivo)
pnpm db:bootstrap           # Crea el admin configurado por variables si no existe

pnpm quality:up             # SonarQube y worker de análisis
pnpm quality:down           # Detiene servicios de calidad
pnpm quality:logs           # Logs de SonarQube y worker

pnpm verify:judge0          # Verifica Java, JavaScript y Python en Judge0
```

## Configuración

`.env.example` contiene todas las variables requeridas. Nunca subas `.env` al repositorio.

- Para desarrollo puede usarse `https://ce.judge0.com`.
- En un entorno compartido usa una instancia autenticada de Judge0 y secretos aleatorios para JWT, PostgreSQL, SonarQube y el worker.
- SonarQube Community Build analiza Java, JavaScript, TypeScript y Python. COBOL se evalúa normalmente en Judge0, pero no recibe análisis de calidad.

## API resumida

```text
POST /auth/register              POST /auth/login
GET  /assessments                POST /assessments
GET  /assessments/:id            PATCH /assessments/:id
POST /assessments/:id/questions  GET /assessments/:id/questions
POST /assignments                DELETE /assignments/candidates/:candidateId/assessments/:assessmentId
POST /assessments/:id/attempts   GET /assessments/:id/attempts/current
POST /submissions                POST /submissions/:id/execute
GET  /submissions/:id/results    GET /admin/results
```

Las rutas requieren autenticación y las operaciones administrativas verifican el rol en el backend.

## Checklist antes de GitHub

```bash
pnpm typecheck
pnpm build
git diff --check
```

Verifica además que `.env`, `node_modules`, `dist` y archivos temporales continúen fuera del control de versiones.
