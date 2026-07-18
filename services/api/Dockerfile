FROM node:24-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
COPY scripts ./scripts
COPY .agents ./.agents
COPY tsconfig.base.json ./
RUN npm ci
RUN npm run build -w @mealmind/contracts
RUN npm run build -w @mealmind/domain
RUN npm run build -w @mealmind/db
RUN npm run build -w @mealmind/ai
RUN npm run build -w @mealmind/api

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv \
  && python3 -m venv /opt/mealmind-python \
  && /opt/mealmind-python/bin/pip install --no-cache-dir requests PyYAML \
  && rm -rf /var/lib/apt/lists/*
ENV MEALMIND_RECIPE_IMPORT_PYTHON=/opt/mealmind-python/bin/python
COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages ./packages
COPY --from=builder --chown=node:node /app/services/api ./services/api
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/.agents ./.agents
USER node
EXPOSE 3001
CMD ["node", "services/api/dist/server.js"]
