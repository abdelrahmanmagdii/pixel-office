import { BUILTIN_AGENT_IDS, WAITING_ALIASES, WORKING_ALIASES } from './agents';
import { bossSeatForRows, DESK_COLS, overlapsSeat } from './seats.js';

const STATUSES = new Set(['idle', ...WORKING_ALIASES, ...WAITING_ALIASES]);
const HEX = /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

export type RosterValidation = { ok: true } | { ok: false; error: string };

/** Parse roster JSON and check the fields SCHEMA.md describes. */
export function validateRosterText(text: string): RosterValidation {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Invalid JSON: ${message}` };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Roster must be a JSON object with an "agents" array. See SCHEMA.md.' };
  }
  const obj = data as Record<string, unknown>;
  const errors: string[] = [];
  if (obj.officeTitle !== undefined && typeof obj.officeTitle !== 'string') errors.push('officeTitle must be a string.');
  if (obj.subtitle !== undefined && typeof obj.subtitle !== 'string') errors.push('subtitle must be a string.');
  if (obj.poster !== undefined && typeof obj.poster !== 'string') errors.push('poster must be a string.');
  if (obj.feed !== undefined && (typeof obj.feed !== 'string' || !/^https?:\/\//.test(obj.feed))) {
    errors.push('feed must be an http(s) URL.');
  }
  if (obj.pollSeconds !== undefined && (typeof obj.pollSeconds !== 'number' || obj.pollSeconds < 5)) {
    errors.push('pollSeconds must be a number of at least 5.');
  }
  if (!Array.isArray(obj.agents)) {
    errors.push('agents must be an array.');
  } else if (obj.agents.length === 0) {
    errors.push('agents must contain at least one agent.');
  } else {
    const ids = new Set<string>();
    let chiefs = 0;
    const staff = obj.agents.filter((raw) => !(raw && typeof raw === 'object' && (raw as { isChief?: boolean }).isChief === true)).length;
    const rows = Math.max(3, Math.ceil(staff / DESK_COLS.length));
    const boss = bossSeatForRows(rows);
    obj.agents.forEach((raw, i) => {
      const where = `agents[${i}]`;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        errors.push(`${where} must be an object.`);
        return;
      }
      const a = raw as Record<string, unknown>;
      if (typeof a.id !== 'string' || !a.id.trim()) errors.push(`${where}.id must be a non-empty string.`);
      else if (ids.has(a.id)) errors.push(`${where}.id "${a.id}" is duplicated.`);
      else ids.add(a.id);
      if (typeof a.name !== 'string' || !a.name.trim()) errors.push(`${where}.name must be a non-empty string.`);
      if (a.role !== undefined && typeof a.role !== 'string') errors.push(`${where}.role must be a string.`);
      if (a.color !== undefined && (typeof a.color !== 'string' || !HEX.test(a.color))) {
        errors.push(`${where}.color must be a hex color.`);
      }
      if (a.desk !== undefined) {
        const d = a.desk as { col?: unknown; row?: unknown };
        const col = d && typeof d === 'object' ? d.col : undefined;
        const row = d && typeof d === 'object' ? d.row : undefined;
        if (!Number.isInteger(col) || !Number.isInteger(row)) {
          errors.push(`${where}.desk must be { col, row } with integer col and row.`);
        } else if (a.isChief !== true && overlapsSeat({ col: col as number, row: row as number }, boss)) {
          errors.push(`${where}.desk overlaps the boss desk at (${boss.col}, ${boss.row}).`);
        }
      }
      if (a.isChief !== undefined && typeof a.isChief !== 'boolean') errors.push(`${where}.isChief must be true or false.`);
      if (a.isChief === true) chiefs += 1;
      if (a.lastTask !== undefined && typeof a.lastTask !== 'string') errors.push(`${where}.lastTask must be a string.`);
      if (a.status !== undefined) {
        const status = typeof a.status === 'string' ? a.status.trim().toLowerCase().replace(/[\s-]+/g, '_') : '';
        if (!STATUSES.has(status)) errors.push(`${where}.status must be idle, working, or waiting (or a known alias).`);
      }
      if (a.sprite !== undefined && (typeof a.sprite !== 'string' || !BUILTIN_AGENT_IDS.includes(a.sprite))) {
        errors.push(`${where}.sprite must be one of: ${BUILTIN_AGENT_IDS.join(', ')}.`);
      }
      if (a.workingLines !== undefined) {
        if (!Array.isArray(a.workingLines) || a.workingLines.some((line) => typeof line !== 'string')) {
          errors.push(`${where}.workingLines must be an array of strings.`);
        }
      }
    });
    if (chiefs > 1) errors.push('Only one agent can have isChief: true.');
  }
  if (errors.length) return { ok: false, error: errors.slice(0, 8).join('\n') };
  return { ok: true };
}
