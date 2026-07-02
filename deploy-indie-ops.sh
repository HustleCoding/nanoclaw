#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

die() {
  echo "deploy-indie-ops: $*" >&2
  exit 1
}

require_tool() {
  command -v "$1" >/dev/null 2>&1 || die "$1 not found on PATH. Run bash nanoclaw.sh first."
}

json_group_id() {
  node -e '
    const fs = require("fs");
    const input = fs.readFileSync(0, "utf8");
    const doc = JSON.parse(input);
    const rows = Array.isArray(doc.data) ? doc.data : [];
    const row = rows.find((item) =>
      item && typeof item === "object" &&
      (item.folder === "indie-ops" || item.name === "Indie Ops"),
    );
    if (row && typeof row.id === "string") process.stdout.write(row.id);
  '
}

json_response_id() {
  node -e '
    const fs = require("fs");
    const input = fs.readFileSync(0, "utf8");
    const doc = JSON.parse(input);
    const data = doc.data;
    if (data && typeof data === "object" && !Array.isArray(data) && typeof data.id === "string") {
      process.stdout.write(data.id);
    } else if (Array.isArray(data) && data[0] && typeof data[0].id === "string") {
      process.stdout.write(data[0].id);
    }
  '
}

secret_exists() {
  local secret_id
  secret_id="$(secret_id_for "$1" "$2")"
  [ -n "$secret_id" ]
}

secret_id_for() {
  local host_pattern="$1"
  local header_name="$2"

  local secrets_json
  secrets_json="$(onecli secrets list 2>/dev/null)" || die "onecli secrets list failed. Make sure OneCLI is running, then rerun."

  printf '%s' "$secrets_json" | node -e '
    const fs = require("fs");
    const hostPattern = process.argv[1];
    const headerName = process.argv[2].toLowerCase();
    const doc = JSON.parse(fs.readFileSync(0, "utf8"));
    const rows = Array.isArray(doc.data) ? doc.data : [];
    const found = rows.find((item) => {
      if (!item || typeof item !== "object") return false;
      const itemHost = String(item.hostPattern ?? item.host_pattern ?? "");
      const itemHeader = String(item.headerName ?? item.header_name ?? "").toLowerCase();
      return itemHost === hostPattern && itemHeader === headerName;
    });
    if (found && typeof found.id === "string") process.stdout.write(found.id);
  ' "$host_pattern" "$header_name"
}

register_secret_if_present() {
  local env_var="$1"
  local secret_name="$2"
  local host_pattern="$3"
  local header_name="$4"
  local value_format="$5"

  local value="${!env_var:-}"
  if [ -z "$value" ]; then
    echo "Skipping ${secret_name}: ${env_var} is not set."
    return 0
  fi

  if secret_exists "$host_pattern" "$header_name"; then
    echo "Already registered: ${secret_name} (${host_pattern} / ${header_name})."
    return 0
  fi

  echo "Registering: ${secret_name}"
  onecli secrets create \
    --name "$secret_name" \
    --type generic \
    --value "$value" \
    --host-pattern "$host_pattern" \
    --header-name "$header_name" \
    --value-format "$value_format" >/dev/null
}

merge_secret_ids() {
  tr ',' '\n' | awk 'NF && !seen[$0]++ { out = out ? out "," $0 : $0 } END { print out }'
}

main() {
  require_tool onecli
  require_tool ncl
  require_tool node

  # 1) Register runtime secrets when the caller provided values.
  register_secret_if_present \
    INDIE_OPS_OPENCODE_ZEN_API_KEY \
    "OpenCode Zen" \
    "opencode.ai" \
    "x-api-key" \
    "{value}"

  register_secret_if_present \
    INDIE_OPS_STRIPE_SECRET_KEY \
    "Stripe API Secret Key" \
    "api.stripe.com" \
    "Authorization" \
    "Bearer {value}"

  register_secret_if_present \
    INDIE_OPS_VERCEL_API_TOKEN \
    "Vercel API Token" \
    "api.vercel.com" \
    "Authorization" \
    "Bearer {value}"

  # 2) Stamp the Indie Ops template if needed.
  local group_json
  group_json="$(ncl groups list --json 2>/dev/null)" || die "ncl groups list failed. Run bash nanoclaw.sh first."

  local group_id
  group_id="$(printf '%s' "$group_json" | json_group_id)" || die "Could not parse ncl groups list output."

  if [ -z "$group_id" ]; then
    echo "Stamping Indie Ops template group."
    local create_json
    create_json="$(ncl groups create --template indie-ops --name "Indie Ops" --json 2>/dev/null)" || {
      die "ncl groups create --template indie-ops failed"
    }
    group_id="$(printf '%s' "$create_json" | json_response_id)" || die "Could not parse ncl groups create output."
  fi

  [ -n "$group_id" ] || die "Could not determine the Indie Ops group id."

  echo "Using group id: $group_id"

  # 3) Point the group at the OpenCode provider.
  ncl groups config update --id "$group_id" --provider opencode --json >/dev/null 2>&1 || {
    die "ncl groups config update --id $group_id --provider opencode failed"
  }

  # 4) Grant the matching OneCLI secrets to the agent identity for this group.
  local agent_json agent_id current_secret_ids merged_secret_ids new_secret_ids
  agent_json="$(onecli agents list 2>/dev/null)" || die "onecli agents list failed. Make sure the service has spawned the agent once, then rerun."
  agent_id="$(printf '%s' "$agent_json" | node -e '
    const fs = require("fs");
    const groupId = process.argv[1];
    const doc = JSON.parse(fs.readFileSync(0, "utf8"));
    const rows = Array.isArray(doc.data) ? doc.data : [];
    const agent = rows.find((item) => item && typeof item === "object" && item.identifier === groupId);
    if (agent && typeof agent.id === "string") process.stdout.write(agent.id);
  ' "$group_id")" || die "Could not parse onecli agents list output."

  if [ -z "$agent_id" ]; then
    die "No OneCLI agent exists yet for $group_id. Start the group once, then rerun this script so the vault permissions can be applied."
  fi

  local current_secrets_json
  current_secrets_json="$(onecli agents secrets --id "$agent_id" 2>/dev/null)" || die "onecli agents secrets --id $agent_id failed."
  current_secret_ids="$(printf '%s' "$current_secrets_json" | node -e '
    const fs = require("fs");
    const doc = JSON.parse(fs.readFileSync(0, "utf8"));
    const rows = Array.isArray(doc.data) ? doc.data : [];
    process.stdout.write(rows.map(String).join(","));
  ')" || die "Could not parse onecli agents secrets output."

  new_secret_ids=""
  local secret_id
  secret_id="$(secret_id_for "opencode.ai" "x-api-key")"
  if [ -n "$secret_id" ]; then
    new_secret_ids="${new_secret_ids:+${new_secret_ids},}$secret_id"
  fi
  secret_id="$(secret_id_for "api.stripe.com" "Authorization")"
  if [ -n "$secret_id" ]; then
    new_secret_ids="${new_secret_ids:+${new_secret_ids},}$secret_id"
  fi
  secret_id="$(secret_id_for "api.vercel.com" "Authorization")"
  if [ -n "$secret_id" ]; then
    new_secret_ids="${new_secret_ids:+${new_secret_ids},}$secret_id"
  fi

  if [ -n "$new_secret_ids" ]; then
    merged_secret_ids="$(printf '%s,%s' "$current_secret_ids" "$new_secret_ids" | merge_secret_ids)"
    echo "Granting OneCLI secret access to agent $agent_id."
    onecli agents set-secrets --id "$agent_id" --secret-ids "$merged_secret_ids" >/dev/null
  else
    echo "No matching OneCLI secrets were found to grant."
  fi

  cat <<'EOF'

Manual steps left:
  1. Create or confirm the Telegram bot in @BotFather.
  2. Set TELEGRAM_BOT_TOKEN in your .env and rerun bash nanoclaw.sh if needed.
  3. Pair the chat:
       pnpm exec tsx setup/index.ts --step pair-telegram -- --intent wire-to:indie-ops
  4. Wire the Telegram messaging group to the Indie Ops agent if it is not already wired.
  5. Send one message to the agent so it can schedule the weekday 8am briefing.
EOF
}

main "$@"
