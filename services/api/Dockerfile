FROM node:24-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
COPY tsconfig.base.json ./
RUN npm ci
RUN npm run build -w @helloqwen/contracts
RUN npm run build -w @helloqwen/domain
RUN npm run build -w @helloqwen/db
RUN npm run build -w @helloqwen/ai
RUN npm run build -w @helloqwen/api

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages ./packages
COPY --from=builder --chown=node:node /app/services/api ./services/api
USER node
EXPOSE 3001
CMD ["node", "services/api/dist/server.js"]
