FROM node:22-bookworm-slim AS build

WORKDIR /workspace
COPY . .
RUN DATABASE_URL=postgresql://nexus:nexus-ci-only@localhost:5432/nexus_ci \
    DIRECT_URL=postgresql://nexus:nexus-ci-only@localhost:5432/nexus_ci \
    npm ci --workspace=api --include-workspace-root
RUN DATABASE_URL=postgresql://nexus:nexus-ci-only@localhost:5432/nexus_ci \
    DIRECT_URL=postgresql://nexus:nexus-ci-only@localhost:5432/nexus_ci \
    npm run build --workspace=api

FROM build AS migrator
ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy", "--schema=apps/api/prisma/schema.prisma"]

FROM build AS runtime-dependencies
RUN npm prune --omit=dev --workspace=api --include-workspace-root

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /workspace

COPY --from=runtime-dependencies --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/package.json ./package.json
COPY --from=build --chown=node:node /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /workspace/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /workspace/apps/api/prisma ./apps/api/prisma
RUN mkdir -p /workspace/apps/api/dist/uploads && chown -R node:node /workspace/apps/api/dist/uploads

USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:4000/api/health/live').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "apps/api/dist/src/main.js"]
