# Pixel Office roster schema

One schema for the roster. `public/agents.json`, `bots.example.json`, `scripts/map-bots.mjs`, and `scripts/personalize.mjs` all follow this file.

```json
{
  "officeTitle": "Pixel Office",
  "subtitle": "Your agent floor — click an agent for details",
  "agents": [
    {
      "id": "github",
      "name": "Engineer",
      "role": "Builds features and keeps CI healthy",
      "color": "#60a5fa",
      "desk": { "col": 8, "row": 6 },
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
| `agents` | array | yes | One object per agent. |
| `agents[].id` | string | yes | Lowercase slug. The sprite is `public/assets/characters/agent-<id>.png`. |
| `agents[].name` | string | yes | Short display name. |
| `agents[].role` | string | no | One line. |
| `agents[].color` | string | no | Hex. Used for the desk nameplate and the panel swatch. |
| `agents[].desk` | object | no | `{ col, row }` seat tile. The map grid is 28 × 20 tiles. |
| `agents[].isChief` | boolean | no | True only for the Chief, who stands at the boss desk. |
| `agents[].lastTask` | string | no | Qualitative. No invented metrics or percentages. |
| `agents[].status` | string | no | `idle`, `working`, or `waiting`. |
| `agents[].workingLines` | string[] | no | Optional role-specific working chatter. |

## Sprite ids that ship with art

`cos`, `github`, `linkedin`, `x`, `reddit`, `gmail`, `travel`, `deal`, `flight`, `optimizer`, `swe`.

Unknown ids render with a fallback sprite at load. Add `public/assets/characters/agent-<id>.png` (48 × 480 sheet, ten 48 × 48 frames) to give an id its own look.

## Standard desk positions

| Index | Position | Use |
|---|---|---|
| 0 | `{ col: 14, row: 17 }` | Chief (boss desk) |
| 1 | `{ col: 8, row: 6 }` | Engineering row |
| 2 | `{ col: 12, row: 6 }` | Engineering row |
| 3 | `{ col: 16, row: 6 }` | Engineering row |
| 4 | `{ col: 20, row: 6 }` | Engineering row |
| 5 | `{ col: 8, row: 10 }` | Operations row |
| 6 | `{ col: 12, row: 10 }` | Operations row |
| 7 | `{ col: 16, row: 10 }` | Operations row |
| 8 | `{ col: 20, row: 10 }` | Operations row |
| 9 | `{ col: 8, row: 14 }` | Product row |
| 10 | `{ col: 12, row: 14 }` | Product row |
