#!/usr/bin/env node
/**
 * Harmonic Scout — Agent Coordination CLI
 *
 * Single source of truth for every agent that works on this repository.
 * Agents announce their intentions and the file ranges they plan to touch
 * so that other agents can see them before they start editing.
 *
 * Usage examples:
 *   node scripts/agent-coordination.mjs status
 *   node scripts/agent-coordination.mjs announce \
 *     --agent ui-craftsman \
 *     --plan "Refine SpeedTrainer layout" \
 *     --area "components" \
 *     --files "components/SpeedTrainer.tsx,App.tsx" \
 *     --goal "Improve visual feedback without touching audio logic."
 *   node scripts/agent-coordination.mjs guard --agent ui-craftsman --files components/SpeedTrainer.tsx
 *   node scripts/agent-coordination.mjs update --plan PLAN-002 --status in-progress --note "Started."
 *   node scripts/agent-coordination.mjs dashboard
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, '.agent', 'plans.json');
const DASHBOARD_PATH = path.join(ROOT, 'docs', 'agent-coordination.md');

const ACTIVE_STATUSES = new Set(['planned', 'in-progress', 'blocked']);
const VALID_PLAN_STATUSES = new Set([
  'planned',
  'in-progress',
  'blocked',
  'done',
  'released',
]);
const VALID_AGENT_STATUSES = new Set(['active', 'available', 'away', 'idle']);

const COMMANDS = new Set([
  'announce',
  'status',
  'mine',
  'guard',
  'update',
  'delete',
  'dashboard',
  'validate',
]);

function now() {
  return new Date().toISOString();
}

function normalizePath(value) {
  return String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function normalizeFileList(value) {
  const raw = Array.isArray(value) ? value : [value ?? ''];
  return raw
    .flatMap((item) => String(item).split(','))
    .map((item) => normalizePath(item))
    .filter(Boolean);
}

/**
 * A plan "files" entry is one of:
 *  - exact path:            "App.tsx"
 *  - directory prefix:      "components/"
 *  - glob-like directory:   "components/**"   (same as prefix)
 *  - extension glob:        all 'tsx' files (match any file ending in .tsx)
 *  - any other `**` glob:   prefix/suffix match
 */
function fileMatches(pattern, file) {
  const p = normalizePath(pattern);
  const f = normalizePath(file);

  if (p === f) return true;
  if (p.startsWith('**/')) {
    return f.endsWith(p.slice(3));
  }
  if (p.endsWith('/**')) {
    const base = p.slice(0, -3);
    return f === base || f.startsWith(base);
  }
  if (p.endsWith('/')) {
    return f === p.slice(0, -1) || f.startsWith(p);
  }
  if (p.includes('**')) {
    const [before] = p.split('**');
    const after = p.split('**')[1] ?? '';
    return before && f.startsWith(before) && after && f.endsWith(after);
  }
  return false;
}

function planFilesOverlap(files, planFiles) {
  return files.some((file) =>
    planFiles.some((planFile) => fileMatches(planFile, file) || fileMatches(file, planFile)),
  );
}

function findConflicts(registry, agentId, files) {
  const normalized = files.map(normalizePath);
  const conflicts = [];

  for (const plan of registry.plans ?? []) {
    if (!ACTIVE_STATUSES.has(plan.status)) continue;
    if (plan.agent && plan.agent === agentId) continue;

    const overlapping = (plan.files ?? []).filter((planFile) =>
      normalized.some((file) => fileMatches(planFile, file) || fileMatches(file, planFile)),
    );

    if (overlapping.length > 0) {
      conflicts.push({
        plan,
        overlapping,
      });
    }
  }

  return conflicts;
}

function parseArgs(argv) {
  const command = argv[0];
  const options = {};
  const positionals = [];

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { command, options, positionals };
}

function requireFlag(options, key) {
  const value = options[key];
  if (value === undefined || value === true || value === '') {
    throw new Error(`Missing required flag --${key}.`);
  }
  return String(value);
}

async function readRegistry() {
  let raw;
  try {
    raw = await fs.readFile(REGISTRY_PATH, 'utf8');
  } catch (err) {
    throw new Error(
      `Could not read registry at ${REGISTRY_PATH}. Run the command from the repository root. (${err.message})`,
    );
  }

  const registry = JSON.parse(raw);

  if (!Array.isArray(registry.agents)) registry.agents = [];
  if (!Array.isArray(registry.plans)) registry.plans = [];

  return registry;
}

async function writeRegistry(registry) {
  registry.updatedAt = now();
  await fs.mkdir(path.dirname(REGISTRY_PATH), { recursive: true });
  await fs.writeFile(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
}

function ensureAgentExists(registry, agentId) {
  const exists = (registry.agents ?? []).some((agent) => agent.id === agentId);
  if (!exists) {
    throw new Error(
      `Agent "${agentId}" is not registered yet. Add it to .agent/plans.json first (or tell the coordinator).`,
    );
  }
  return agentId;
}

function nextPlanId(registry) {
  let max = 0;
  for (const plan of registry.plans ?? []) {
    const match = String(plan.id ?? '').match(/^PLAN-(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `PLAN-${String(max + 1).padStart(3, '0')}`;
}

function printConflicts(conflicts) {
  if (conflicts.length === 0) return;

  console.error('\n⚠️  Conflicts detected in the single source of truth:');
  for (const conflict of conflicts) {
    console.error(`  • ${conflict.plan.id} (${conflict.plan.agent}) — ${conflict.plan.title}`);
    console.error(`      wanted:   ${conflict.overlapping.join(', ')}`);
    console.error(`      current status: ${conflict.plan.status}`);
  }
  console.error('');
}

async function commandStatus() {
  const registry = await readRegistry();
  const { options } = parseArgs(process.argv.slice(2));
  const asJson = options.json === true || options.json === 'true';

  const plans = registry.plans ?? [];
  const active = plans.filter((p) => ACTIVE_STATUSES.has(p.status));

  if (asJson) {
    console.log(JSON.stringify({ agents: registry.agents, plans, active }, null, 2));
    return;
  }

  console.log('\n🎸 Harmonic Scout — Agent Coordination Status\n');
  console.log(`Single source of truth: ${REGISTRY_PATH}`);
  console.log(`Updated:               ${registry.updatedAt ?? '-'}\n`);

  console.log('AGENTS');
  console.log('------');
  for (const agent of registry.agents ?? []) {
    const agentPlans = plans.filter((p) => p.agent === agent.id);
    const agentActive = agentPlans.filter((p) => ACTIVE_STATUSES.has(p.status));
    console.log(
      `  ${agent.id.padEnd(24)} ${(agent.status ?? 'unknown').padEnd(10)} ${agentActive.length} active / ${agentPlans.length} total  — ${agent.role ?? ''}`,
    );
  }

  console.log('\nACTIVE PLANS');
  console.log('------------');
  if (active.length === 0) {
    console.log('  (none)');
  } else {
    console.log(
      `  ${'ID'.padEnd(9)} ${'AGENT'.padEnd(24)} ${'STATUS'.padEnd(11)} AREA           FILES`,
    );
    for (const plan of active) {
      console.log(
        `  ${plan.id.padEnd(9)} ${String(plan.agent).padEnd(24)} ${String(plan.status).padEnd(11)} ${String(plan.area ?? '').padEnd(15)} ${(plan.files ?? []).join(', ')}`,
      );
    }
  }

  console.log('\nALL PLANS');
  console.log('---------');
  for (const plan of plans) {
    console.log(
      `  ${plan.id.padEnd(9)} ${String(plan.agent).padEnd(24)} ${String(plan.status).padEnd(11)} ${plan.title}`,
    );
  }
  console.log('');
}

async function commandAnnounce() {
  const argv = process.argv.slice(2);
  const { options } = parseArgs(argv);

  const agentId = requireFlag(options, 'agent');
  const title = requireFlag(options, 'plan');
  const files = normalizeFileList(requireFlag(options, 'files')).filter(Boolean);

  const registry = await readRegistry();
  ensureAgentExists(registry, agentId);

  if (files.length === 0) {
    throw new Error('At least one file is required via --files (comma separated).');
  }

  const conflicts = findConflicts(registry, agentId, files);
  const force = options.force === true || options.force === 'true';

  if (conflicts.length > 0 && !force) {
    printConflicts(conflicts);
    throw new Error(
      'Refusing to announce because other active plans already claim these files. Use --force only after you have coordinated with the other agent(s).',
    );
  }

  const planId = options.id ? String(options.id) : nextPlanId(registry);
  const status = options.status ? String(options.status) : 'in-progress';

  if (!VALID_PLAN_STATUSES.has(status)) {
    throw new Error(`Invalid status "${status}". Allowed: ${[...VALID_PLAN_STATUSES].join(', ')}.`);
  }

  const plan = {
    id: planId,
    agent: agentId,
    title,
    goal: options.goal ? String(options.goal) : '',
    area: options.area ? String(options.area) : 'general',
    files,
    status,
    createdAt: now(),
    updatedAt: now(),
    dependsOn: (options.depends ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
    notes: options.note ? [String(options.note)] : [],
  };

  registry.plans.push(plan);
  await writeRegistry(registry);
  await commandDashboard();

  console.log(`\n✅ Announced ${plan.id}: "${title}"`);
  console.log(`   Agent:    ${agentId}`);
  console.log(`   Status:   ${status}`);
  console.log(`   Area:     ${plan.area}`);
  console.log(`   Files:    ${files.join(', ')}`);
  console.log(`   Conflicts: none\n`);
}

async function commandUpdate() {
  const argv = process.argv.slice(2);
  const { options } = parseArgs(argv);

  const planId = requireFlag(options, 'plan');
  const status = options.status ? String(options.status) : '';
  const note = options.note ? String(options.note) : '';
  const agent = options.agent ? String(options.agent) : undefined;

  if (status && !VALID_PLAN_STATUSES.has(status)) {
    throw new Error(`Invalid status "${status}". Allowed: ${[...VALID_PLAN_STATUSES].join(', ')}.`);
  }
  if (!status && !note) {
    throw new Error('Provide --status and/or --note to update a plan.');
  }

  const registry = await readRegistry();
  const plan = (registry.plans ?? []).find((p) => p.id === planId);

  if (!plan) {
    throw new Error(`Plan "${planId}" does not exist in the registry.`);
  }
  if (agent && plan.agent !== agent) {
    throw new Error(`Plan "${planId}" currently belongs to "${plan.agent}", not "${agent}".`);
  }

  if (status && plan.status !== status) {
    plan.status = status;
    plan.notes = [...(plan.notes ?? []), `Status changed to ${status} at ${now()}.`];
  }
  if (note) {
    plan.notes = [...(plan.notes ?? []), note];
  }

  plan.updatedAt = now();
  await writeRegistry(registry);
  await commandDashboard();

  console.log(`\n✅ Updated ${plan.id}: ${plan.status} (${plan.title})`);
  if (note) console.log(`   Note: ${note}\n`);
}

async function commandDelete() {
  const argv = process.argv.slice(2);
  const { options } = parseArgs(argv);

  const planId = requireFlag(options, 'plan');
  const agent = requireFlag(options, 'agent');
  const registry = await readRegistry();
  const plan = (registry.plans ?? []).find((p) => p.id === planId);

  if (!plan) {
    throw new Error(`Plan "${planId}" does not exist in the registry.`);
  }
  if (plan.agent !== agent) {
    throw new Error(`Plan "${planId}" belongs to "${plan.agent}", not "${agent}". Refusing to delete.`);
  }

  registry.plans = registry.plans.filter((p) => p.id !== planId);
  await writeRegistry(registry);
  await commandDashboard();

  console.log(`\n🗑️  Deleted ${planId}: "${plan.title}" from the single source of truth.\n`);
}

async function commandMine() {
  const argv = process.argv.slice(2);
  const { options } = parseArgs(argv);

  const agentId = requireFlag(options, 'agent');
  const registry = await readRegistry();
  const plans = (registry.plans ?? []).filter((p) => p.agent === agentId);

  if (plans.length === 0) {
    console.log(`\nAgent "${agentId}" has no registered plans yet.\n`);
    return;
  }

  console.log(`\nPlans for ${agentId}\n`);
  for (const plan of plans) {
    console.log(`  ${plan.id.padEnd(9)} ${String(plan.status).padEnd(11)} ${plan.title}`);
    console.log(`            files: ${(plan.files ?? []).join(', ')}`);
    if (plan.goal) console.log(`            goal: ${plan.goal}`);
  }
  console.log('');
}

async function commandGuard() {
  const argv = process.argv.slice(2);
  const { options } = parseArgs(argv);

  const agentId = requireFlag(options, 'agent');
  const files = normalizeFileList(requireFlag(options, 'files')).filter(Boolean);

  if (files.length === 0) {
    throw new Error('Provide --files to guard (comma separated).');
  }

  const registry = await readRegistry();
  const conflicts = findConflicts(registry, agentId, files);

  if (conflicts.length > 0) {
    printConflicts(conflicts);
    console.error('✋ Blocked: another agent has an active plan for one of these files.\n');
    process.exitCode = 1;
    return;
  }

  console.log(`\n✅ Guard passed for ${files.join(', ')}`);
  console.log('   No active plan from another agent claims these files.\n');
}

async function commandValidate() {
  const registry = await readRegistry();
  const errors = [];

  for (const agent of registry.agents ?? []) {
    if (!agent.id) errors.push('An agent is missing "id".');
    if (!VALID_AGENT_STATUSES.has(agent.status)) {
      errors.push(`Agent "${agent.id}" has invalid status "${agent.status}".`);
    }
  }

  for (const plan of registry.plans ?? []) {
    if (!plan.id) errors.push('A plan is missing "id".');
    if (!plan.agent) errors.push(`Plan "${plan.id}" is missing "agent".`);
    if (!plan.title) errors.push(`Plan "${plan.id}" is missing "title".`);
    if (!VALID_PLAN_STATUSES.has(plan.status)) {
      errors.push(`Plan "${plan.id}" has invalid status "${plan.status}".`);
    }
    if (!Array.isArray(plan.files)) {
      errors.push(`Plan "${plan.id}" has invalid "files" (must be an array).`);
    }
  }

  const ids = new Set();
  for (const agent of registry.agents ?? []) {
    if (agent.id && ids.has(agent.id)) {
      errors.push(`Duplicate agent id "${agent.id}".`);
    }
    if (agent.id) ids.add(agent.id);
  }

  if (errors.length > 0) {
    console.error('❌ Registry validation failed:');
    for (const error of errors) console.error(`  • ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log('✅ Registry is valid.');
}

async function commandDashboard() {
  const registry = await readRegistry();
  const plans = registry.plans ?? [];
  const agents = registry.agents ?? [];
  const active = plans.filter((p) => ACTIVE_STATUSES.has(p.status));

  const statusBadge = {
    planned: '🟡 planned',
    'in-progress': '🔵 in-progress',
    blocked: '🔴 blocked',
    done: '🟢 done',
    released: '⚪ released',
  };

  const lines = [];
  lines.push('# Agent Coordination — Dashboard');
  lines.push('');
  lines.push(
    '> Dieses Dashboard wird aus `.agent/plans.json` generiert. Es ist die **Single Source of Truth** für alle Agenten, die an diesem Repo arbeiten. Nicht von Hand editieren — stattdessen die CLI nutzen:',
  );
  lines.push('');
  lines.push('```bash');
  lines.push('node scripts/agent-coordination.mjs status');
  lines.push('node scripts/agent-coordination.mjs announce --agent <id> --plan "<Titel>" --files "<dateien>"');
  lines.push('node scripts/agent-coordination.mjs update --plan <PLAN-ID> --status done');
  lines.push('node scripts/agent-coordination.mjs dashboard');
  lines.push('```');
  lines.push('');
  lines.push(`Aktualisiert: ${registry.updatedAt ?? '-'}`);
  lines.push('');
  lines.push('## Agents');
  lines.push('');
  lines.push('| ID | Rolle | Status | Pläne aktiv/gesamt |');
  lines.push('| --- | --- | --- | --- |');
  for (const agent of agents) {
    const agentPlans = plans.filter((p) => p.agent === agent.id);
    const agentActive = agentPlans.filter((p) => ACTIVE_STATUSES.has(p.status));
    lines.push(
      `| \`${agent.id}\` | ${agent.role ?? '-'} | ${agent.status ?? '-'} | ${agentActive.length}/${agentPlans.length} |`,
    );
  }
  lines.push('');
  lines.push('## Aktive Vorhaben');
  lines.push('');
  if (active.length === 0) {
    lines.push('_Keine aktiven Vorhaben._');
  } else {
    lines.push('| Plan | Agent | Status | Bereich | Berührte Dateien |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const plan of active) {
      lines.push(
        `| \`${plan.id}\` | \`${plan.agent}\` | ${statusBadge[plan.status] ?? plan.status} | ${plan.area ?? '-'} | ${(plan.files ?? []).join(', ')} |`,
      );
    }
  }
  lines.push('');
  lines.push('## Alle Vorhaben');
  lines.push('');
  if (plans.length === 0) {
    lines.push('_Noch keine Vorhaben registriert._');
  } else {
    for (const plan of plans) {
      lines.push(`### ${plan.id} — ${plan.title}`);
      lines.push('');
      lines.push(`- **Agent:** \`${plan.agent}\``);
      lines.push(`- **Status:** ${statusBadge[plan.status] ?? plan.status}`);
      lines.push(`- **Bereich:** ${plan.area ?? '-'}`);
      lines.push(`- **Betroffene Dateien:** ${(plan.files ?? []).join(', ')}`);
      if (plan.dependsOn && plan.dependsOn.length) {
        lines.push(`- **Abhängigkeiten:** ${plan.dependsOn.join(', ')}`);
      }
      if (plan.goal) {
        lines.push('');
        lines.push(`**Ziel:** ${plan.goal}`);
      }
      if (plan.notes && plan.notes.length) {
        lines.push('');
        lines.push('**Notizen:**');
        for (const note of plan.notes) lines.push(`- ${note}`);
      }
      lines.push('');
    }
  }
  lines.push('');
  lines.push('## Workflow');
  lines.push('');
  lines.push('1. **Vor dem Editieren:** Dateibereich mit `announce` registrieren.');
  lines.push('2. **Vor dem Commit:** `guard` ausführen, um Kollisionen mit aktiven Plänen anderer Agenten zu erkennen.');
  lines.push('3. **Status melden:** `update --status blocked|done|released` verwenden, damit andere Agenten Bescheid wissen.');
  lines.push('4. **Board aktualisieren:** `dashboard` regeneriert diese Datei.');
  lines.push('');
  lines.push('## Protokoll');
  lines.push('');
  lines.push('Details: [`AGENTS.md`](../AGENTS.md)');
  lines.push('');

  await fs.mkdir(path.dirname(DASHBOARD_PATH), { recursive: true });
  await fs.writeFile(DASHBOARD_PATH, `${lines.join('\n')}\n`, 'utf8');
}

function printHelp() {
  console.log(`Harmonic Scout — Agent Coordination CLI

Single Source of Truth: .agent/plans.json
Generated dashboard:    docs/agent-coordination.md

Commands:
  announce   Register a new plan/intention for an agent.
             Required: --agent, --plan, --files
             Optional: --area, --goal, --depends, --note, --status, --id, --force
  status     Show all agents and plans (use --json for machine output).
  mine       Show all plans of one agent. Required: --agent.
  guard      Check whether files are claimed by another agent.
             Required: --agent, --files
  update     Change plan status or add a note. Required: --plan; use --status and/or --note.
  delete     Remove a plan you registered. Required: --plan and --agent.
  dashboard  Regenerate docs/agent-coordination.md.
  validate   Validate the registry schema and statuses.

Examples:
  node scripts/agent-coordination.mjs announce \\
    --agent ui-craftsman \\
    --plan "Refine SpeedTrainer layout" \\
    --area components \\
    --files "components/SpeedTrainer.tsx,App.tsx" \\
    --goal "Better visual rhythm feedback; no audio logic changes."

  node scripts/agent-coordination.mjs guard --agent ui-craftsman --files "components/SpeedTrainer.tsx"
  node scripts/agent-coordination.mjs update --plan PLAN-002 --status done --note "Merged on main."
  node scripts/agent-coordination.mjs dashboard
`);
}

async function main() {
  const { command } = parseArgs(process.argv.slice(2));

  if (!command || command === 'help' || command === '--help') {
    printHelp();
    return;
  }
  if (!COMMANDS.has(command)) {
    printHelp();
    throw new Error(`Unknown command "${command}".`);
  }

  switch (command) {
    case 'announce':
      await commandAnnounce();
      break;
    case 'status':
      await commandStatus();
      break;
    case 'mine':
      await commandMine();
      break;
    case 'guard':
      await commandGuard();
      break;
    case 'update':
      await commandUpdate();
      break;
    case 'delete':
      await commandDelete();
      break;
    case 'dashboard':
      await commandDashboard();
      console.log(`\n✅ Dashboard written to ${DASHBOARD_PATH}\n`);
      break;
    case 'validate':
      await commandValidate();
      break;
  }
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}\n`);
  process.exitCode = 1;
});
