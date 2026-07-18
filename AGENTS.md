# AGENTS.md

Guidance for agents contributing to MealMind.

## Sources Of Truth

Use the live repository before historical notes:

1. `AGENTS.md` for contribution policy.
2. Root and workspace `package.json` files for available commands.
3. `compose.yaml` and the service Dockerfiles for the container runtime.
4. Current source and tests for behavior and contracts.
5. `docs/AI_CONFIGURATION.md` for OpenAI-compatible provider setup.

`docs/HANDOFF.md`, `docs/WORK_LOG.md`, and implementation-plan documents are historical snapshots. They may explain why something exists, but do not treat their ports, paths, branch names, commands, or status statements as current without checking the live repository.

## Project Overview

MealMind is a local meal-planning app for trusted CookLang recipes. It generates weekly lunch/dinner plans with a configured OpenAI-compatible provider, lets the user adjust or commit the plan, creates shopping lists, and exposes web and MCP interfaces.

The npm workspace monorepo contains:

- `apps/web`: Nuxt 4/Vue SSR app and same-origin Nitro `/api/*` proxies.
- `services/api`: Fastify REST API. Owns writes, workflows, database initialization, and AI calls.
- `services/mcp`: MCP stdio and HTTP adapters over the API.
- `packages/contracts`: Shared DTOs, schemas, response types, and app errors.
- `packages/domain`: Pure domain logic for recipes, weeks, locks, pantry, portions, and shopping.
- `packages/db`: Drizzle/Postgres schema, database client, and repositories.
- `packages/ai`: OpenAI-compatible client, prompts, and response schemas.
- `recipes`: The user's local CookLang library. Recipe files are intentionally ignored by Git; only `recipes/.gitkeep` is tracked.
- `docs`: Current focused references plus historical design/handoff notes.
- `tests`: Playwright, MCP smoke, and Python recipe-generation tests.

Use the package scope `@mealmind/*`. Do not reintroduce `HelloQwen`, `helloqwen`, or `@helloqwen/*`.

## User Data And Security

- Treat `recipes/**`, recipe images, Postgres data, `.env`, and `apps/web/.env.local` as local user data.
- Never commit credentials, API keys, local environment files, database files, build/test output, `node_modules`, or ignored runtime artifacts.
- Do not delete, reset, overwrite, or stage local recipes or the Postgres volume unless the user explicitly asks.
- Never run `docker compose down -v` or otherwise remove `pg_data` without explicit approval for a data reset.
- Use explicit paths when staging in a mixed worktree. Preserve unrelated user changes and untracked files.

## Local Frontend Development

Never run the MealMind Docker or Compose stack locally. Local development is limited to the Nuxt web UI backed by the deterministic test-only mock API:

- Mocked web: `http://127.0.0.1:3100`
- Mock API: `http://127.0.0.1:3199`

Use these commands:

```bash
npm run dev:web:mock
npm run test:web
npm run test:e2e:web
```

`dev:web:mock` launches Fastify on port 3199 and Nuxt on port 3100, setting `MEALMIND_API_BASE_URL` only for the child process. Do not create or modify `.env` or `apps/web/.env.local` for the mock workflow. Mock Playwright tests reset named scenarios before every test and run with one worker.

The home server is the only integrated QA runtime. Its SSH target and checkout are `homelab-codex:/home/codex/meal-mind`, with these service endpoints:

- Web: `http://home-server:3100`
- API and health: `http://home-server:3101`, `/healthz`
- MCP HTTP and health: `http://home-server:3102/api/mcp`, `/healthz`

Do not point local frontend tests at the home server or mutate live data through browser automation. Use the local mock suite for stateful frontend coverage and use the home server for final read-only browser verification plus integrated container gates.

## Environment And Provider Configuration

The home-server Compose runtime reads `.env` overrides and otherwise uses defaults from `compose.yaml`. Important variables include:

- `DATABASE_URL`
- `MEALMIND_API_BASE_URL`
- `MEALMIND_MCP_BASE_URL`
- `MEALMIND_RECIPE_ROOT`
- `MEALMIND_DOCS_ROOT`
- `MEALMIND_AI_BASE_URL`
- `OPENAI_COMPATIBLE_API_KEY` (optional; never commit a real value)

For the home-server containers, the configured provider must be reachable from the container. Verify assumptions against `docs/AI_CONFIGURATION.md` and the live runtime, not historical handoff notes.

## Database And Startup Side Effects

Postgres is the default database. The API runs `ensureDatabase()` at startup.

- Preserve the named `pg_data` volume during rebuilds.
- A runtime schema change must update both `packages/db/src/schema.ts` and the idempotent startup DDL/migration logic in `packages/db/src/client.ts`.
- `npm run db:migrate` invokes the application's current database initialization path; generated Drizzle files alone do not change startup behavior.
- `npm run db:migrate:sqlite` remains available for legacy SQLite migration.
- Starting the API is not always a read-only probe. If automatic planning is enabled, startup triggers a planning check immediately and then every 15 minutes; it may write a plan and call the configured provider.

Prefer preserving existing data over deleting or recreating the volume.

## Common Build And Test Commands

```bash
npm install
npm run lint
npm run test
npm run test:web
npm run build
npm run test:e2e:web
npm run mcp:smoke
npm run mcp:http-smoke
npm run test:e2e
```

Run the smallest useful checks while developing, then the checks appropriate to the changed surfaces before finalizing.

## Home-Server Rebuild And Runtime Verification

All Docker commands in this section run only on `homelab-codex` from `/home/codex/meal-mind`. Do not run them on the local workstation. Rebuilding the affected production image on the home server is mandatory before final browser or runtime verification. The Compose services do not bind-mount application source, so `docker compose restart web` does not pick up UI edits.

### Choose The Rebuild Scope

| Changed area | Required rebuild |
|---|---|
| `apps/web/**`, web config, UI assets | `web` |
| `services/api/**`, `packages/domain`, `packages/db`, `packages/ai` | `api` |
| `services/mcp/**` | `mcp` |
| `packages/contracts`, root dependencies/lockfile, shared build config | `api`, `mcp`, and `web` |
| `compose.yaml`, Dockerfiles, environment/topology, cross-cutting or uncertain changes | full stack |

`recipes` and `docs` are mounted read-only into the relevant containers, so content-only changes normally do not require an image rebuild. Coupled application-code changes still do.

For a full-stack rebuild:

```bash
docker compose up -d --build --wait
docker compose ps
```

For the strongest relevant-service rebuild when its dependencies are already healthy:

```bash
docker compose build web
docker compose up -d --no-deps --force-recreate --wait web
```

Replace `web` with `api` or `mcp` as appropriate. For shared contracts or dependencies, rebuild all affected app services instead of guessing that one image is sufficient.

After every rebuild:

1. Run `docker compose ps` and confirm every expected service is running; `postgres`, `api`, and `mcp` should be healthy.
2. Check API and MCP health endpoints and load `/` on port 3100. The web service has no Compose healthcheck, so an HTTP and browser check is required.
3. Reload the page in the Browser after the new container is running. Confirm the current UI, affected routes, and interactions—not only an HTTP 200.
4. For UI work, inspect at least a representative desktop and mobile viewport, check light/dark behavior when relevant, and confirm no overflow, clipping, broken dialogs, or undersized controls.
5. Run Playwright when deterministic workflow or responsive assertions are relevant.

`playwright.config.ts` uses `reuseExistingServer: true`. On the home server, it will test whatever already owns port 3100. Rebuild and verify the Compose runtime before running the integrated `npm run test:e2e` gate from a disposable container; do not treat a green run against an unidentified server as proof of the current code.

If old code still appears on the home server or another process owns a standard port:

```bash
docker compose down
docker compose up -d --build --wait
```

Identify and stop the actual stale container/process if needed. Do not add `-v`.

Never add `-v`; preserve `pg_data` throughout every rebuild and deployment.

## Testing Expectations

- Pure/shared logic: targeted Vitest tests, then `npm run test` when appropriate.
- Type/import/workspace changes: `npm run build`.
- Formatting/lint-sensitive changes: `npm run lint`.
- Web-visible changes: run `npm run test:web`, `npm run test:e2e:web`, and local Browser inspection against the mock; then rebuild `web` on the home server and perform read-only Browser verification.
- API or database changes: build and unit-test locally without Docker, then rebuild `api` on the home server, verify `/healthz`, and run the affected integrated workflow from disposable containers.
- MCP changes: rebuild `mcp` on the home server; run `npm run mcp:smoke` and/or `npm run mcp:http-smoke` there as applicable.
- Docker, port, or environment changes: rebuild the full stack on the home server, run `docker compose ps`, check 3100/3101/3102, and inspect logs for unhealthy services.
- Recipe generation/schema work: run `uv run tests/python/test_recipe_generation.py` plus targeted `packages/domain/src/recipes.test.ts` coverage.
- Documentation-only changes: at minimum run `git diff --check` and verify every documented command/path against the repository.

Test prerequisites matter:

- MCP smoke tests require a live API and the expected local recipe catalog; HTTP smoke also requires MCP HTTP.
- Playwright may reuse an existing port 3100 server and workflows can require Postgres, local recipes, and a reachable configured provider.
- If a required check cannot run, state the concrete reason and what was verified instead.

## MCP Contract

- Resources use the `mealmind://` scheme.
- `services/mcp` calls the REST API for state and mutations; do not create a second workflow implementation inside MCP.
- Keep schemas Zod-based and compatible with `@modelcontextprotocol/sdk`.
- MCP mutating tools can change local state and may call the configured OpenAI-compatible provider. Read resources first unless the user explicitly asks for mutation.

## Code Organization Rules

- Put shared request/response types and validation in `packages/contracts`.
- Keep pure business logic in `packages/domain`; avoid DB, Fastify, Vue, or Node server concerns there.
- Keep database access in `packages/db` repositories.
- Keep AI prompting/client behavior in `packages/ai`.
- Keep workflow orchestration in `services/api/src/services`.
- Keep user-facing rendering in `apps/web`.
- Keep MCP as a protocol adapter over the API.

Prefer existing patterns before adding abstractions. Keep changes scoped to the request.

## Frontend Guidance

MealMind is a focused planning workspace, not a marketing site.

- Reuse semantic colors, design tokens, and `mm-*` utilities from `apps/web/app/assets/css/main.css` and `apps/web/tailwind.config.ts`.
- Reuse current component patterns and `@lucide/vue` icons.
- Preserve both light and dark themes, visible focus states through `.focus-ring`, reduced-motion behavior, and accessible labels.
- Keep primary touch targets at least 44px where practical.
- Avoid nested-card clutter, decorative landing-page sections, and copy that displaces useful planning information.
- Ensure long recipe names, metadata, form controls, dialogs, and planner columns do not overflow at mobile, laptop, or desktop widths.
- Use Pinia stores, existing composables, and same-origin `/api/*` proxies; do not make components call ports 3101 or 3102 directly.
- Route-backed dialogs must retain keyboard dismissal, focus restoration, body-scroll locking, and responsive behavior.
- Never judge a visual change from source alone. Inspect `http://127.0.0.1:3100` through the local mock workflow, then rebuild and inspect the home-server web container before acceptance.

## Browser Tooling

- Use the Browser plugin for quick visual inspection of localhost or public pages that do not require sign-in.
- Use Playwright MCP or Playwright tests for deterministic interaction, assertions, screenshots, and repeatable regressions.
- Use the Chrome extension only for flows that require an existing profile, cookies, login state, or extensions.
- After navigation, verify the rendered heading/current route and `html[data-mealmind-ready]` where relevant; a changed URL alone does not prove the page updated.

## Git And Pull Requests

### Current Branch Model

GitHub's default and integration branch is `main`. There is no remote `dev` branch. Do not recreate or target `dev` unless the user explicitly changes the repository workflow.

Never commit directly to `main`. Start each change from the latest remote `main`:

```bash
git switch main
git pull --ff-only origin main
git switch -c <type>/<short-description>
```

Branch naming examples:

| Type | Examples |
|---|---|
| `feature/` | `feature/dark-mode`, `feature/shopping-list` |
| `bugfix/` | `bugfix/theme-setting-location` |
| `docs/` | `docs/docker-verification` |
| `chore/` | `chore/update-deps` |

### Commits And Publishing

- Before staging, run `git status --short --branch` and inspect the diff.
- Stage only intended files; never use a broad add in a mixed worktree.
- Keep commits focused and use direct imperative messages without a trailing period.
- Make a focused commit after the smallest relevant verification passes, then push it promptly.
- For every non-trivial change, open a draft PR targeting `main` after the first verified push. Keep that PR updated and record scope, root cause, verification, and limitations.
- Mark the PR ready only after relevant checks and Docker/browser verification pass.

Before final merge, update against remote `main` if necessary:

```bash
git fetch origin
git rebase origin/main
git push --force-with-lease
```

Use `--force-with-lease` only after a rebase. Merge through the PR, then verify GitHub reports it as merged and confirm the branch tip is contained in `origin/main` before branch cleanup.

### Releases

An ordinary PR merge into `main` is not automatically a release. Create a version/tag only when the user explicitly asks to ship one.

For a release:

1. Start a release-preparation branch from current `main`.
2. Choose the SemVer increment and update the version/lockfile deliberately.
3. Run the complete relevant verification gate, including the rebuilt Docker stack and live browser checks.
4. Merge the release PR into `main`.
5. Check out/pull the resulting `main` merge commit, create an annotated `vMAJOR.MINOR.PATCH` tag on that exact commit, and push the tag.

### Git Safety

- Do not use destructive commands such as `git reset --hard`, `git checkout --`, or forced rebase variants without explicit instruction.
- Do not revert or delete user changes.
- Verify intended commit contents and the remaining worktree after every commit.

## Importing Recipes From URLs

Use the repository skill that matches the source:

- HelloFresh URLs: `.agents/skills/hellofresh-scraper/SKILL.md`
- Other public recipe URLs: `.agents/skills/import-cooklang/SKILL.md`

The import scripts write local ignored `.cook` files under `recipes/`. Validate generated recipes with the skill's validator and the relevant Python/domain tests. Do not stage imported recipe files unless the user explicitly changes the local-only recipe policy.
