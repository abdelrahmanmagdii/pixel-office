/**
 * Roster adapters: turn a platform's bot/agent export into the canonical
 * agent records that parseOfficeConfig() understands (see SCHEMA.md).
 *
 * To support a new platform, add an adapter to ADAPTERS. `detect` should be
 * cheap and specific; the first match wins, `canonical` is the fallback.
 */
export type RawRecord = Record<string, unknown>;

export interface RosterAdapter {
  name: string;
  detect: (data: unknown) => boolean;
  /** Returns canonical-shaped records (id, name, role, status, lastTask, …). */
  toAgents: (data: unknown) => RawRecord[];
}

const isObj = (v: unknown): v is RawRecord => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;
const records = (v: unknown): RawRecord[] => (Array.isArray(v) ? v.filter(isObj) : []);

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'agent'
  );
}

/** Map common field names from agent platforms onto the canonical record. */
export function normalizeRecord(r: RawRecord): RawRecord {
  const name = str(r.name) ?? str(r.displayName) ?? str(r.display_name) ?? str(r.title);
  const id = str(r.id) ?? str(r.slug) ?? str(r.key) ?? (name ? slugify(name) : undefined);
  const role = str(r.role) ?? str(r.description) ?? str(r.purpose) ?? '';
  return {
    ...r,
    id,
    name,
    role: role.length > 120 ? `${role.slice(0, 117)}…` : role,
    status: r.status ?? r.state,
    lastTask:
      str(r.lastTask) ??
      str(r.last_task) ??
      str(r.task) ??
      str(r.currentTask) ??
      str(r.current_task) ??
      str(r.summary) ??
      '',
    isChief: r.isChief ?? r.is_chief ?? r.lead,
  };
}

/** Native format: `{ agents: [...] }`, `{ bots: [...] }` or a bare array. */
const canonical: RosterAdapter = {
  name: 'canonical',
  detect: () => true,
  toAgents: (data) => {
    if (Array.isArray(data)) return records(data).map(normalizeRecord);
    if (!isObj(data)) return [];
    const list = data.agents ?? data.bots ?? (isObj(data.team) ? data.team.members : undefined);
    return records(list).map(normalizeRecord);
  },
};

export const ADAPTERS: RosterAdapter[] = [canonical];

export function adaptRoster(data: unknown): RawRecord[] {
  const hinted = isObj(data) ? str(data.adapter) : undefined;
  const adapter =
    (hinted && ADAPTERS.find((a) => a.name === hinted)) ||
    ADAPTERS.find((a) => a.detect(data)) ||
    canonical;
  return adapter.toAgents(data);
}
