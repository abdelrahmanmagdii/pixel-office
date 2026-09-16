#!/usr/bin/env node
/**
 * One-shot remap: bots.json (or similar) → public/agents.json
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

const DEFAULT_DESKS = [
  { col: 14, row: 17 },
  { col: 8, row: 6 },
  { col: 12, row: 6 },
  { col: 16, row: 6 },
  { col: 20, row: 6 },
  { col: 8, row: 10 },
  { col: 12, row: 10 },
  { col: 16, row: 10 },
  { col: 20, row: 10 },
  { col: 8, row: 14 },
  { col: 12, row: 14 },
];

const agents = list.map((b, i) => {
  const id = String(b.id ?? b.slug ?? `agent-${i}`).trim();
  const desk = b.desk && typeof b.desk === 'object'
    ? { col: Number(b.desk.col) || DEFAULT_DESKS[i % DEFAULT_DESKS.length].col, row: Number(b.desk.row) || DEFAULT_DESKS[i % DEFAULT_DESKS.length].row }
    : DEFAULT_DESKS[i % DEFAULT_DESKS.length];
  return {
    id,
    name: String(b.name ?? id),
    role: String(b.role ?? ''),
    color: typeof b.color === 'string' ? b.color : `#${Number(b.color ?? 0x94a3b8).toString(16).padStart(6, '0')}`,
    desk,
    ...(b.isChief ? { isChief: true } : i === 0 && b.isChief !== false ? {} : {}),
    lastTask: String(b.lastTask ?? b.task ?? 'Ready'),
    status: ['idle', 'working', 'waiting'].includes(b.status) ? b.status : 'idle',
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
  agents,
};

const outPath = path.join(root, 'public', 'agents.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');

console.log(`Wrote ${out.agents.length} agents → ${path.relative(root, outPath)} (from ${path.relative(root, inputPath) || inputPath})`);
console.log('Next: npm run build');
