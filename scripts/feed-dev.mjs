#!/usr/bin/env node
/**
 * Run the feed Worker locally with an in-memory KV (no Cloudflare account needed).
 *   npm run feed:dev            → http://localhost:8787, token "dev-token"
 *   PORT=9000 FEED_TOKEN=x npm run feed:dev
 * Then open the office with ?feed=http://localhost:8787&poll=5
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../feed/worker.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const store = new Map();
const seed = path.join(root, 'public', 'agents.json');
if (fs.existsSync(seed)) store.set('roster', fs.readFileSync(seed, 'utf8'));

const env = {
  ROSTER: { get: async (k) => store.get(k) ?? null, put: async (k, v) => void store.set(k, v) },
  FEED_TOKEN: process.env.FEED_TOKEN || 'dev-token',
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || '*',
};
const port = Number(process.env.PORT) || 8787;

http
  .createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(chunks);
    const out = await worker.fetch(
      new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers, body }),
      env,
    );
    res.writeHead(out.status, Object.fromEntries(out.headers));
    res.end(Buffer.from(await out.arrayBuffer()));
  })
  .listen(port, () => console.log(`feed on http://localhost:${port} (token: ${env.FEED_TOKEN === 'dev-token' ? 'dev-token' : 'from FEED_TOKEN'})`));
