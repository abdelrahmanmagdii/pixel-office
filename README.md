# Pixel Office

Interactive pixel-art agent floor (Phaser + Vite).

## Open this URL

**https://abdelrahmanmagdii.github.io/pixel-office/**

Replace `pixel-office` with the GitHub repository name once Pages is enabled. The shared live URL is the main way to use this — not a Grok skill or template install.

## Local (optional)

```bash
git clone https://github.com/abdelrahmanmagdii/pixel-office.git
cd pixel-office
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

GitHub Pages deploys automatically on push to `main` (see `.github/workflows/pages.yml`). Vite `base` is `./` so project Pages works out of the box.

## Roster config

Runtime roster lives in `public/agents.json` (`officeTitle`, `subtitle`, `agents[]`). Sprite sheets are `public/assets/characters/agent-{id}.png` — keep `id` values that match existing art, or add matching PNGs.

### Optional: map bots → agents.json

```bash
cp bots.example.json bots.json   # edit names/roles/desks
npm run map-bots                 # writes public/agents.json
npm run build
```

## Stack

- Vite + TypeScript
- Phaser 4 (pixelArt mode)
- Original PNG sprites under `public/assets/` (see `public/assets/MANIFEST.md`)
