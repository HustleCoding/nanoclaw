# Indie Ops template

A solo-founder operations assistant for a portfolio of small SaaS products.
Watches Stripe (revenue) and Vercel (deployments), sends a concise daily briefing
over Telegram, and flags only what needs a human decision.

## Stamp it

```bash
ncl groups create --template indie-ops --name "Indie Ops"
```

Then point it at the OpenCode provider:

```bash
ncl groups config update --id <group-id> --provider opencode
```

(`deploy-indie-ops.sh` at the repo root does both, plus vault + secret wiring.)

## Runtime credentials (OneCLI vault)

The agent calls APIs with plain `curl`; OneCLI injects the auth header per request,
so no key ever lives in `.env` or the container. Register these once:

| API | host-pattern | header |
|-----|-------------|--------|
| Stripe | `api.stripe.com` | `Authorization: Bearer <sk_...>` |
| Vercel | `api.vercel.com` | `Authorization: Bearer <token>` |
| OpenCode Zen | `opencode.ai` | `x-api-key: <key>` |

See `docs/indie-ops-deploy.md` for the exact `onecli secrets create` commands and
the full end-to-end deploy.

## Anatomy

- `context/instructions.md` — the agent's standing persona and briefing playbook
  (required; also marks this folder as a template).

No provider, model, or secrets live in the template — those are set on the group
at deploy time.
