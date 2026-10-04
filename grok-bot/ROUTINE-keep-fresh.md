# Routine: Keep my office fresh

**Optional.** This routine consumes usage every time it runs. Leave it paused unless the user has connected a real status source.

Owner: the Pixel Office Bot.

Schedule: every 15 minutes during the user's working hours with a live feed; otherwise daily at 09:00. Ask the user for the time zone on the first run.

Source: a status source the user connects, such as a Notion board for the team. If no source is connected, skip the run and do not invent data.

Action:

- **Live feed (preferred).** For each agent whose status or task changed, send:

  ```
  curl -X PATCH "$FEED_URL/agents/<id>" \
    -H "Authorization: Bearer $FEED_TOKEN" -H "Content-Type: application/json" \
    -d '{"status":"working","lastTask":"Reviewing the launch checklist"}'
  ```

  A new `id` adds an agent; `DELETE $FEED_URL/agents/<id>` removes one. To replace the whole team, `PUT $FEED_URL/` with the full roster. Open offices update within one poll, without a redeploy.
- **No feed.** Update `lastTask` and `status` in `public/agents.json`, then commit. Open offices pick it up after GitHub Pages redeploys.

Rules:

- Never invent data. If a value is unknown, skip it.
- Only send what changed. The free Cloudflare KV tier allows 1,000 writes a day.
- `FEED_TOKEN` comes from the user's secrets. Never print it or commit it.
- Pushing the repository requires approval.
- If the source is unavailable, skip the run and report it instead of guessing.
- If the user wants zero recurring usage, disable this routine.
