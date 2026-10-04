# Pixel Office roster schema

One schema for the roster. `public/agents.json`, the live feed (`feed/worker.js`), `bots.example.json`, `scripts/map-bots.mjs`, and `scripts/personalize.mjs` all follow this file.

```json
{
  "officeTitle": "Pixel Office",
  "subtitle": "Your agent floor — click an agent for details",
  "feed": "https://pixel-office-feed.<you>.workers.dev",
  "pollSeconds": 15,
  "agents": [
    {
      "id": "github",
      "name": "Engineer",
      "role": "Builds features and keeps CI healthy",
      "color": "#60a5fa",
      "desk": { "col": 8, "row": 3 },
      "isChief": false,
      "lastTask": "Triaged open pull requests",
      "status": "working",
      "workingLines": ["Rebasing the PR…", "Pushing a fix…"]
    }
  ]
}
```

## Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `officeTitle` | string | no | Header text. Defaults to `Pixel Office`. |
| `subtitle` | string | no | Header subtitle. |
| `feed` | string | no | Live feed URL. The office polls it and updates without a reload. `?feed=<url>` in the page URL overrides it. |
| `pollSeconds` | number | no | Poll interval. Default 15 with a feed, 60 without (then `agents.json` itself is polled). Minimum 5. `?poll=<s>` overrides it. |
| `agents` | array | yes | One object per agent. `bots` or a bare array also work. |
| `agents[].id` | string | yes | Unique slug. Falls back to a slug of `name`. |
| `agents[].name` | string | yes | Short display name. |
| `agents[].role` | string | no | One line. |
| `agents[].color` | string | no | Hex. Used for the desk nameplate and the panel swatch. |
| `agents[].desk` | object | no | `{ col, row }` seat tile. Leave it out and a desk is assigned automatically. See **Layout**. |
| `agents[].isChief` | boolean | no | True only for the Chief, who stands at the boss desk. |
| `agents[].lastTask` | string | no | Qualitative. No invented metrics or percentages. |
| `agents[].status` | string | no | `idle`, `working`, or `waiting`. Aliases: `busy`, `running`, `active`, `in_progress` → working; `blocked`, `pending`, `needs_input`, `queued`, `paused` → waiting; anything else → idle. |
| `agents[].sprite` | string | no | Built-in look to wear (one of the ids below). |
| `agents[].workingLines` | string[] | no | Optional role-specific working chatter. |

## Sprite looks

Built-in looks: `cos`, `github`, `linkedin`, `x`, `reddit`, `gmail`, `travel`, `deal`, `flight`, `optimizer`, `swe`.

An agent wears `sprite` if set, else the look matching its `id`, else `cos` for the Chief, else a stable pick from the other looks based on its `id`.

## Layout

- Desks sit on a grid: columns 8, 12, 16, 20 and seat rows 3, 7, 11, … (4 per row). The desk is drawn south of the seat, so the agent faces the camera.
- Agents without a `desk` take the first free grid desk. On live updates, agents keep the desk they already had.
- The floor has at least 3 desk rows (12 desks). Bigger teams add rows; the boss desk and break corner move south. The map is 28 tiles wide and `20 + 4 × (rows − 3)` tall.
- An explicit `desk` on the grid claims that desk. An explicit desk off the grid is kept if it fits (cols 3–24, clear of the boss desk) and does not overlap another desk.
- The Chief (`isChief: true`, at most one) always stands at the boss desk.

## Live feed

The feed returns the same JSON as `agents.json`. The office polls it, compares the payload, and on change:

- updates status, task, name and look in place,
- adds new agents at free desks,
- removes agents that are gone,
- rebuilds the floor only when its size or the Chief changes.

If a poll fails, the last good roster stays on screen and the header shows **OFFLINE**.

## Adapters

`src/data/adapters.ts` maps platform exports to this schema. The default adapter also accepts common field names (`displayName`/`title` → `name`, `description` → `role`, `state` → `status`, `task`/`summary` → `lastTask`). To add a platform (for example OpenAI), add an entry to `ADAPTERS` with `detect` and `toAgents`, or set `"adapter": "<name>"` in the payload.
