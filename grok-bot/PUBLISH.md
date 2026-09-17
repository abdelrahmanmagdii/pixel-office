# Publish the Pixel Office bot template

## 1. Build the bot in Grok Bot

1. Choose **New** in the sidebar, then **Create new agent**.
2. Set the name to `Pixel Office`.
3. Set the title to `Renders your Grok agent team as a living pixel-art office`.
4. Paste `DESCRIPTION.md` into **Edit Profile → description**.
5. Paste `SKILL-build-office.md` as a skill. Open **Settings → Plugins → Yours** and enable it for this Bot.
6. Paste `ROUTINE-keep-fresh.md` as a routine. Leave it paused until the first successful manual run.
7. Connect the **GitHub** connector under **Settings → Plugins**.
8. Run the skill once by hand. Confirm it creates a repo, writes `agents.json`, and returns a live URL. Fix the instructions if it fails.

## 2. Publish the template

1. Open the Bot and select **Share as Template** in its settings.
2. Review every item included. Remove any API key, token, or internal URL.
3. Publish as public.
4. Copy the link (a public `x.ai/bot/…` URL).

## 3. Wire the link into the project

1. Paste the link into `README.md` in place of `REPLACE_WITH_YOUR_TEMPLATE_LINK`.
2. Paste it into `CONTEST.md`.
3. Push.

## 4. Post the contest entry

1. Quote @grok's contest post. Say what the bot does in one line.
2. Paste the template link.
3. Attach a 15–20 second screen recording of the office.
4. Follow @grok and @bot from a public account.
