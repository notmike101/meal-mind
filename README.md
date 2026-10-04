# MealMind

MealMind is a local-first, AI-assisted meal-planning application for people with a library of trusted [CookLang](https://cooklang.org/) recipes. It generates weekly lunch and dinner plans using an OpenAI-compatible provider, lets you adjust and commit those plans, and turns them into shopping lists. Use the web workspace or connect an AI client through MCP (Model Context Protocol).

Recipes and application state stay in your recipe directory and PostgreSQL database. AI workflows send relevant recipe and planning information to the configured provider; use a local provider if you want that processing to remain local too. MealMind is intended for a trusted-local deployment, not an unrestricted public service.

[Local development](#local-development) · [Full-stack deployment](#running-the-full-stack) · [Provider setup](docs/AI_CONFIGURATION.md) · [Contributing](#contributing) · [Issues](https://github.com/notmike101/meal-mind/issues)

## Features and everyday workflow

1. **Bring your recipes.** Keep trusted `.cook` files in `recipes/` and browse the catalog through **Recipes**. The repository does not ship a recipe collection: only `recipes/.gitkeep` is tracked, and local recipe files are ignored by Git.
2. **Configure planning.** In **Settings**, choose an OpenAI-compatible API base URL, optional API key, model, and planning preferences. Model discovery is optional; a model ID can be entered manually. See [provider configuration](docs/AI_CONFIGURATION.md).
3. **Plan a week.** In **Plan**, select a week and generate a plan from your library, or create a blank plan and add meals yourself. Lunch/dinner planning is supported; meal slot labels are optional and free-form.
4. **Adjust the draft.** Change recipes, dates, labels, and servings, ask the AI to pick a replacement, or remove meals before committing.
5. **Commit and shop.** Commit the plan to lock it, then use the **Shopping** tab for the plan's shopping list and item completion. Pantry staples and portions inform shopping generation. Current-week meals can be marked done or skipped.

The web app provides a weekly planning workspace, recipe details, shopping, and settings. MCP exposes the same API-owned workflows to compatible clients; it is not a separate planning implementation. Inspect resources before invoking tools that change state or call the provider.

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | Nuxt 4, Vue 3, server-side rendering, Pinia, Tailwind CSS, Lucide icons |
| Backend | Fastify REST API; same-origin Nitro `/api/*` proxies in the web app |
| Persistence | PostgreSQL 17, Drizzle ORM, idempotent database initialization |
| AI | OpenAI-compatible chat-completion providers |
| Agent interface | MCP stdio and Streamable HTTP adapters |
| Runtime | Docker and Docker Compose for the integrated home-server stack |
| Tests | Vitest for shared/frontend logic, Playwright browser tests, MCP smoke tests, Python recipe tests |
| Workspace | npm monorepo using TypeScript, Vue, Python, CSS, and Dockerfiles |

## Project structure

```text
apps/web/           Nuxt frontend, components, stores, and Nitro API proxies
services/api/       Fastify routes, workflows, database startup, and AI orchestration
services/mcp/       MCP stdio and HTTP adapters over the REST API
packages/contracts/ Shared DTOs, Zod schemas, response types, and application errors
packages/domain/    Pure recipe, week, lock, pantry, portion, and shopping logic
packages/db/        Drizzle schema, database client, and repositories
packages/ai/        OpenAI-compatible client, prompts, and response schemas
recipes/            Local ignored CookLang library and recipe assets
scripts/            Mock launcher, recipe utilities, and migration tools
docs/               Focused references and historical design/handoff documents
tests/              Playwright, deterministic mock API, MCP, and Python tests
```

Shared packages use the `@mealmind/*` scope. Business logic belongs in `packages/domain`, persistence in `packages/db`, workflow orchestration in `services/api`, and rendering in `apps/web`.

## Local development

Local workstation development uses **only the Nuxt UI with the deterministic test-only mock API**. Do not run Docker or Compose locally, start the integrated API locally, or point stateful frontend tests at the home server.

### Prerequisites

- Git, **Node.js 24**, and **npm 11** are the recommended baseline, matching the production container family. The repository does not declare an `engines` minimum. Local mock verification also runs on Node.js 26/npm 11.
- Playwright's Chromium browser for browser tests; install it with the command below.
- Docker is **not needed** for the local mock workflow. The full stack requires Docker Engine and a Compose plugin supporting `docker compose up --wait`; the home server has been checked with Engine 29.8.1 and Compose 5.5.1. These are verified versions, not declared minimums.
- Python and `uv` are needed only for the recipe-generation test command in [Testing](#testing), not to start the mocked web app.

### Install and start

```bash
git clone https://github.com/notmike101/meal-mind.git
cd meal-mind
npm ci
npx playwright install chromium
npm run dev:web:mock
```

Open <http://127.0.0.1:3100>. The launcher starts the mock API at <http://127.0.0.1:3199> and sets `MEALMIND_API_BASE_URL` only for its Nuxt child process. No database, recipe library, credentials, or live AI provider is required. Do not create or edit `.env` or `apps/web/.env.local` for this workflow.

Mock data is deterministic and test-only; changes do not represent production data or prove provider compatibility. Browser tests reset named scenarios through the mock's `/__mock/reset` endpoint before every test and use one worker.

### Run frontend checks

```bash
npm run test:web
npm run test:e2e:web
```

**Stop the manual mock dev server before `test:e2e:web`.** Its Playwright configuration starts its own server and sets `reuseExistingServer: false`; ports 3100 and 3199 must be free. Unit tests do not need a running server.

If Chromium is missing, run `npx playwright install chromium`. If startup reports a port conflict, stop the process that owns the mock ports rather than redirecting tests to production. The root `npm run dev` command starts the real API and is not the approved local workflow.

## Running the full stack

The integrated runtime is the home server at SSH target `homelab-codex`, with checkout `/home/codex/meal-mind`. Run all Docker commands there, never on the local workstation. For a new checkout, clone the repository into that path first; an existing checkout should be updated through the reviewed contribution workflow.

### Configure and launch

```bash
ssh homelab-codex
cd /home/codex/meal-mind
# Create an initial environment file only when none exists.
test -e .env || cp .env.example .env
```

Review the existing `.env` without overwriting secrets, supply your trusted CookLang library in the home-server `recipes/` directory, and configure a provider reachable from the API container. Then, on the home server:

```bash
docker compose config --quiet
docker compose up -d --build --wait
docker compose ps
```

Startup initializes the database. If automatic planning is enabled, API startup also immediately checks whether to generate a plan, can write state and call the provider, and repeats the check every 15 minutes. Starting or rebuilding the API is therefore not necessarily a read-only operation.

### Configuration and defaults

[`.env.example`](.env.example) lists the environment names, but **[`compose.yaml`](compose.yaml) determines which values containers actually receive**. A name in `.env` does not override a literal Compose value.

| Variable | Current Compose behavior |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Interpolated for PostgreSQL; default to `mealmind`. Protect credentials and keep them consistent with the API connection URL. |
| `DATABASE_URL` | API receives the literal `postgres://mealmind:mealmind@postgres:5432/mealmind`. Changing only `.env` does not override it. If changing database credentials/topology, update the Compose API URL consistently. |
| `MEALMIND_API_BASE_URL` | Web and MCP receive the literal internal URL `http://api:3001`. |
| `MEALMIND_MCP_BASE_URL` | Web receives the literal internal URL `http://mcp:3002`. |
| `MEALMIND_RECIPE_ROOT` | API receives `/app/recipes`, backed by the read-only `./recipes` mount. |
| `MEALMIND_DOCS_ROOT` | API and MCP receive `/app/docs`, backed by the read-only `./docs` mount. |
| `MEALMIND_AI_BASE_URL` | Interpolated; defaults to `http://host.docker.internal:1234/v1`. Seeds the initial saved endpoint, not an existing endpoint. |
| `OPENAI_COMPATIBLE_API_KEY` | Optional interpolated legacy fallback, default empty; used only while the database credential is unset. |

Change the saved provider endpoint, model, and credential in **Settings**. Include the API prefix (such as `/v1`), not `/models` or `/chat/completions`. A provider must support chat completions returning usable final JSON text. `host.docker.internal` means the **home server's** host gateway; `127.0.0.1` inside the API container means that container, not your workstation.

Saved API keys are stored **in plaintext in PostgreSQL**. Protect database access and backups. An explicitly removed key or endpoint change can disable the environment-key fallback; environment changes do not replace saved settings. Read [AI_CONFIGURATION.md](docs/AI_CONFIGURATION.md) for keep/replace/remove behavior and troubleshooting.

### Endpoints and health

| Service | Home-server endpoint |
| --- | --- |
| Web workspace | <http://home-server:3100> |
| REST API | <http://home-server:3101> |
| API health | <http://home-server:3101/healthz> |
| MCP Streamable HTTP | <http://home-server:3102/api/mcp> |
| MCP health | <http://home-server:3102/healthz> |
| PostgreSQL host port | `54320` (container port `5432`) |

The web app also proxies MCP at `http://home-server:3100/api/mcp`. Container-to-container traffic uses the internal service names and ports shown above, not the host's 3100/3101/3102 mappings.

After a rebuild, confirm all services are running, with PostgreSQL, API, and MCP healthy. Check both health URLs, load the web root, and reload the affected pages in a browser. Web has no Compose healthcheck. Application source is not bind-mounted: a restart alone does not load code changes. See [AGENTS.md](AGENTS.md#home-server-rebuild-and-runtime-verification) for the affected-service rebuild matrix and integrated gates.

Default port mappings listen beyond loopback; they are **not access controls**. Restrict access to the web app, API, MCP, and database. Use HTTPS for remote access and remote providers. Do not expose the stack publicly without appropriate protections.

### Database initialization and data preservation

The API runs `ensureDatabase()` at startup. Runtime schema changes must update both `packages/db/src/schema.ts` and the idempotent initialization logic in `packages/db/src/client.ts`. `npm run db:migrate` invokes that initialization path; `npm run db:generate` alone does not apply runtime schema changes. `npm run db:migrate:sqlite` is available for legacy SQLite migration, not the normal PostgreSQL startup path.

Run database commands only in an intentionally configured integrated environment, not against production as a casual probe. The named `pg_data` volume holds persistent state. **Never run `docker compose down -v` or delete that volume without explicit approval for a data reset.** Preserve local recipes, images, `.env`, and database backups during updates.

## MCP integration

Connect a Streamable HTTP client to `http://home-server:3102/api/mcp`, or use the web proxy at `http://home-server:3100/api/mcp`. The `npm run mcp` script starts the stdio adapter in an environment configured to reach the real API; it is not part of the local mock workflow.

Resources use the `mealmind://` scheme, including `mealmind://recipes`, `mealmind://plans/current`, and `mealmind://shopping/current`. Tools support recipe inspection, plan generation and editing, commitment, and shopping generation. Mutating tools change database state and may call a billable provider; inspect resources first and invoke mutations only when intended.

[docs/MCP.md](docs/MCP.md) contains the resource/tool catalog and client examples. Its local real-API startup example is not the approved workstation workflow; use the home-server endpoints and local mock instructions in this README and [AGENTS.md](AGENTS.md).

## Testing

Run commands from the repository root with dependencies installed. Choose checks for the surface you changed:

| Command | Purpose and prerequisites |
| --- | --- |
| `npm run test:web` | Frontend Vitest tests; no server required. |
| `npm run test:e2e:web` | Deterministic mocked browser workflows; Chromium installed, mock ports free. Starts and stops its own server. |
| `npm run test` | Shared/application Vitest suite. |
| `npm run lint` | ESLint checks. |
| `npm run build` | Builds shared workspaces, API, MCP, and Nuxt. |
| `npm run test:e2e` | Integrated Playwright gate on the home server after rebuilding and identifying the runtime on port 3100; use a disposable test container. Not the local mock suite. |
| `npm run mcp:smoke` | Stdio MCP smoke; requires a live API and expected recipe catalog. |
| `npm run mcp:http-smoke` | HTTP MCP smoke; also requires the running MCP HTTP endpoint. |
| `uv run tests/python/test_recipe_generation.py` | Recipe-generation/schema tests; use for recipe tooling changes alongside targeted domain recipe tests. |

Integrated checks belong on the home server. Do not assume a green integrated Playwright result identifies the right runtime: its configuration can reuse a server already listening on port 3100. Mock tests verify frontend behavior, not real provider authentication, PostgreSQL persistence, or full-stack integration.

For documentation-only changes, check Markdown whitespace with `git diff --check` and verify documented paths and commands against the live repository. See [testing expectations](AGENTS.md#testing-expectations) for the complete contribution gates.

## Contributing

Start with [AGENTS.md](AGENTS.md). It defines contribution policy, runtime boundaries, security rules, verification, and publishing requirements for both people and agents.

- Use live sources in this order: `AGENTS.md`, root/workspace `package.json`, `compose.yaml` and Dockerfiles, current source/tests, then the provider reference. Historical plans are context, not current configuration.
- Work on a dedicated `feature/`, `bugfix/`, `docs/`, or `chore/` branch created from the latest remote `main`. Do not work directly on `main` or reuse an unrelated branch. There is no remote `dev` branch.
- Keep changes focused, reuse existing patterns, use `@mealmind/*`, and preserve the domain/database/API/UI separation. Frontend changes must preserve accessibility, light/dark themes, mobile layouts, and existing design tokens.
- Treat `recipes/**`, recipe images, `.env`, `apps/web/.env.local`, PostgreSQL data, and backups as user data. Never commit credentials, local environment files, ignored recipes, or generated runtime artifacts. Preserve unrelated changes and untracked files; stage explicit paths.
- Run the smallest useful checks, then the relevant surface gates. UI work requires local mock browser inspection and a rebuilt home-server web image with read-only browser verification. API/MCP and shared changes have their own container gates.
- Make focused commits, push promptly, and open a PR targeting `main`. Merge only through a PR after independent AI approval and a human approving GitHub review for the current head commit. [MERGE_GATE.md](docs/MERGE_GATE.md) defines the approval format. Do not create release tags unless a release was explicitly requested.

For a clean checkout, start a documentation branch with:

```bash
git switch main
git pull --ff-only origin main
git switch -c docs/short-description
```

If you already have work in progress, preserve it before switching branches. Report bugs and propose changes in [GitHub issues](https://github.com/notmike101/meal-mind/issues).

## Documentation map

| Reference | Use it for |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Current contribution policy, local mock workflow, rebuild scopes, test gates, and data safety. |
| [AI_CONFIGURATION.md](docs/AI_CONFIGURATION.md) | Provider compatibility, settings, credentials, container networking, and troubleshooting. |
| [MERGE_GATE.md](docs/MERGE_GATE.md) | Required independent AI and human approvals for the current PR head. |
| [MCP.md](docs/MCP.md) | MCP resources, tools, and client examples; follow current runtime policy rather than its local startup example. |
| [docs/](docs/) | Additional focused references and design context. |
| [HANDOFF.md](docs/HANDOFF.md), [WORK_LOG.md](docs/WORK_LOG.md), [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Historical snapshots. Verify their commands, ports, paths, branches, and status against live sources before using them. |
| [package.json](package.json), [compose.yaml](compose.yaml) | Available commands and actual service configuration. |

If you want to try the interface, start with the [local mock](#local-development). If you want to use your own recipes and provider, follow [full-stack deployment](#running-the-full-stack) and [provider setup](docs/AI_CONFIGURATION.md). If you want to contribute, follow [AGENTS.md](AGENTS.md) and open a PR.
