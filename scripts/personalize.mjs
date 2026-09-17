#!/usr/bin/env node
/**
 * Personalize the office roster from a list of names or a JSON object.
 * Usage:
 *   node scripts/personalize.mjs <input.txt> [officeTitle]
 *
 * The input is either:
 *   - one agent name per line (the first line becomes the Chief), or
 *   - a JSON object matching SCHEMA.md (an `agents[]` or `bots[]` array).
 *
 * Writes public/agents.json. See SCHEMA.md for the field definitions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DESKS = [
  { col: 14, row: 17 }, // chief / boss desk
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

const PALETTE = [
  '#60a5fa', '#38bdf8', '#fb923c', '#f87171', '#34d399',
  '#a78bfa', '#2dd4bf', '#4ade80', '#f472b6', '#facc15', '#22d3ee',
];

const KNOWN_IDS = ['cos', 'github', 'linkedin', 'x', 'reddit', 'gmail', 'travel', 'deal', 'flight', 'optimizer', 'swe'];

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'agent';
}

function fromNames(names) {
  return names.map((raw, i) => {
    const name = String(raw).trim();
    return {
      id: slugify(name),
      name,
      role: '',
      color: PALETTE[i % PALETTE.length],
      desk: DESKS[i % DESKS.length],
      isChief: i === 0,
      lastTask: 'Ready',
      status: 'idle',
    };
  });
}

function fromJson(data) {
  const list = Array.isArray(data.agents)
    ? data.agents
    : Array.isArray(data.bots)
      ? data.bots
      : Array.isArray(data)
        ? data
        : null;
  if (!list || !list.length) {
    throw new Error('JSON must contain a non-empty "agents" or "bots" array, or be an array.');
  }
  return list.map((b, i) => ({
    id: String(b.id ?? b.slug ?? `agent-${i}`).trim(),
    name: String(b.name ?? b.id ?? `agent-${i}`),
    role: String(b.role ?? ''),
    color: typeof b.color === 'string'
      ? b.color
      : `#${Number(b.color ?? 0x94a3b8).toString(16).padStart(6, '0')}`,
    desk: b.desk && typeof b.desk === 'object'
      ? { col: Number(b.desk.col) || DESKS[i % DESKS.length].col, row: Number(b.desk.row) || DESKS[i % DESKS.length].row }
      : DESKS[i % DESKS.length],
    isChief: Boolean(b.isChief) || (i === 0 && b.isChief !== false),
    lastTask: String(b.lastTask ?? b.task ?? 'Ready'),
    status: ['idle', 'working', 'waiting'].includes(b.status) ? b.status : 'idle',
    ...(Array.isArray(b.workingLines) && b.workingLines.length
      ? { workingLines: b.workingLines.filter((x) => typeof x === 'string') }
      : {}),
  }));
}

function writeOut(officeTitle, agents) {
  if (!agents.length) {
    console.error('No agents produced. Pass at least one name or a JSON list.');
    process.exit(1);
  }
  const out = {
    officeTitle,
    subtitle: 'Your agent floor — click an agent for details',
    agents,
  };
  const outPath = path.join(root, 'public', 'agents.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${agents.length} agents -> public/agents.json (title: ${officeTitle})`);

  const missing = agents.filter((a) => !KNOWN_IDS.includes(a.id)).map((a) => a.id);
  if (missing.length) {
    console.warn(`Note: these ids reuse the fallback sprite: ${missing.join(', ')}`);
    console.warn('Add public/assets/characters/agent-<id>.png to give one its own look.');
  }
}

function main() {
  const fileArg = process.argv[2];
  const title = process.argv[3] || 'Pixel Office';
  if (!fileArg) {
    console.error('Usage: node scripts/personalize.mjs <input.txt> [officeTitle]');
    process.exit(1);
  }
  const raw = fs.readFileSync(fileArg, 'utf8').replace(/^\uFEFF/, '').trim();

  if (!raw) {
    writeOut(title, []);
    return;
  }

  if (raw.startsWith('{') || raw.startsWith('[')) {
    const data = JSON.parse(raw);
    const cfgTitle = data && typeof data === 'object' && !Array.isArray(data) && typeof data.officeTitle === 'string'
      ? data.officeTitle.trim()
      : title;
    writeOut(cfgTitle, fromJson(data));
    return;
  }

  const names = raw.split('\n').map((s) => s.trim()).filter(Boolean);
  writeOut(title, fromNames(names));
}

main();
