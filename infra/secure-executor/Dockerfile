FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/agentlatch/package.json packages/agentlatch/package.json
COPY packages/secure-executor/package.json packages/secure-executor/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY packages/agentlatch packages/agentlatch
COPY packages/secure-executor packages/secure-executor
COPY packages/shared packages/shared

RUN npm run build -w @launchforge/shared \
  && npm run build -w @launchforge/agentlatch \
  && npm run build -w @launchforge/secure-executor

FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/agentlatch packages/agentlatch
COPY --from=build /app/packages/secure-executor packages/secure-executor
COPY --from=build /app/packages/shared packages/shared

CMD ["node", "packages/secure-executor/dist/workload.js"]
