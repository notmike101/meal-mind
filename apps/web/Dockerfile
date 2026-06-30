FROM node:24-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
COPY tsconfig.base.json ./
RUN npm ci
RUN npm run build -w @mealmind/contracts
RUN npm run build -w @mealmind/web

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
COPY --from=builder --chown=node:node /app/apps/web/.output ./apps/web/.output
USER node
EXPOSE 3000
CMD ["node", "apps/web/.output/server/index.mjs"]
