# Routine: Keep my office fresh

Paste this into the Bot's **Routines** (or ask the Bot to create the routine).

---

Owner: the Pixel Office Bot.

Schedule: daily at 09:00. Ask the user for the time zone on the first run.

Action: read the current roster and statuses, update `lastTask` and `status` in `public/agents.json`, then commit.

Rules:

- Never invent data. If a value is unknown, skip it.
- Pushing the repository requires approval.
- If the source is unavailable, skip the run and report it instead of guessing.
