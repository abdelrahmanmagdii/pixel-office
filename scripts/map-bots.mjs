#!/usr/bin/env node
/**
 * One-shot remap: bots.json (or similar) → public/agents.json
 * Schema: see SCHEMA.md.
 * Usage:
 *   node scripts/map-bots.mjs [input.json]
 *   node scripts/map-bots.mjs bots.example.json
 * Default input: bots.json (falls back to bots.example.json)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const inputArg = process.argv[2];
const candidates = inputArg
  ? [path.resolve(process.cwd(), inputArg)]
  : [path.join(root, 'bots.json'), path.join(root, 'bots.example.json')];

let inputPath = null;
for (const p of candidates) {
  if (fs.existsSync(p)) {
    inputPath = p;
    break;
  }
}

if (!inputPath) {
  console.error('No input found. Pass a JSON path or create bots.json / bots.example.json');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const list = Array.isArray(raw.agents)
  ? raw.agents
  : Array.isArray(raw.bots)
    ? raw.bots
    : Array.isArray(raw)
      ? raw
      : null;

if (!list || !list.length) {
  console.error('Input must contain a non-empty "bots" or "agents" array (or be an array).');
  process.exit(1);
}

// Desks are optional: the office auto-assigns free desks and grows the floor for big teams.
const STATUS = {
  working: ['working', 'busy', 'running', 'active', 'in_progress', 'thinking', 'executing'],
  waiting: ['waiting', 'blocked', 'pending', 'needs_input', 'awaiting_input', 'awaiting_approval', 'queued', 'paused'],
};
const status = (s) => {
  const v = String(s ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return STATUS.working.includes(v) ? 'working' : STATUS.waiting.includes(v) ? 'waiting' : 'idle';
};
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'agent';

const agents = list.map((b, i) => {
  const name = String(b.name ?? b.displayName ?? b.title ?? b.id ?? `Agent ${i + 1}`);
  const id = String(b.id ?? b.slug ?? slug(name)).trim();
  const desk = b.desk && Number.isInteger(b.desk.col) && Number.isInteger(b.desk.row)
    ? { col: b.desk.col, row: b.desk.row }
    : undefined;
  return {
    id,
    name,
    role: String(b.role ?? b.description ?? ''),
    ...(b.color !== undefined
      ? { color: typeof b.color === 'string' ? b.color : `#${Number(b.color).toString(16).padStart(6, '0')}` }
      : {}),
    ...(desk ? { desk } : {}),
    ...(b.isChief ? { isChief: true } : {}),
    ...(typeof b.sprite === 'string' ? { sprite: b.sprite } : {}),
    lastTask: String(b.lastTask ?? b.task ?? b.summary ?? 'Ready'),
    status: status(b.status ?? b.state),
    ...(Array.isArray(b.workingLines) && b.workingLines.length
      ? { workingLines: b.workingLines.filter((x) => typeof x === 'string') }
      : {}),
  };
});

// First entry with isChief, or mark first as chief if none set
if (!agents.some((a) => a.isChief)) {
  agents[0].isChief = true;
}

const out = {
  officeTitle: String(raw.officeTitle ?? 'Pixel Office'),
  subtitle: String(raw.subtitle ?? 'Your agent floor — click an agent for details'),
  ...(typeof raw.feed === 'string' ? { feed: raw.feed } : {}),
  ...(Number.isFinite(raw.pollSeconds) ? { pollSeconds: raw.pollSeconds } : {}),
  agents,
};

const outPath = path.join(root, 'public', 'agents.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');

console.log(`Wrote ${out.agents.length} agents → ${path.relative(root, outPath)} (from ${path.relative(root, inputPath) || inputPath})`);
console.log('Next: npm run build');
