FROM node:24-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY services/ai-gateway ./services/ai-gateway
COPY tsconfig.base.json ./
RUN npm ci
RUN npm run build -w @mealmind/ai-gateway

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/services/ai-gateway ./services/ai-gateway
USER node
EXPOSE 8080
CMD ["node", "services/ai-gateway/dist/server.js"]
