# Routine: Keep my office fresh

**Optional.** This routine consumes usage every time it runs. Leave it paused unless the user wants live updates and has connected a real status source.

Owner: the Pixel Office Bot.

Schedule: daily at 09:00. Ask the user for the time zone on the first run.

Source: a status source the user connects, such as a Notion board for the team. If no source is connected, skip the run and do not invent data.

Action: read the source, update `lastTask` and `status` in `public/agents.json`, then commit.

Rules:

- Never invent data. If a value is unknown, skip it.
- Pushing the repository requires approval.
- If the source is unavailable, skip the run and report it instead of guessing.
- If the user wants zero recurring usage, disable this routine.
