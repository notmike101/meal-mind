# OpenAI-Compatible Provider Configuration

MealMind connects directly to an OpenAI-compatible provider:

- `GET /v1/models` for model discovery.
- `POST /v1/chat/completions` for meal planning and shopping workflows.

The provider may run locally or remotely. Authentication is optional; when configured, MealMind sends an `Authorization: Bearer <token>` header. Tokens are environment-only secrets and are never stored in PostgreSQL, returned by the settings API, or entered in the web UI.

## Docker configuration

Copy `.env.example` to `.env` and configure a direct provider URL including `/v1`:

```dotenv
MEALMIND_AI_BASE_URL=http://host.docker.internal:1234/v1
OPENAI_COMPATIBLE_API_KEY=
```

`MEALMIND_AI_BASE_URL` is persisted when the settings row is first created. Existing installations that still contain the removed `http://ai-gateway:8080/v1` default are migrated to the configured direct URL during API startup.

`OPENAI_COMPATIBLE_API_KEY` is optional. Set it only when the provider requires a bearer token. Never commit `.env` or a real token.

After changing environment configuration, recreate the API and web containers:

```powershell
docker compose up --build -d api web
```

## Model selection

Open **Settings** and enter the provider API base URL, including `/v1`. Select **Load models**. MealMind calls the provider's `/models` endpoint directly with the server-configured token and populates the model dropdown.

If the previously configured model is not returned, MealMind requires a reported model to be selected before saving. Provider and model changes are not persisted by model discovery; select **Save** after choosing a reported model.

## LM Studio

LM Studio remains the supported local provider:

```dotenv
MEALMIND_AI_BASE_URL=http://host.docker.internal:1234/v1
OPENAI_COMPATIBLE_API_KEY=
```

The seeded model remains `qwen3.6-35b-a3b`. Load that model in LM Studio and enable its local server before using **Load models** in MealMind Settings.

If Docker cannot reach `host.docker.internal`, set `MEALMIND_AI_BASE_URL` to `http://<host-lan-ip>:1234/v1` instead.

## Direct API development

When the API runs outside Docker, set its endpoint and optional token in the API process environment:

```powershell
$env:MEALMIND_AI_BASE_URL = "http://127.0.0.1:1234/v1"
$env:OPENAI_COMPATIBLE_API_KEY = ""
npm run dev:api
```

## Troubleshooting

- `401` or `403`: verify `OPENAI_COMPATIBLE_API_KEY` and load models again.
- `502` or provider unreachable: verify the direct base URL includes `/v1` and is reachable from the API container.
- Empty or invalid catalog: the provider must return `{ "data": [{ "id": "model-id" }] }`.
- Model missing: load it or enable it at the provider, reload models, and select a reported model.
