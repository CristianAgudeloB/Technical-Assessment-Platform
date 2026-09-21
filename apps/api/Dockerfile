FROM node:22-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile --filter @kata/api... --filter @kata/shared-types...

COPY packages/shared-types packages/shared-types
COPY apps/api apps/api
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public pnpm --filter @kata/api prisma generate \
  && pnpm --filter @kata/shared-types build \
  && pnpm --filter @kata/api build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && groupadd --system app \
  && useradd --system --gid app --create-home app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile --prod --filter @kata/api... --filter @kata/shared-types... \
  && pnpm store prune

COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts apps/api/prisma.config.ts

USER app
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
