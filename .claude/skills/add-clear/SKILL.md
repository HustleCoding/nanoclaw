---
name: add-clear
description: Add /clear as a thin alias for Claude Code's built-in /compact command. Main-group or device-owner only.
---

# Add /clear Command

Adds a `/clear` session command that forwards to Claude Code's built-in `/compact` slash command.

Semantics:

- keeps the same logical session
- preserves summarized context
- does not delete session files or SQLite rows
- only main-group or device-owner can use it

## Phase 1: Pre-flight

Check if the command is already present:

```bash
rg -n "Failed to compact conversation|/compact|findSessionCommand" src container/agent-runner/src
```

If present, skip to Phase 3.

## Phase 2: Apply Code Changes

Merge the skill branch:

```bash
git fetch upstream skill/clear
git merge upstream/skill/clear
```

This adds:

- `src/session-commands.ts` for parsing `/clear` and mapping it to `/compact`
- `container/agent-runner/src/index.ts` handling for slash-command output
- `src/index.ts` forwarding logic and auth checks

### Validate

```bash
npm test
npm run build
cd container/agent-runner && npm run build
```

## Phase 3: Verify

1. Start NanoClaw in dev mode: `npm run dev`
2. From the main group, send exactly: `/clear`
3. Verify:
   - the bot acknowledges compaction
   - the session continues on the next normal message
4. From a non-main group as a non-admin user, send `@<assistant> /clear`
5. Verify:
   - the bot replies `Session commands require admin access.`
6. From a non-main group with `requiresTrigger` enabled, send bare `/clear`
7. Verify:
   - no denial message is sent
   - the command is consumed silently
