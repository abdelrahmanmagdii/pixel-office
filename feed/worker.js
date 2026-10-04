/**
 * Pixel Office live feed — a Cloudflare Worker (free tier) backed by KV.
 *
 *   GET    /                → current roster snapshot (public, CORS)
 *   PUT    /                → replace the whole roster            (Bearer FEED_TOKEN)
 *   PATCH  /agents/:id      → merge fields into one agent / add it (Bearer FEED_TOKEN)
 *   DELETE /agents/:id      → remove one agent                     (Bearer FEED_TOKEN)
 *
 * Bindings: KV namespace `ROSTER`, secret `FEED_TOKEN`, optional var `ALLOWED_ORIGIN`.
 */
const KEY = 'roster';
const MAX_BODY = 64 * 1024;
const MAX_AGENTS = 200;
const STATUSES = new Set(['idle', 'working', 'waiting']);
const EMPTY = { officeTitle: 'Pixel Office', agents: [] };

const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined);

/** Keep only known fields with sane sizes; drops anything else a bot sends. */
export function cleanAgent(a) {
  if (!a || typeof a !== 'object' || typeof a.id !== 'string' || !a.id.trim()) return null;
  const out = { id: a.id.trim().slice(0, 64) };
  for (const [k, n] of [['name', 60], ['role', 160], ['lastTask', 200], ['sprite', 32]]) {
    const v = clip(a[k], n);
    if (v !== undefined) out[k] = v;
  }
  if (typeof a.color === 'string' && /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(a.color)) out.color = a.color;
  if (typeof a.status === 'string') out.status = STATUSES.has(a.status) ? a.status : a.status.slice(0, 32);
  if (typeof a.isChief === 'boolean') out.isChief = a.isChief;
  if (a.desk && Number.isInteger(a.desk.col) && Number.isInteger(a.desk.row)) {
    out.desk = { col: a.desk.col, row: a.desk.row };
  }
  if (Array.isArray(a.workingLines)) {
    out.workingLines = a.workingLines.filter((s) => typeof s === 'string').slice(0, 12).map((s) => s.slice(0, 60));
  }
  return out;
}

export function cleanRoster(r) {
  if (!r || typeof r !== 'object') return null;
  const list = Array.isArray(r) ? r : r.agents ?? r.bots;
  if (!Array.isArray(list) || list.length > MAX_AGENTS) return null;
  const seen = new Set();
  const agents = [];
  for (const a of list) {
    const c = cleanAgent(a);
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      agents.push(c);
    }
  }
  const out = { agents };
  if (!Array.isArray(r)) {
    for (const k of ['officeTitle', 'subtitle']) if (typeof r[k] === 'string') out[k] = r[k].slice(0, 80);
    if (Number.isFinite(r.pollSeconds) && r.pollSeconds >= 5) out.pollSeconds = r.pollSeconds;
  }
  return out;
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const send = (body, status = 200) =>
      new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });

    const { pathname } = new URL(request.url);
    const path = pathname.replace(/\/+$/, '') || '/';
    const method = request.method;
    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const load = async () => JSON.parse((await env.ROSTER.get(KEY)) ?? JSON.stringify(EMPTY));
    const save = async (r) => {
      r.updatedAt = new Date().toISOString();
      await env.ROSTER.put(KEY, JSON.stringify(r));
      return send(r);
    };

    if (method === 'GET' && (path === '/' || path === '/roster')) {
      return send((await env.ROSTER.get(KEY)) ?? JSON.stringify(EMPTY));
    }

    if (!env.FEED_TOKEN) return send({ error: 'FEED_TOKEN is not configured' }, 500);
    if (!safeEqual(request.headers.get('Authorization'), `Bearer ${env.FEED_TOKEN}`)) {
      return send({ error: 'unauthorized' }, 401);
    }

    let body = null;
    if (method === 'PUT' || method === 'PATCH') {
      const text = await request.text();
      if (text.length > MAX_BODY) return send({ error: 'body too large' }, 413);
      try {
        body = JSON.parse(text);
      } catch {
        return send({ error: 'invalid JSON' }, 400);
      }
    }

    if (method === 'PUT' && (path === '/' || path === '/roster')) {
      const r = cleanRoster(body);
      if (!r) return send({ error: `expected { agents: [...] } with at most ${MAX_AGENTS} agents` }, 400);
      return save(r);
    }

    const m = path.match(/^\/agents\/([^/]+)$/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      const roster = await load();
      const i = roster.agents.findIndex((a) => a.id === id);
      if (method === 'DELETE') {
        if (i < 0) return send({ error: 'not found' }, 404);
        roster.agents.splice(i, 1);
        return save(roster);
      }
      if (method === 'PATCH') {
        const merged = cleanAgent({ ...(i >= 0 ? roster.agents[i] : {}), ...body, id });
        if (!merged) return send({ error: 'invalid agent' }, 400);
        if (i >= 0) roster.agents[i] = merged;
        else if (roster.agents.length >= MAX_AGENTS) return send({ error: 'roster full' }, 409);
        else roster.agents.push(merged);
        return save(roster);
      }
    }

    return send({ error: 'not found' }, 404);
  },
};
