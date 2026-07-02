# Indie Ops deploy guide

This guide sets up the `indie-ops` template as a one-command deploy flow on a
fresh host.

## Prereqs

- Linux or macOS host with at least **4 GB RAM**
- Docker installed and running
- A Telegram bot token from `@BotFather`
- Either:
  - an OpenCode Zen API key, or
  - a logged-in OpenCode CLI session via `opencode auth login`

> **Note:** `nanoclaw.sh` warns that Google Compute Engine hosts are not
> reliable for NanoClaw. Use a different machine.

## Environment file

Copy the example env file and fill in the public-facing setup values:

```bash
cp .env.example .env
```

Set at least:

- `TELEGRAM_BOT_TOKEN`
- `OPENCODE_PROVIDER=opencode`
- `OPENCODE_MODEL=opencode/big-pickle`
- `OPENCODE_SMALL_MODEL=opencode/big-pickle`
- `ANTHROPIC_BASE_URL=https://opencode.ai/zen/v1`

For the deploy helper, you may also set these optional host env vars:

- `INDIE_OPS_OPENCODE_ZEN_API_KEY`
- `INDIE_OPS_STRIPE_SECRET_KEY`
- `INDIE_OPS_VERCEL_API_TOKEN`

If those values are present, `deploy-indie-ops.sh` registers them in the OneCLI
vault. If they are empty, the script skips them.

## Fresh-host flow

1. Clone this fork and enter it.
2. Copy `.env.example` to `.env` and fill the values above.
3. Run the installer:

   ```bash
   bash nanoclaw.sh
   ```

4. Pick one OpenCode Zen auth path.

   ### Option A — preferred: OneCLI vault secret

   Put the Zen API key in `INDIE_OPS_OPENCODE_ZEN_API_KEY` and let the deploy
   helper register it with the correct OneCLI header:

   - host pattern: `opencode.ai`
   - header: `x-api-key`
   - value format: `{value}`

   ### Option B — `opencode auth login`

   Run the OpenCode CLI login on the host:

   ```bash
   opencode auth login
   ```

   NanoClaw mounts the provider’s per-session `opencode-xdg` directory into the
   container as `/opencode-xdg` and sets `XDG_DATA_HOME=/opencode-xdg`, so the
   logged-in OpenCode state is what the provider uses at runtime.

5. Run the deploy helper:

   ```bash
   bash deploy-indie-ops.sh
   ```

   This helper:

   - creates the `indie-ops` group from `templates/indie-ops`
   - sets the group provider to `opencode`
   - registers any OneCLI secrets whose env vars are present
   - grants the matching agent access to those secrets

6. Finish Telegram.

   If you haven’t already created the bot, do it in `@BotFather`:

   - `/newbot`
   - pick a bot name
   - pick a username ending in `bot`

   Then set `TELEGRAM_BOT_TOKEN` in `.env` and rerun `bash nanoclaw.sh` if you
   changed it after the first install.

7. Pair the Telegram chat to the `indie-ops` group:

   ```bash
   pnpm exec tsx setup/index.ts --step pair-telegram -- --intent wire-to:indie-ops
   ```

8. Wire the Telegram messaging group to the `Indie Ops` agent.

   The full chat wiring is handled by the normal NanoClaw channel flow
   (`/manage-channels`), which is the last step after pairing.

9. Send the first message to the agent.

   That wakes the container, confirms the provider wiring, and lets the agent
   schedule the default **weekday 8am briefing**.

## Troubleshooting

- **401 from Stripe, Vercel, or Zen**  
  The credential is either not granted to the agent or was registered with the
  wrong header. Re-run `bash deploy-indie-ops.sh`, confirm the env var is set,
  and make sure the OneCLI secret uses the header listed above.

- **`Unknown provider: opencode`**  
  Rebuild the agent image so the provider files and Dockerfile install are in
  the image:

  ```bash
  docker builder prune -f && ./container/build.sh
  ```

- **`onecli` or `ncl` not found**  
  Run `bash nanoclaw.sh` first. The deploy helper is intentionally post-setup
  only.
