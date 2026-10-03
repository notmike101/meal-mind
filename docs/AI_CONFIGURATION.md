# OpenAI-Compatible Provider Configuration

MealMind's API server connects to the provider; the browser never calls the provider directly. Configure the provider in **Settings**, then save it for meal planning, swaps, and shopping workflows.

## Configure in Settings

1. Enter an HTTP(S) **API base URL**, including the provider's API prefix, for example `https://provider.example/v1` or `http://host.docker.internal:1234/v1`. Do not include a query string, fragment, or username/password in the URL.
2. Configure the optional **API key** as described below.
3. Select **Load models** to discover model IDs, or enter a model ID manually.
4. Select **Save** to persist the endpoint, credentials, and model. Model discovery alone does not save changes.

MealMind appends `/models` for discovery and `/chat/completions` for generation to the base URL. Include the provider's full API prefix, but not either of those endpoint suffixes.

### Keep, replace, or remove the API key

- **Keep:** leave the password field blank when saving the same endpoint. The existing credential is retained. Settings responses never return the saved key, so the field remains blank after reload; the authentication status indicates whether a credential is configured.
- **Replace:** enter a key and save. It replaces the existing credential and is sent as `Authorization: Bearer <key>`.
- **Remove:** select **Remove API key** and save. This explicitly disables authentication, including the environment-key fallback.
- **Change endpoint:** changing the URL without entering a replacement key clears the old credential and disables the environment fallback. **Load models** also does not send the old credential to an unsaved different endpoint. Enter a replacement key if the new provider requires one.

`OPENAI_COMPATIBLE_API_KEY` is a legacy fallback only while the database credential is unset (`NULL`). A saved replacement, explicit removal, or endpoint change overrides that fallback. A blank password field does not mean “remove.”

### Model discovery is optional

**Load models** asks the API server to fetch the configured provider's `/models` endpoint using the applicable credential. A discoverable catalog has the shape `{ "data": [{ "id": "model-id" }] }`.

A failed or empty catalog, or a model missing from the catalog, does not prevent saving a manually entered model ID. The model still needs to exist at the provider and support the generation API below.

## Compatibility

Providers must support OpenAI-compatible `POST /chat/completions` with a model ID and standard system/user messages, and return usable final text containing the JSON requested by MealMind. MealMind does not require Qwen-specific options, a particular model allowlist, temperature, `response_format`, or a token cap.

An image-only or embedding-only model is not suitable. A provider offering only a nonstandard API, rather than compatible chat completions, is not supported merely because it exposes model IDs. Model discovery succeeding does not prove generation compatibility.

## Credentials and deployment safety

Saved API keys are stored **in plaintext in local PostgreSQL**. Database administrators and anyone with access to database files or backups can read them. Protect those files and backups as secrets. Keys are omitted from settings GET/PATCH responses and redacted from AI event logs and public errors; this does not encrypt their database storage.

This configuration is intended for a **trusted-local deployment**, not an unrestricted public service. Anyone able to use the settings frontend/API can configure an endpoint and a billable credential. Restrict access to the web app, API, and database; use HTTPS when accessing MealMind remotely and for remote provider connections. The default Compose port mappings are not an access-control boundary. Do not expose them publicly without appropriate restrictions. Never commit `.env` or a real key.

## Docker configuration and networking

Run the integrated Compose stack only on `homelab-codex` in `/home/codex/meal-mind`, never on the local workstation. In that home-server checkout, copy `.env.example` to `.env` only if `.env` does not already exist; otherwise edit the existing file without overwriting its secrets. The environment supplies the initial endpoint and optional legacy key fallback:

```dotenv
MEALMIND_AI_BASE_URL=http://host.docker.internal:1234/v1
OPENAI_COMPATIBLE_API_KEY=
```

`MEALMIND_AI_BASE_URL` seeds the settings row on first creation. Saved endpoints are preserved at API startup, including the legacy `http://ai-gateway:8080/v1` endpoint. Change an existing endpoint in **Settings**; environment changes do not replace it or re-enable an explicitly removed credential.

After changing environment configuration, rebuild the home-server stack while preserving the named `pg_data` volume:

```bash
ssh homelab-codex
cd /home/codex/meal-mind
docker compose up -d --build --wait
docker compose ps
```

Never use `docker compose down -v` or remove the database volume. API startup can run automatic planning and call the configured provider when that feature is enabled.

The provider must be reachable from the **home-server API container**, not just from the browser. `compose.yaml` maps `host.docker.internal` to that server's host gateway, not the workstation running the browser. A provider such as LM Studio running on the home server can use `http://host.docker.internal:1234/v1`; inside the container, `127.0.0.1` refers to the container itself. For a provider on another machine, or if the host gateway is unreachable, use `http://<provider-host-lan-ip>:1234/v1` in Settings and check the provider's listening address and firewall.

LM Studio is one local-provider option, not a requirement. Load the selected model and enable its compatible server. The seeded model ID is `qwen3.6-35b-a3b`; change it in Settings to the model your provider serves.

## Mock frontend development

Local development is limited to the frontend with the deterministic test-only mock API, without a live provider or database. Do not create or modify `.env` or `apps/web/.env.local` for this workflow:

```powershell
npm run dev:web:mock
```

This starts the mock API at `http://127.0.0.1:3199` and the web app at `http://127.0.0.1:3100`. The mock frontend browser suite is:

```powershell
npm run test:e2e:web
```

Mocks exercise the frontend flow, not real provider compatibility or authentication.

## Troubleshooting

- **401 or 403:** check the key and authentication status in Settings. An explicit removal disables `OPENAI_COMPATIBLE_API_KEY`; enter a replacement if authentication is required.
- **502 or provider unreachable:** verify the base URL includes the correct API prefix and is reachable from the API process/container. Check the provider listener, firewall, and HTTPS configuration.
- **Empty, invalid, or unavailable catalog:** enter the model ID manually. Discovery expects `{ "data": [{ "id": "model-id" }] }`, but is not required for saving.
- **Model missing or generation failing:** load/enable the model at the provider and verify chat-completion support and usable final JSON text. Selecting an image/embedding model or a nonstandard provider API will not make it compatible.
