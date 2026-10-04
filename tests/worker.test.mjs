import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../feed/worker.js';

function env(token = 't') {
  const store = new Map();
  return { ROSTER: { get: async (k) => store.get(k) ?? null, put: async (k, v) => void store.set(k, v) }, FEED_TOKEN: token };
}
const call = (e, method, path, body, auth = 'Bearer t') =>
  worker.fetch(
    new Request(`https://feed.test${path}`, {
      method,
      headers: auth ? { Authorization: auth } : {},
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    e,
  );

test('GET returns an empty roster with CORS before anything is written', async () => {
  const r = await call(env(), 'GET', '/', undefined, null);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
  assert.deepEqual((await r.json()).agents, []);
});

test('writes need the bearer token', async () => {
  const e = env();
  assert.equal((await call(e, 'PUT', '/', { agents: [] }, null)).status, 401);
  assert.equal((await call(e, 'PUT', '/', { agents: [] }, 'Bearer nope')).status, 401);
  assert.equal((await call({ ...e, FEED_TOKEN: '' }, 'PUT', '/', { agents: [] })).status, 500);
});

test('PUT replaces and sanitizes; PATCH merges/adds; DELETE removes', async () => {
  const e = env();
  const put = await call(e, 'PUT', '/', {
    officeTitle: 'Grok Team',
    agents: [{ id: 'a', name: 'A', status: 'working', evil: '<x>' }, { id: 'a' }, { name: 'no id' }],
  });
  assert.equal(put.status, 200);
  let r = await (await call(e, 'GET', '/', undefined, null)).json();
  assert.equal(r.officeTitle, 'Grok Team');
  assert.deepEqual(r.agents, [{ id: 'a', name: 'A', status: 'working' }]);
  assert.ok(r.updatedAt);

  await call(e, 'PATCH', '/agents/a', { status: 'waiting', lastTask: 'Needs review' });
  await call(e, 'PATCH', '/agents/b', { name: 'B' });
  r = await (await call(e, 'GET', '/', undefined, null)).json();
  assert.deepEqual(r.agents.map((a) => [a.id, a.status ?? null]), [['a', 'waiting'], ['b', null]]);
  assert.equal(r.agents[0].name, 'A');

  assert.equal((await call(e, 'DELETE', '/agents/a')).status, 200);
  assert.equal((await call(e, 'DELETE', '/agents/a')).status, 404);
  r = await (await call(e, 'GET', '/', undefined, null)).json();
  assert.deepEqual(r.agents.map((a) => a.id), ['b']);
});

test('rejects bad bodies', async () => {
  const e = env();
  const bad = await worker.fetch(new Request('https://feed.test/', { method: 'PUT', headers: { Authorization: 'Bearer t' }, body: '{' }), e);
  assert.equal(bad.status, 400);
  assert.equal((await call(e, 'PUT', '/', { agents: 'x' })).status, 400);
  assert.equal((await call(e, 'PUT', '/', { agents: Array.from({ length: 201 }, (_, i) => ({ id: `${i}` })) })).status, 400);
});
