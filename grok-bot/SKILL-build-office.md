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
   - `agents[]` with: `id` (lowercase slug), `name`, `role`, `color` (hex), `desk` (`{ col, row }`), `isChief`, `lastTask` (qualitative only), `status` (`idle`, `working`, or `waiting`), and optional `workingLines`.
   - Reuse the standard desk positions from `SCHEMA.md`. Add new desks for custom bots.

4. Keep `id` values that match existing art: `cos`, `github`, `linkedin`, `x`, `reddit`, `gmail`, `travel`, `deal`, `flight`, `optimizer`, `swe`. Unknown ids still render with a fallback sprite, so custom rosters work without new art. To give an id its own look, add `public/assets/characters/agent-<id>.png`.
5. Push to `main`.
6. Return the live URL: `https://<username>.github.io/<repo>/`.

Validate:

- `agents.json` parses as valid JSON.
- Every `id` has a sprite sheet, or matches an existing sheet.
- No invented metrics or percentages appear in `lastTask`.

Approvals:

- The push requires approval.

Return:

- The URL and the final `agents.json` content.
