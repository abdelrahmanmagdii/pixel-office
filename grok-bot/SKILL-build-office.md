# Skill: Build my Pixel Office

Paste this into the Bot's **Skills** (or ask the Bot: "Save this as a skill called Build my Pixel Office").

---

When to use: when the user asks to create or rebuild their Pixel Office.

Inputs needed: the user's built-in Grok agent sections and any custom bot names and roles.

Sequence:

1. Create the repo. If `gh` is authenticated on the shared computer, run:

   ```
   gh repo create <username>-pixel-office --template abdelrahmanmagdii/pixel-office --public
   ```

   Otherwise, tell the user to open https://github.com/abdelrahmanmagdii/pixel-office and select **Use this template**.

2. Clone the new repository into `/workspace`.
3. Write `public/agents.json` from the schema in `SCHEMA.md`:

   - `officeTitle` and `subtitle`: header text.
   - `agents[]` with: `id` (lowercase slug), `name`, `role`, `color` (hex), `isChief` (one agent), `lastTask` (qualitative only), `status` (`idle`, `working`, or `waiting`), and optional `workingLines` or `sprite`.
   - Leave out `desk`. The office assigns desks and grows the floor for big teams.
   - For live updates, add `"feed": "<worker url>"` (see step 7).

4. Keep `id` values that match existing art: `cos`, `github`, `linkedin`, `x`, `reddit`, `gmail`, `travel`, `deal`, `flight`, `optimizer`, `swe`. Other ids get a built-in look automatically; set `sprite` to pick one.
5. Push to `main`.
6. Return the live URL: `https://<username>.github.io/<repo>/`.
7. Optional, for live status: deploy the feed in `feed/` (see `feed/README.md`, free Cloudflare tier). Ask the user to set the `FEED_TOKEN` secret themselves. Put the worker URL in `agents.json` as `feed`, push, and publish the first snapshot with `PUT /`.

Validate:

- `agents.json` parses as valid JSON.
- Every `id` is unique, and at most one agent has `isChief: true`.
- No invented metrics or percentages appear in `lastTask`.

Approvals:

- The push requires approval.
- Never write `FEED_TOKEN` into the repo or `agents.json`.

Return:

- The URL and the final `agents.json` content.
