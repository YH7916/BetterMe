# Reproducible container image for the BetterMe API (Node host).
# Build from the repository root:  docker build -f apps/api/Dockerfile -t betterme-api .
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# Prisma engines need OpenSSL on debian-slim.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# Install workspace dependencies from lockfile only (better layer caching).
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

# Bring in sources and generate the Prisma client.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @betterme/api exec prisma generate

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 8787
# Migrations are applied by the platform's pre-deploy step, not at container start.
CMD ["pnpm", "--filter", "@betterme/api", "start"]
