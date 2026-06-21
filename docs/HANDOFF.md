# HelloQwen Handoff

## Current Active Work - 2026-06-21 Microservices Refactor (VERIFIED)

The Dockerized microservices refactor is implemented and verified. The repo compiles clean across all workspace packages/services/apps, unit tests pass, lint passes, Docker images build, Compose starts successfully, MCP stdio/HTTP smoke tests pass, Playwright smoke tests pass against the running Compose stack, and the LM Studio/Qwen path works through Docker.

### Final State Summary
All tasks from the initial checklist are complete:
- MCP service rewritten to API-backed calls with Zod schemas and verified over stdio + HTTP.
- AI gateway proxy created on container port `8080`, host port `3103`.
- AI gateway GET and POST proxying verified against LM Studio via `LM_STUDIO_URL=http://192.168.2.181:1234`.
- Docker infrastructure added and verified: service Dockerfiles, `compose.yaml`, `.env.example`, migration script.
- All packages build: contracts, domain, db, ai, api, web, mcp, ai-gateway.
- Root verification configs are workspace-aware.

### Verification Passed
```powershell
npm run build
npm run test
npm run lint
docker compose config
docker compose build
docker compose up -d
npm run mcp:http-smoke
$env:HELLOQWEN_API_BASE_URL='http://127.0.0.1:3101'; npm run mcp:smoke
npm run test:e2e
Invoke-RestMethod -Uri http://127.0.0.1:3103/readyz -Method Get
Invoke-RestMethod -Uri http://127.0.0.1:3101/api/settings/test-ai -Method Post -ContentType 'application/json' -Body '{}'
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3101/api/plans/generate -ContentType 'application/json' -Body '{"replaceExisting":true}'
```

Endpoint checks passed:

- `http://127.0.0.1:3100/` returned HTTP `200`.
- `http://127.0.0.1:3101/healthz` returned `{ ok: true }`.
- `http://127.0.0.1:3101/api/recipes` returned 8 recipes.
- `http://127.0.0.1:3102/healthz` returned `{ status: "ok" }`.
- `http://127.0.0.1:3103/readyz` returned `{ status: "ready" }`.
- `POST http://127.0.0.1:3101/api/settings/test-ai` returned the `qwen3.6-35b-a3b` model list.
- `POST http://127.0.0.1:3101/api/plans/generate` created draft plan `bf5560c8-d19c-445e-880d-618d6d675b68`.
- `GET http://127.0.0.1:3101/api/plans/current` returns that plan as `nextDraft`.
- `GET http://127.0.0.1:3101/api/plans/bf5560c8-d19c-445e-880d-618d6d675b68/shopping-list` returns shopping list `e853ced8-96dc-4bab-85b6-0eacabae1d6d`.

### External AI Dependency
LM Studio is running outside Docker. On this machine the containers can reach it through `LM_STUDIO_URL=http://192.168.2.181:1234`; `host.docker.internal:1234` was not reachable from the AI gateway container during verification. Keep `.env` pointed at the LAN URL unless Docker host networking changes.

### Resume by running:
```powershell
cd D:\projects\HelloQwen && docker compose up --build
```
See `docs/WORK_LOG.md` for the detailed final state.

### What Has Been Done
- Root `package.json` now declares npm workspaces for `apps/*`, `services/*`, and `packages/*`.
- Root scripts were changed toward the new architecture:
  - `dev` runs API and web with `concurrently`.
  - `build` targets all packages/services/apps.
  - `mcp` delegates to `@helloqwen/mcp`.
  - `db:migrate` delegates to `@helloqwen/db`.
- Dependencies were shifted toward the target stack:
  - Removed `better-sqlite3`.
  - Added `fastify`, `pg`, `@types/pg`, `concurrently`, and `zod`.
- Target directories were created:
  - `apps/web/src`
  - `packages/domain/src`
  - `packages/db/src`
  - `packages/ai/src`
  - `packages/contracts/src`
  - `services/api/src/services`
  - `services/mcp/src`
  - `services/ai-gateway/src`
  - `scripts`
- Source files were mechanically moved:
  - UI app/components are under `apps/web/src`.
  - Pure domain files are under `packages/domain/src`.
  - DB schema/client/repositories are under `packages/db/src`.
  - AI schemas/prompts/client are under `packages/ai/src`.
  - Planning/shopping services are under `services/api/src/services`.
  - MCP files are under `services/mcp/src`.
- Workspace `package.json` / `tsconfig.json` files have been added for web, packages, and services.
- `packages/contracts` now contains API envelope types/helpers, `AppError`, route request schemas, and shared DTO types.
- `packages/domain` now has an index export, uses `HELLOQWEN_RECIPE_ROOT`, and no longer imports DB schema types.
- `packages/db` has been converted in code from SQLite to Postgres using `pg` and `drizzle-orm/node-postgres`.
- DB repositories are now async.
- `packages/ai/src/client.ts` now requires a `logEvent` callback instead of importing DB repositories directly.
- `services/api/src/services/planning.ts` and `shopping.ts` have been patched for package imports and async repositories.
- `services/api/src/server.ts`, `routes.ts`, and `recipes.ts` implement the Fastify API route surface.
- **MCP service rewritten** (`services/mcp/src/app.ts`): all 10 tools and resources now call `HELLOQWEN_API_BASE_URL` instead of importing domain/repositories/services directly. All tool schemas converted to Zod (SDK v1.29 compliant).
- **MCP HTTP server** (`services/mcp/src/http.ts`): Fastify on port 3102 using `StreamableHTTPServerTransport`, exposes `/api/mcp`, `/healthz`, `/readyz`.
- **AI-Gateway proxy** (`services/ai-gateway/src/server.ts`): LM Studio router with JSON body forwarding, filtered hop-by-hop headers, and health endpoints on port 8080.
- **Docker infrastructure**: `Dockerfile.api`, `Dockerfile.mcp`, `Dockerfile.ai-gateway`, `Dockerfile.web`, `compose.yaml`, `.env.example`, `scripts/migrate-sqlite-to-postgres.ts`.
- All 8 workspace packages/services/apps build successfully: contracts, domain, db, ai, api, web, mcp, ai-gateway.

### Where To Resume
The refactor is complete. Next steps are:
1. Run `docker compose up --build` to start all services with Postgres.
2. Run `npx tsx scripts/migrate-sqlite-to-postgres.ts` to migrate existing data from SQLite.
3. Keep LM Studio running on the host and keep `LM_STUDIO_URL` in `.env` set to a container-reachable URL.
4. Add deeper integration tests around plan generation and shopping-list creation if this moves beyond local Compose.

### Known Notes
- `.git` still has the same issue (not a real repository); left untouched per prior convention.
- `npm install` reports 8 moderate vulnerabilities; no audit fix was applied.

## Current State (Post-Refactor)
HelloQwen is now a Dockerized microservices architecture:
- **`apps/web`**: Next.js UI only (standalone output), fetches from Fastify API at `/api/*`.
- **`services/api`** (`@helloqwen/api`): Fastify REST API owning domain workflows and writes, backed by Postgres.
- **`services/mcp`** (`@helloqwen/mcp`): Standalone MCP HTTP service (port 3102) with Zod schemas, calls the API via `HELLOQWEN_API_BASE_URL`.
- **`services/ai-gateway`** (`@helloqwen/ai-gateway`): LM Studio proxy on port 8080.
- **`packages/contracts`**: Shared DTO types, API envelope helpers, Zod request schemas.
- **`packages/domain`**: Pure domain logic (recipes, weeks, pantry, meal plans).
- **`packages/db`**: Async Postgres repositories via Drizzle + `pg`.
- **`packages/ai`**: AI client with JSON prompts, Zod validation, retry handling.

The app reads Markdown recipes, stores state in Postgres, generates weekly plans and shopping lists, supports draft edits/swaps/serving changes, commits plans, tracks active meal adherence, and exposes MCP for agents via HTTP on port 3102.

## Completed Stage
Stages 1-9 complete: repository docs, scaffold, database, recipes, AI services, APIs, primary UI pages, shopping, settings, accountability controls, tests, live AI verification, and browser visual inspection.

## Files Created Or Updated (Microservices Refactor)
### New Infrastructure
- `Dockerfile.api` — Fastify API service image
- `Dockerfile.mcp` — MCP HTTP service image
- `Dockerfile.ai-gateway` — AI gateway proxy image
- `Dockerfile.web` — Next.js web app image
- `compose.yaml` — Docker Compose for all services + Postgres
- `.env.example` — environment variable documentation
- `scripts/migrate-sqlite-to-postgres.ts` — SQLite → Postgres migration

### New Services
- `services/api/src/server.ts` — Fastify API server
- `services/api/src/routes.ts` — Route definitions
- `services/api/src/recipes.ts` — Recipe API helpers
- `services/mcp/src/app.ts` — MCP tool/resource definitions (Zod schemas)
- `services/mcp/src/http.ts` — MCP HTTP transport server
- `services/ai-gateway/src/server.ts` — LM Studio proxy

### New Packages
- `packages/contracts/src/*` — DTO types, API envelope helpers, Zod request schemas
- `packages/domain/src/index.ts` — Domain logic index export
- `packages/db/src/client.ts` — Postgres pool + Drizzle client
- `packages/db/src/schema.ts` — Postgres schema (drizzle-orm/pg-core)
- `packages/ai/src/index.ts` — AI client index export

### Modified Workspace Configs
- Root `package.json` — workspaces, scripts, dependencies
- `tsconfig.base.json` — shared TypeScript config (ES2022/bundler)
- `apps/web/package.json`, `apps/web/tsconfig.json`
- `packages/contracts/package.json`, `packages/contracts/tsconfig.json`
- `packages/domain/package.json`, `packages/domain/tsconfig.json`
- `packages/db/package.json`, `packages/db/tsconfig.json`
- `packages/ai/package.json`, `packages/ai/tsconfig.json`
- `services/api/package.json`, `services/api/tsconfig.json`
- `services/mcp/package.json`, `services/mcp/tsconfig.json`
- `services/ai-gateway/package.json`, `services/ai-gateway/tsconfig.json`

### Previously Created (Stages 1–9)
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/MCP.md`
- `docs/WORK_LOG.md`
- `docs/HANDOFF.md`
- `package.json`
- `package-lock.json`
- Next.js, TypeScript, Tailwind, ESLint, Vitest, Playwright, and Drizzle config files
- `src/app/layout.tsx` → now `apps/web/src/app/layout.tsx`
- `src/app/page.tsx` → now `apps/web/src/app/page.tsx`
- `src/app/globals.css` → now `apps/web/src/app/globals.css`
- `src/db/schema.ts` → now `packages/db/src/schema.ts`
- `src/db/client.ts` → now `packages/db/src/client.ts`
- `src/lib/domain/*` → now `packages/domain/src/`
- `src/lib/repositories/*` → now `packages/db/src/repositories/`
- `src/lib/services/*` → now `services/api/src/services/`
- `src/lib/ai/*` → now `packages/ai/src/`
- `src/app/api/**` — deleted (replaced by Fastify API service)
- `src/app/plan/page.tsx` → now `apps/web/src/app/plan/page.tsx`
- `src/app/shopping/page.tsx` → now `apps/web/src/app/shopping/page.tsx`
- `src/app/recipes/page.tsx` → now `apps/web/src/app/recipes/page.tsx`
- `src/app/recipes/[recipeId]/page.tsx` → now `apps/web/src/app/recipes/[recipeId]/page.tsx`
- `src/app/settings/page.tsx` → now `apps/web/src/app/settings/page.tsx`
- `src/components/*` → now `apps/web/src/components/`
- `src/mcp/server.ts` — merged into `services/mcp/src/app.ts` + `http.ts`
- `tests/mcp/smoke.ts` — updated for new service paths
- `recipes/*.md` — unchanged (sample recipes)

## How To Run (Post-Refactor)
### Local Development
- Install dependencies: `npm install --loglevel=warn`
- Start API dev server: `npm run dev -w @helloqwen/api` (port 3001)
- Start web dev server: `npm run dev -w @helloqwen/web` (port 3000)
- Run MCP service: `npm run start -w @helloqwen/mcp` (port 3102)
- Run AI-Gateway: `npm run start -w @helloqwen/ai-gateway` (port 8080)

### Docker Compose
```powershell
cd D:\projects\HelloQwen && docker compose up --build
```
This starts all services: api (3001), mcp (3102), ai-gateway (8080), web (3000), and postgres.

### Database Migration
After starting Postgres via Docker, run:
```powershell
npx tsx scripts/migrate-sqlite-to-postgres.ts
```
This migrates existing data from `data/helloqwen.sqlite` to the new Postgres database.

### Tests & Verification
- Run unit tests: `npm run test` (via vitest)
- Run MCP smoke test: `npx tsx tests/mcp/smoke.ts`
- Verify MCP HTTP: `npm run mcp:http-smoke`
- Production build: `npm run build` (builds all packages in order)

### Endpoints
| Service | Port | URL |
|---------|------|-----|
| Web UI | 3000 | http://localhost:3000 |
| Fastify API | 3001 | http://localhost:3001/healthz, /readyz, /api/* |
| MCP Server | 3102 | http://localhost:3102/api/mcp |
| AI Gateway | 8080 | http://localhost:8080/v1/chat/completions (proxied to LM Studio) |

## How To Resume
1. Read `docs/IMPLEMENTATION_PLAN.md`.
2. Read the latest entry in `docs/WORK_LOG.md`.
3. Continue with targeted improvements or user-requested feature changes.
4. After each stage, append to `docs/WORK_LOG.md` and update this file.

## Known Issues (Post-Refactor)
- `.git` exists but `git status` fails with `fatal: not a git repository`; do not rely on Git history for now.
- `npm install` reported 8 moderate vulnerabilities; no audit fix has been applied.
- Shopping-list generation and meal-plan generation require LM Studio to be running at the configured endpoint (proxied via AI-Gateway port 8080).
- MCP workflow tools can mutate Postgres state and some call LM Studio/Qwen. Read resources first unless explicitly intending to modify state.
- `services/mcp` HTTP endpoint is on port **3102** (not the old `localhost:3100`).
- Database has been migrated from SQLite to Postgres; the old `data/helloqwen.sqlite` file still exists for backup but is no longer used by default.
- Quantity normalization is AI-generated and currently allows readable fractional quantities such as `0.33 zucchini`; improve later if desired.
- Recipe listing cards are intentionally compact. Full ingredients and instructions live at `/recipes/[recipeId]`.

## Next Recommended Tasks (Post-Refactor)
1. **Run Docker Compose**: `docker compose up --build` to start all services with Postgres.
2. **Migrate data**: `npx tsx scripts/migrate-sqlite-to-postgres.ts` to transfer existing recipes/plans from SQLite.
3. **Update web rewrites**: Adjust `apps/web/next.config.ts` rewrite targets for production container URLs (service names instead of localhost).
4. **Add integration tests**: Test the compose stack with Playwright against all service endpoints.
5. **Add personal recipes** under `recipes/`, then use the UI or MCP tools to create a plan.

For implementation follow-up, the most useful next improvement is tighter deterministic quantity normalization before shopping-list prompting.
