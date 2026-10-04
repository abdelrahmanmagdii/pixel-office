import { adaptRoster } from './adapters';

export type AgentStatus = 'idle' | 'working' | 'waiting';

export interface AgentDef {
  id: string;
  name: string;
  role: string;
  color: number;
  /** Desk / stand tile on main floor. Chief uses BOSS_DESK stand when isChief. */
  desk: { col: number; row: number };
  /** If true, Chief — stands at boss desk by default (no private office). */
  isChief?: boolean;
  lastTask: string;
  status: AgentStatus;
  /** Role-specific lines for the working state. Falls back to a per-id map, then a shared pool. */
  workingLines?: string[];
  /** Built-in look to wear (one of BUILTIN_AGENT_IDS). Defaults to the id, then a stable pick. */
  sprite?: string;
  /** True when the roster gave no desk; the layout picks one. */
  autoDesk?: boolean;
}

export interface OfficeConfig {
  officeTitle: string;
  subtitle: string;
  agents: AgentDef[];
  /** Live feed URL to poll for roster snapshots (same JSON shape). */
  feed?: string;
  /** Poll interval in seconds. */
  pollSeconds?: number;
}

const FALLBACK_AGENTS: AgentDef[] = [
  {
    id: 'cos',
    name: 'Chief',
    role: 'Coordinates the floor and priorities',
    color: 0xf59e0b,
    desk: { col: 14, row: 14 },
    isChief: true,
    lastTask: 'Synced weekly team priorities',
    status: 'working',
  },
  {
    id: 'github',
    name: 'Engineer',
    role: 'Builds features and keeps CI healthy',
    color: 0x60a5fa,
    desk: { col: 8, row: 3 },
    lastTask: 'Triaged open pull requests',
    status: 'working',
  },
  {
    id: 'linkedin',
    name: 'Designer',
    role: 'UI polish, layouts, and visual craft',
    color: 0x38bdf8,
    desk: { col: 12, row: 3 },
    lastTask: 'Refined desk-label hierarchy',
    status: 'idle',
  },
  {
    id: 'x',
    name: 'Support',
    role: 'Answers questions and unblocks teammates',
    color: 0x71717a,
    desk: { col: 16, row: 3 },
    lastTask: 'Queued three support replies',
    status: 'waiting',
  },
  {
    id: 'reddit',
    name: 'Sales',
    role: 'Outreach, demos, and pipeline follow-ups',
    color: 0xfb923c,
    desk: { col: 20, row: 3 },
    lastTask: 'Waiting on tone check for outreach',
    status: 'waiting',
  },
  {
    id: 'gmail',
    name: 'Ops',
    role: 'Inbox triage, scheduling, and logistics',
    color: 0xf87171,
    desk: { col: 8, row: 7 },
    lastTask: 'Cleared shared inbox; two drafts pending',
    status: 'working',
  },
  {
    id: 'travel',
    name: 'Analyst',
    role: 'Research, reports, and itinerary planning',
    color: 0x34d399,
    desk: { col: 12, row: 7 },
    lastTask: 'Compiled weekly options brief',
    status: 'idle',
  },
  {
    id: 'deal',
    name: 'Marketing',
    role: 'Campaigns, copy, and opportunity spotting',
    color: 0xa78bfa,
    desk: { col: 16, row: 7 },
    lastTask: 'Flagged a renewal window for review',
    status: 'working',
  },
  {
    id: 'flight',
    name: 'Research',
    role: 'Monitors signals and schedule changes',
    color: 0x2dd4bf,
    desk: { col: 20, row: 7 },
    lastTask: 'Alert: interesting signal next Thursday',
    status: 'idle',
  },
  {
    id: 'optimizer',
    name: 'Product',
    role: 'Tunes workflows, routing, and priorities',
    color: 0x4ade80,
    desk: { col: 8, row: 11 },
    lastTask: 'Tuned overnight queue routing',
    status: 'working',
  },
  {
    id: 'swe',
    name: 'Builder',
    role: 'Maintains this pixel office experience',
    color: 0xf472b6,
    desk: { col: 12, row: 11 },
    lastTask: 'Shipped desks and pathfinding',
    status: 'idle',
  },
];

export const DEFAULT_OFFICE: OfficeConfig = {
  officeTitle: 'Pixel Office',
  subtitle: 'Your agent floor — click an agent for details',
  agents: FALLBACK_AGENTS,
};

/** Mutable roster — replaced by loadOfficeConfig() before Phaser boots. */
export let AGENTS: AgentDef[] = [...FALLBACK_AGENTS];

/** Mutable office chrome strings. */
export let officeTitle = DEFAULT_OFFICE.officeTitle;
export let officeSubtitle = DEFAULT_OFFICE.subtitle;

export function setOfficeConfig(cfg: OfficeConfig): void {
  officeTitle = cfg.officeTitle || DEFAULT_OFFICE.officeTitle;
  officeSubtitle = cfg.subtitle || DEFAULT_OFFICE.subtitle;
  AGENTS = cfg.agents.length ? cfg.agents : [...FALLBACK_AGENTS];
}

function parseColor(raw: unknown, fallback = 0x94a3b8): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw >>> 0;
  if (typeof raw !== 'string') return fallback;
  const s = raw.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(s)) return parseInt(s, 16);
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[0] + s[0];
    const g = s[1] + s[1];
    const b = s[2] + s[2];
    return parseInt(r + g + b, 16);
  }
  return fallback;
}

const WORKING_ALIASES = ['working', 'busy', 'running', 'active', 'in_progress', 'thinking', 'executing'];
const WAITING_ALIASES = ['waiting', 'blocked', 'pending', 'needs_input', 'awaiting_input', 'awaiting_approval', 'queued', 'paused'];

/** Accepts the three canonical statuses plus common platform aliases; anything else is idle. */
export function parseStatus(raw: unknown): AgentStatus {
  if (typeof raw !== 'string') return 'idle';
  const s = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (WORKING_ALIASES.includes(s)) return 'working';
  if (WAITING_ALIASES.includes(s)) return 'waiting';
  return 'idle';
}

function parseAgent(raw: Record<string, unknown>, index: number): AgentDef | null {
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `agent-${index}`;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : id;
  const role = typeof raw.role === 'string' ? raw.role : '';
  const deskRaw = raw.desk && typeof raw.desk === 'object' ? (raw.desk as Record<string, unknown>) : null;
  const hasDesk =
    !!deskRaw && Number.isInteger(deskRaw.col) && Number.isInteger(deskRaw.row);
  return {
    id,
    name,
    role,
    color: parseColor(raw.color, PALETTE[index % PALETTE.length]),
    desk: hasDesk ? { col: deskRaw!.col as number, row: deskRaw!.row as number } : { col: 0, row: 0 },
    autoDesk: !hasDesk || undefined,
    isChief: Boolean(raw.isChief),
    lastTask: typeof raw.lastTask === 'string' ? raw.lastTask : '',
    status: parseStatus(raw.status),
    workingLines: Array.isArray(raw.workingLines)
      ? raw.workingLines.filter((s): s is string => typeof s === 'string').slice(0, 12)
      : undefined,
    sprite: typeof raw.sprite === 'string' && BUILTIN_AGENT_IDS.includes(raw.sprite) ? raw.sprite : undefined,
  };
}

const PALETTE = [
  0x60a5fa, 0x38bdf8, 0xfb923c, 0xf87171, 0x34d399, 0xa78bfa, 0x2dd4bf, 0x4ade80, 0xf472b6, 0xfacc15, 0x22d3ee,
];

export function parseOfficeConfig(data: unknown): OfficeConfig {
  if (!data || typeof data !== 'object') return { ...DEFAULT_OFFICE, agents: [...FALLBACK_AGENTS] };
  const obj = (Array.isArray(data) ? {} : data) as Record<string, unknown>;
  const agents: AgentDef[] = [];
  const seen = new Set<string>();
  adaptRoster(data).forEach((item, i) => {
    const a = parseAgent(item, i);
    if (!a || seen.has(a.id)) return;
    seen.add(a.id);
    agents.push(a);
  });
  // At most one Chief
  let chief = false;
  for (const a of agents) {
    if (a.isChief && chief) a.isChief = false;
    chief ||= Boolean(a.isChief);
  }
  const poll = Number(obj.pollSeconds);
  return {
    officeTitle:
      typeof obj.officeTitle === 'string' && obj.officeTitle.trim()
        ? obj.officeTitle.trim()
        : DEFAULT_OFFICE.officeTitle,
    subtitle:
      typeof obj.subtitle === 'string' && obj.subtitle.trim()
        ? obj.subtitle.trim()
        : DEFAULT_OFFICE.subtitle,
    agents: agents.length ? agents : [...FALLBACK_AGENTS],
    feed: typeof obj.feed === 'string' && /^https?:\/\//.test(obj.feed) ? obj.feed : undefined,
    pollSeconds: Number.isFinite(poll) && poll > 0 ? poll : undefined,
  };
}

/** Fetch and parse a roster snapshot. Throws on network/HTTP errors. */
export async function fetchOfficeConfig(url: string): Promise<{ cfg: OfficeConfig; raw: string }> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.text();
  return { cfg: parseOfficeConfig(JSON.parse(raw)), raw };
}

/** Stable look for an agent: explicit sprite, matching built-in id, Chief art, else a hash pick. */
export function lookFor(def: AgentDef): string {
  if (def.sprite && BUILTIN_AGENT_IDS.includes(def.sprite)) return def.sprite;
  if (BUILTIN_AGENT_IDS.includes(def.id)) return def.id;
  if (def.isChief) return 'cos';
  const pool = BUILTIN_AGENT_IDS.filter((x) => x !== 'cos');
  let h = 0;
  for (const ch of def.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

/** Fetch the app-relative agents.json at boot. Falls back to DEFAULT_OFFICE on failure. */
export async function loadOfficeConfig(): Promise<OfficeConfig> {
  const url = `${import.meta.env.BASE_URL}agents.json`;
  try {
    const { cfg } = await fetchOfficeConfig(url);
    setOfficeConfig(cfg);
    return cfg;
  } catch (err) {
    console.warn('[pixel-office] agents.json load failed; using fallback roster', err);
    setOfficeConfig({ ...DEFAULT_OFFICE, agents: [...FALLBACK_AGENTS] });
    return { officeTitle, subtitle: officeSubtitle, agents: AGENTS };
  }
}

export const WAITING_LINES = [
  'Need a review…',
  'Blocked on API…',
  'Ping the lead?',
  'Waiting on merge…',
  'Draft ready!',
  'Queue stalled…',
  'Any feedback?',
  'Stuck on auth…',
  'LGTM pending…',
  'Need a decision…',
  'CI still red…',
  'Holding pattern…',
  'Ready when you are',
  'Blocked on copy…',
];

export const IDLE_LINES = [
  'Stretching…',
  'Coffee run?',
  'Hmm…',
  'Wandering…',
  'Back in a bit',
  'Thinking…',
  'Nice floor!',
  'Break time?',
];

export const WORKING_LINES = [
  'Typing…',
  'On it!',
  'Almost done…',
  'Ship it?',
  'Deep work…',
  'Focus mode',
  'One more pass…',
  'In the zone',
];

/** Role-specific working lines, keyed by agent id. */
export const WORKING_LINES_BY_ID: Record<string, string[]> = {
  cos: ['Setting priorities…', 'Syncing the team…', 'Unblocking the floor…', 'Reviewing the week…'],
  github: ['Rebasing the PR…', 'CI is green now', 'Pushing a fix…', 'Reviewing the diff…', 'Writing a test…'],
  linkedin: ['Adjusting the spacing…', 'Trying a new palette…', 'Cleaning the layout…', 'Tuning the type…'],
  x: ['Replying to a ticket…', 'Escalating this one…', 'Drafting the answer…', 'Checking the queue…'],
  reddit: ['Sending the follow-up…', 'Qualifying the lead…', 'Updating the pipeline…', 'Prepping the demo…'],
  gmail: ['Triaging the inbox…', 'Booking the room…', 'Scheduling the sync…', 'Clearing the drafts…'],
  travel: ['Running the numbers…', 'Building the report…', 'Compiling the brief…', 'Comparing the options…'],
  deal: ['Drafting the copy…', 'Scouting the opportunity…', 'Flagging the renewal…', 'Watching the market…'],
  flight: ['Watching the signal…', 'Cross-checking sources…', 'Summarizing the paper…', 'Tracking the schedule…'],
  optimizer: ['Tuning the queue…', 'Re-routing the flow…', 'Testing the priority…', 'Balancing the load…'],
  swe: ['Shipping a pixel…', 'Fixing the pathfinding…', 'Polishing the desk…', 'Rebuilding the tiles…'],
};

/** Role-specific idle lines, keyed by agent id. */
export const IDLE_LINES_BY_ID: Record<string, string[]> = {
  cos: ['Strolling the floor…', 'Reading the board…', 'Coffee first…', 'Taking it in…'],
  github: ['Stretching…', 'Coffee run…', 'Off the clock…', 'Staring at the ceiling…'],
  linkedin: ['Sketching idly…', 'Stepping back…', 'Inspiration hunt…', 'Palette daydream…'],
  x: ['Checking the feed…', 'Battery low…', 'Chilling…', 'Refreshing…'],
  reddit: ['Pacing…', 'Cold brew…', 'Gym break…', 'Pitching air…'],
  gmail: ['Inbox zero, finally', 'Filing things…', 'Desk snack…', 'Breathing room…'],
  travel: ['Planning a real trip…', 'Looking out the window…', 'Recharging…', 'Coffee run…'],
  deal: ['Browsing deals…', 'Window shopping…', 'Daydreaming a campaign…', 'Stretching…'],
  flight: ['Clearing the radar…', 'Sky watching…', 'Idle throttle…', 'Fueling up…'],
  optimizer: ['Pondering the queue…', 'Idle loop…', 'Coffee run…', 'Rebalancing, mentally'],
  swe: ['Admiring the tiles…', 'Polishing a pixel…', 'AFK, refilling', 'Stretching…'],
};

/** Role-specific waiting lines, keyed by agent id. */
export const WAITING_LINES_BY_ID: Record<string, string[]> = {
  cos: ['Waiting on inputs…', 'Need the weekly numbers…', 'Awaiting sign-off…', 'Ping me when ready…'],
  github: ['Blocked on review…', 'CI still red…', 'Waiting on the merge…', 'Need a re-run…'],
  linkedin: ['Waiting on copy…', 'Need the assets…', 'Awaiting feedback…', 'Blocked on the brief…'],
  x: ['Queued three replies…', 'Waiting on escalation…', 'Draft pending…', 'Escalating…'],
  reddit: ['Waiting on the lead…', 'Pipeline paused…', 'Need a decision…', 'Follow-up pending…'],
  gmail: ['Two drafts pending…', 'Awaiting a reply…', 'Scheduling conflict…', 'Inbox waiting…'],
  travel: ['Awaiting the data…', 'Need the options…', 'Report pending…', 'Waiting on sources…'],
  deal: ['Waiting on pricing…', 'Renewal window…', 'Need the numbers…', 'Awaiting approval…'],
  flight: ['Signal watch active…', 'Schedule pending…', 'Waiting on the alert…', 'Scanning…'],
  optimizer: ['Queue stalled…', 'Waiting on routing…', 'Need the metrics…', 'Blocked on the flow…'],
  swe: ['Waiting on the build…', 'Need a review…', 'Blocked on assets…', 'LGTM pending…'],
};

/** Ids that ship with sprite art. Unknown ids reuse a fallback sprite at load. */
export const BUILTIN_AGENT_IDS = [
  'cos',
  'github',
  'linkedin',
  'x',
  'reddit',
  'gmail',
  'travel',
  'deal',
  'flight',
  'optimizer',
  'swe',
];

export const TASK_POOL = [
  'Processed overnight queue',
  'Synced calendars',
  'Ran regression smoke tests',
  'Refreshed credentials vault',
  'Compiled weekly digest',
  'Polished draft copy',
  'Rebalanced agent workload',
  'Filed bug with repro notes',
  'Reviewed open drafts with the team',
  'Cleared the shared triage inbox',
];
