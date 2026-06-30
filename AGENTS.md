# AGENTS.md

Guidance for agents contributing to MealMind.

## Project Overview

MealMind is a local meal-planning app for trusted CookLang recipes. It generates weekly lunch/dinner plans with a local OpenAI-compatible model, lets the user adjust or commit the plan, creates shopping lists, and exposes both web and MCP interfaces.

The repo is an npm workspace monorepo:

- `apps/web`: Nuxt 4/Vue app. User-facing SSR UI and Nitro `/api/*` proxies.
- `services/api`: Fastify REST API. Owns writes, workflows, DB initialization, and AI calls.
- `services/mcp`: MCP stdio/HTTP server. Uses the API instead of importing DB/domain write logic directly.
- `services/ai-gateway`: Fastify proxy from containers to LM Studio/OpenAI-compatible local model.
- `packages/contracts`: Shared DTOs, schemas, API response types, and app errors.
- `packages/domain`: Pure domain logic: recipes, weeks, locks, pantry, portions, shopping helpers.
- `packages/db`: Drizzle/Postgres schema, DB client, and repositories.
- `packages/ai`: OpenAI-compatible client, prompts, and response schemas.
- `recipes`: Trusted CookLang `.cook` recipe fixtures/data.
- `docs`: Implementation, handoff, MCP, and work-log notes.
- `tests`: Playwright e2e and MCP smoke tests.

Use the package scope `@mealmind/*`. Do not reintroduce `HelloQwen`, `helloqwen`, or `@helloqwen/*`.

## Local Ports And Services

Standard local ports:

- Web: `http://127.0.0.1:3100`
- API: `http://127.0.0.1:3101`
- MCP HTTP: `http://127.0.0.1:3102/api/mcp`
- AI gateway: `http://127.0.0.1:3103`
- Postgres host port: `54320`

Docker Compose service names:

- `postgres`
- `api`
- `mcp`
- `web`
- `ai-gateway`

Container names may still include the old directory-derived Compose project prefix if the checkout folder is named `HelloQwen`. Treat that as a Compose naming artifact, not an application name.

## Common Commands

Install/update workspace links:

```bash
npm install
```

Run the full local dev pair:

```bash
npm run dev
```

Run individual services:

```bash
npm run dev:api
npm run dev:web
npm run mcp
```

Build and verify:

```bash
npm run lint
npm run test
npm run build
npm run mcp:smoke
npm run mcp:http-smoke
npm run test:e2e
```

Run the Docker stack:

```bash
docker compose up --build
```

If ports are occupied by an old app stack, stop it first:

```bash
docker compose down
```

The user has explicitly approved killing existing local connections when rebuilding is needed so standard ports can be reused.

## Environment

Copy `.env.example` for Docker/local env defaults when needed. Key variables:

- `DATABASE_URL`
- `MEALMIND_API_BASE_URL`
- `MEALMIND_MCP_BASE_URL`
- `MEALMIND_RECIPE_ROOT`
- `MEALMIND_DOCS_ROOT`
- `MEALMIND_AI_BASE_URL`
- `LM_STUDIO_URL`

For Docker, LM Studio may need a LAN-reachable host URL rather than `host.docker.internal`. Check `docs/HANDOFF.md` before changing AI connectivity assumptions.

Do not commit local `.env`, `apps/web/.env.local`, SQLite data, build output, test output, `node_modules`, or other ignored local artifacts.

## Security

- Never commit `.env`, `apps/web/.env.local`, API keys, or credentials.
- Copy from `.env.example` for Docker/local env defaults.

## Database Notes

Postgres is the default runtime database. The API calls `ensureDatabase()` at startup.

The default Compose DB is `mealmind` with user/password `mealmind`. If an old persistent volume was initialized before the app rename, the DB/role may need migration to the `mealmind` role/database before the API can start. Prefer preserving data over deleting volumes unless the user explicitly asks for a reset.

SQLite migration support remains in:

```bash
npm run db:migrate:sqlite
```

The default legacy SQLite path is `data/mealmind.sqlite`.

## MCP Contract

MCP is available both as stdio and HTTP:

```bash
npm run mcp
npm run mcp:http-smoke
```

Primary HTTP endpoint when the app stack is running:

```text
http://127.0.0.1:3102/api/mcp
```

Important conventions:

- MCP resources use the `mealmind://` scheme.
- `services/mcp` should call the REST API for app state and mutations.
- Keep MCP schemas Zod-based and compatible with `@modelcontextprotocol/sdk`.
- MCP mutating tools can change local app state and may call LM Studio/Qwen. Read resources first unless the user explicitly asks for mutation.

## Code Organization Rules

- Put shared request/response types and validation in `packages/contracts`.
- Keep pure business logic in `packages/domain`; avoid DB, Fastify, Vue, or Node server concerns there.
- Keep DB access in `packages/db` repositories.
- Keep AI prompting/client behavior in `packages/ai`.
- Keep workflow orchestration in `services/api/src/services`.
- Keep user-facing rendering in `apps/web`.
- Keep MCP as a protocol adapter over the API, not a second workflow implementation.

Prefer existing patterns before adding new abstractions. Keep changes scoped to the request.

## Frontend Guidance

The app is a work-focused planning tool. Keep UI quiet, dense, and usable rather than marketing-like.

- Use existing Tailwind styles and component patterns.
- Use `@lucide/vue` icons where appropriate.
- Do not create a landing page for app work; keep the first screen useful.
- Avoid nested cards and large decorative sections.
- Ensure text does not overflow on mobile or desktop.
- For visual changes, inspect the page at `http://127.0.0.1:3100`.

## Browser And Verification Tooling

Use the Browser plugin for quick visual inspection of localhost or public pages that do not require sign-in.

Use Playwright MCP or Playwright tests when the task needs deterministic browser interaction, assertions, screenshots, or repeatable repro/verification steps.

Use the Chrome extension only for flows that depend on login state, cookies, extensions, or an existing browser profile.

When testing localhost after code or build changes, reload the page and verify current rendered output. If a stale container owns the port, stop it and rebuild rather than inspecting the old page.

## Testing Expectations

Run the smallest useful checks during development, then broaden before finalizing:

- Shared logic changes: `npm run test`
- Type/import/workspace changes: `npm run build`
- Formatting/lint-sensitive edits: `npm run lint`
- Web-visible changes: Browser plugin or `npm run test:e2e`
- MCP changes: `npm run mcp:smoke` and/or `npm run mcp:http-smoke`
- Docker/port/env changes: `docker compose up --build -d` and `docker compose ps`

If you cannot run a relevant check, state why in the final response.

## Git Practices

### Branching

All development must branch off `dev`. Never commit directly to `dev` or `main`:

```bash
# From dev, create a new feature, fix, docs, or chore branch
git checkout dev
git pull origin dev
git checkout -b <type>/<short-description>
```

The `main` branch is reserved for releases. Do not branch ordinary development work from it or merge feature, bugfix, docs, or chore branches directly into it.

Branch naming convention:

| Type | Examples |
|------|----------|
| `feature/` | `feature/dark-mode`, `feature/shopping-list` |
| `bugfix/` | `bugfix/theme-setting-location` |
| `docs/` | `docs/git-practices` |
| `chore/` | `chore/update-deps` |

### Committing

- Commit regularly at natural milestones — after a passing test, a working feature, or a logical unit of work. Do not let changes accumulate for hours without a commit.
- Keep commits focused: one concern per commit.
- Use direct, descriptive commit messages (imperative mood, no trailing period).
- Before committing, always check `git status --short --branch` to confirm what will be included.

### Pushing and Merging

Push branches frequently so work is backed up and reviewable:

```bash
git push -u origin <branch-name>
```

When the work on a branch is complete and verified:

1. Rebase onto latest `dev` if needed: `git rebase dev`.
2. Push: `git push origin <branch-name> --force-with-lease` (after rebase).
3. Merge back into `dev` via a PR or, for local-only work:

```bash
git checkout dev
git pull origin dev
git merge --no-ff <branch-name> -m "Merge branch '<branch-name>' into dev"
git push origin dev
```

### Releases

Merges into `main` are reserved for releases:

1. Confirm `dev` contains the complete, verified release candidate.
2. Choose the next [Semantic Versioning](https://semver.org/) version: increment `MAJOR` for incompatible changes, `MINOR` for backward-compatible features, or `PATCH` for backward-compatible fixes.
3. Open and merge a release PR from `dev` into `main`. Do not merge individual development branches into `main`.
4. Create an annotated `vMAJOR.MINOR.PATCH` tag on the resulting `main` merge commit and push it:

```bash
git checkout main
git pull origin main
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

### Safety Rules

- Do not use destructive git commands (`git reset --hard`, `git checkout --`, `git rebase --force`) without explicit instruction.
- Do not revert user changes unless explicitly asked.
- If committing, include only intended files and verify the worktree afterward.

## Importing recipes from URLs

To convert external recipe pages into CookLang `.cook` files, use the import skill:

    cd D:\meal-mind && uv run .agents/skills/import-cooklang/scripts/import-recipe.py "https://example.com/recipe" recipes

The script extracts Recipe JSON-LD (90%+ of sites), falls back to DOM scraping, and writes valid `.cook` files with metadata. See the skill for details: `.agents/skills/import-cooklang/SKILL.md`.

---

## Current Known Good Verification Set

After the MealMind rename, these checks passed:

```bash
npm run lint
npm run test
npm run build
npm run mcp:smoke
npm run mcp:http-smoke
npm run test:e2e
```

The rebuilt Compose stack also served `MealMind` at `http://127.0.0.1:3100` with no visible `HelloQwen` text.
