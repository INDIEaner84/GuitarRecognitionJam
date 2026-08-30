# AGENTS.md — Coordination Protocol for AI Agents

This repository uses a **single source of truth** to keep AI agents and
human collaborators informed about each other's intentions before anyone
starts editing.

## The single source of truth

| What                        | Where                            | Editable by humans?        |
| --------------------------- | -------------------------------- | -------------------------- |
| Machine-readable registry   | `.agent/plans.json`              | Only via the CLI           |
| Generated human dashboard   | `docs/agent-coordination.md`     | No — run `dashboard`       |
| Protocol (this file)        | `AGENTS.md`                      | Yes, when the process changes |

**Rule 1:** `.agent/plans.json` is the authoritative source for:
- who is currently working on what,
- which files are claimed by an active plan,
- what the status of a plan is,
- which agents exist and what they own.

**Rule 2:** Never edit `.agent/plans.json` or
`docs/agent-coordination.md` by hand. Always use the CLI so the registry
stays valid and the dashboard stays in sync.

## Workflow for agents

1. **Register your agent** (once) in `.agent/plans.json` if it is not
   there already. Keep its `id`, `role`, and `owns` accurate.
2. **Announce your plan BEFORE editing anything.**

   ```bash
   node scripts/agent-coordination.mjs announce \
     --agent audio-engineer \
     --plan "Improve latency in pitch detection" \
     --area "services" \
     --files "App.tsx,constants.ts,services/" \
     --status in-progress \
     --goal "Lower latency without changing the AI analysis flow."
   ```

   The CLI refuses to announce when another active plan already claims
   the same files. Use `--force` only after you have confirmed with the
   other agent that it is safe.
3. **Check for conflicts before each commit.**

   ```bash
   node scripts/agent-coordination.mjs guard \
     --agent audio-engineer --files "App.tsx,constants.ts"
   ```

   A non-zero exit or `✋ Blocked` means another agent has an active plan
   over those files.
4. **Report status as soon as it changes.** Use
   `update --status blocked|done|released` so other agents do not wait on
   you.

   ```bash
   node scripts/agent-coordination.mjs update \
     --plan PLAN-003 --status done --note "Merged on main."
   ```
5. **Regenerate the dashboard** after any status change so the human
   readable document always matches the registry.

   ```bash
   node scripts/agent-coordination.mjs dashboard
   ```

## Plan lifecycle

| Status      | Meaning                                                        |
| ----------- | -------------------------------------------------------------- |
| `planned`   | Announced, coordinated, but work has not started yet.          |
| `in-progress` | An agent is actively editing the claimed files.              |
| `blocked`   | Stuck on a dependency or waiting on another agent.             |
| `done`      | Work is complete and verified.                                 |
| `released`  | Shipped / merged into the main branch.                         |

## File ownership expectations

- `components/` — UI and rendering.
- `services/` — external/AI services.
- `App.tsx`, `constants.ts`, `types.ts` — shared app shell, signal
  processing utilities, and shared types. These are commonly claimed by
  more than one domain, so always announce before touching them.

## Useful CLI commands

```bash
node scripts/agent-coordination.mjs status          # overview
node scripts/agent-coordination.mjs status --json   # machine-readable
node scripts/agent-coordination.mjs mine --agent <id>
node scripts/agent-coordination.mjs guard --agent <id> --files "<files>"
node scripts/agent-coordination.mjs update --plan <ID> --status done
node scripts/agent-coordination.mjs validate
node scripts/agent-coordination.mjs dashboard
```

## Guiding rule

> If another agent must know what you are about to do so they don't
> collide with you, it has already been announced in
> `.agent/plans.json` **before** a single file is changed.
