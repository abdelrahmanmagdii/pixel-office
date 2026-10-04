# Live feed (Cloudflare Worker, free tier)

A tiny Worker that stores the roster in KV. The office polls `GET /`; your bots write with a token.

| Method | Path | Auth | Does |
|---|---|---|---|
| `GET` | `/` | none | Current roster (same JSON as `agents.json`). |
| `PUT` | `/` | `Bearer FEED_TOKEN` | Replace the roster. |
| `PATCH` | `/agents/:id` | `Bearer FEED_TOKEN` | Merge fields into one agent, or add it. |
| `DELETE` | `/agents/:id` | `Bearer FEED_TOKEN` | Remove one agent. |

Unknown fields are dropped and strings are length-capped. Max 200 agents, 64 KB per request.

## Deploy

```bash
cd feed
npx wrangler login
npx wrangler kv namespace create ROSTER    # paste the id into wrangler.toml
npx wrangler secret put FEED_TOKEN         # any long random string
npx wrangler deploy                        # prints https://pixel-office-feed.<you>.workers.dev
```

Optional: set `ALLOWED_ORIGIN` in `wrangler.toml` to your Pages origin, e.g. `https://<you>.github.io`.

Seed it with your current roster:

```bash
curl -X PUT https://pixel-office-feed.<you>.workers.dev/ \
  -H "Authorization: Bearer $FEED_TOKEN" -H "Content-Type: application/json" \
  --data @../public/agents.json
```

Then add `"feed": "https://pixel-office-feed.<you>.workers.dev"` to `public/agents.json`, or open the office with `?feed=<url>`.

## Limits

- Free tier: 100,000 reads and 1,000 KV writes a day. Send only changes.
- KV is eventually consistent. Updates can take up to about a minute to show in other regions.

## Run locally

`npm run feed:dev` runs the same Worker with in-memory storage on `http://localhost:8787` (token `dev-token`). Open `http://localhost:5173/?feed=http://localhost:8787&poll=5`.
