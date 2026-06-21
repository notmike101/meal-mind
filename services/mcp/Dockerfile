FROM node:24-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
COPY tsconfig.base.json ./
RUN npm ci
RUN npm run build -w @mealmind/contracts
RUN npm run build -w @mealmind/mcp

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages/contracts ./packages/contracts
COPY --from=builder --chown=node:node /app/services/mcp ./services/mcp
USER node
EXPOSE 3002
CMD ["node", "services/mcp/dist/http.js"]
