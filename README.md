<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1gO0A24r1hXV--dg9UZRPvIhzaW-JpmSZ

## Agent Coordination (Single Source of Truth)

This repository has a built-in coordination layer so multiple agents can
work in parallel without stepping on each other.

- **Machine-readable source of truth:** `.agent/plans.json`
- **Human dashboard:** `docs/agent-coordination.md`
- **Protocol for agents:** `AGENTS.md`
- **CLI:** `scripts/agent-coordination.mjs`

Agents must announce their files before editing and check for conflicts
before committing:

```bash
node scripts/agent-coordination.mjs announce \
  --agent ui-craftsman \
  --plan "Refine SpeedTrainer layout" \
  --area components \
  --files "components/SpeedTrainer.tsx,App.tsx"

node scripts/agent-coordination.mjs guard \
  --agent ui-craftsman --files "components/SpeedTrainer.tsx"

node scripts/agent-coordination.mjs update --plan PLAN-002 --status done
node scripts/agent-coordination.mjs status
node scripts/agent-coordination.mjs dashboard
```

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
