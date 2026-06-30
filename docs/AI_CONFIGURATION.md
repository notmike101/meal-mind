# OpenAI-Compatible Provider Configuration

MealMind requires an OpenAI-compatible provider with these endpoints:

- `GET /v1/models` for model discovery.
- `POST /v1/chat/completions` for meal planning and shopping workflows.

The provider may run locally or remotely. Authentication is optional; when configured, MealMind sends an `Authorization: Bearer <token>` header. Tokens are environment-only secrets and are never stored in PostgreSQL, returned by the settings API, or entered in the web UI.

## Docker configuration

Copy `.env.example` to `.env` and configure:

```dotenv
MEALMIND_AI_BASE_URL=http://ai-gateway:8080/v1
OPENAI_COMPATIBLE_UPSTREAM_URL=http://host.docker.internal:1234
OPENAI_COMPATIBLE_API_KEY=
```

`MEALMIND_AI_BASE_URL` is the endpoint persisted when the settings row is first created. The default points the API at MealMind's gateway.

`OPENAI_COMPATIBLE_UPSTREAM_URL` is the provider origin used by the gateway. Do not include `/v1`; the gateway appends the incoming OpenAI path.

`OPENAI_COMPATIBLE_API_KEY` is optional. Set it only when the provider requires a bearer token. Never commit `.env` or a real token.

After changing environment configuration, recreate the affected containers:

```powershell
docker compose up --build -d ai-gateway api web
```

## Model selection

Open **Settings** and enter the API base URL, including `/v1`. Select **Load models**. MealMind calls the provider's `GET /models` endpoint with the server-configured token and populates the model dropdown.

If the previously configured model is not returned, MealMind requires a reported model to be selected before saving. Provider and model changes are not persisted by model discovery; select **Save** after choosing the model.

## LM Studio

LM Studio remains the default supported local provider:

```dotenv
MEALMIND_AI_BASE_URL=http://ai-gateway:8080/v1
OPENAI_COMPATIBLE_UPSTREAM_URL=http://host.docker.internal:1234
OPENAI_COMPATIBLE_API_KEY=
```

The seeded model remains `qwen3.6-35b-a3b`. Load that model in LM Studio, enable its local server, then use **Load models** in MealMind Settings.

On this development machine, Docker previously required the host's LAN address instead of `host.docker.internal`. If the gateway cannot reach LM Studio, set `OPENAI_COMPATIBLE_UPSTREAM_URL` to `http://<host-lan-ip>:1234`.

## Direct API development

When the API runs outside Docker, set its endpoint and optional token in the API process environment:

```powershell
$env:MEALMIND_AI_BASE_URL = "http://127.0.0.1:1234/v1"
$env:OPENAI_COMPATIBLE_API_KEY = ""
npm run dev:api
```

The environment endpoint only seeds a new settings row. Existing installations retain their saved endpoint and model until changed in Settings.

## Troubleshooting

- `401` or `403`: verify `OPENAI_COMPATIBLE_API_KEY`, recreate the API and gateway containers, and load models again.
- `502` or provider unreachable: verify the base URL includes `/v1`, while the gateway upstream URL does not.
- Empty or invalid catalog: the provider must return the OpenAI model-list shape `{ "data": [{ "id": "model-id" }] }`.
- Model missing: load it or enable it at the provider, reload models, and select a reported model.
- Gateway readiness failure: test `<OPENAI_COMPATIBLE_UPSTREAM_URL>/v1/models` from the gateway container's network context.
