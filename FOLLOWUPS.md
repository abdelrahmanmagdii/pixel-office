# Pixel Office v1 — Review follow-ups

Reviewed by: Pixel Office SWE (2026-09-15)
Against: `/workspace/pixel-office/DESIGN_BRIEF.md` + Pixel Agents UX patterns
Playable: `cd /workspace/grok-bot-pixel-office && npm run dev` → http://localhost:5173
Build: `npm run build` OK (also verified)

## Verdict

**Playable v1 lands.** Roster (11), idle wander, desk typing, waiting bubbles, CoS private office + floor toggle (button), click panel, procedural sprites — all present. No live metrics bars / health / token meters in the chrome.

## Must-fix (before calling metrics-clean) — DONE 2026-09-15

1. **Invented percentages in mock `lastTask` copy** (`src/data/agents.ts`)
   - Optimizer: *"Reduced average tool round-trip by **12%**"* — fabricated metric.
   - Deal Sniper: *"Sniped **18%** off SaaS renewal window"* — fabricated discount figure.
   - Brief: mock status OK; **do not invent fake metrics**. Rewrite to qualitative tasks (no %, counts-as-KPI, fake latency wins).

2. **`TASK_POOL` can inject metric-y fluff on Randomize**
   - e.g. *"Updated dashboard metrics"*, *"Checked rate limits"* — soft, but Randomize overwrites `lastTask` from this pool. Scrub to status-safe activity lines only.

3. **CoS office ↔ floor only via topbar button**
   - Brief acceptance: *Click CoS character or office* to toggle supervision.
   - Today: click only opens the panel; `toggleCoS` is HTML-only.
   - Must: clicking CoS (second click / dedicated control on panel) or clicking the CoS office carpet toggles location.

## Should-fix (UX polish)

4. **Truncated desk/name labels** — first token only (`Chief`, `Pixel`, `Flight`) hurts roster readability. Prefer short unique tags: `CoS`, `GitHub`, `LI`, `X`, `Reddit`, `Gmail`, `Travel`, `Deals`, `Flights`, `Opt`, `SWE`.

5. **Stable ids** — brief asked kebab-case (`chief-of-staff`, …). Current: `cos`, `github`, `x`, … Rename for API-ready mock data (keep display names).

6. **X Drafter palette** (`0xe5e7eb`) is near-white on light UI chrome / pale floors — bump contrast (darker gray or brand black).

7. **Desk clusters unlabeled** — brief wanted engineering / social / travel / deals zones. Add faint area labels or carpet tint per cluster.

8. **Per-agent status control** — Randomize-all exists; add panel buttons Idle / Working / Waiting for the selected agent (demo + debugging).

9. **Click hit radius** fixed at 28px — at zoom-out, misses increase. Scale hit radius with zoom or enlarge interactive footprint.

10. **CoS also gets a main-floor desk furniture** in `placeFurniture` loop — intentional for floor duty, but looks like a vacant 12th desk when CoS is in office. Either hide floor desk while CoS is in office, or mark it “supervisor seat”.


- Visual pass (preview :5174): load OK, ~11 agents, panel + CoS toggle + randomize OK. Speech bubbles can overlap nearby name labels (should-fix).

## Nice-to-have / v2

- Live agent status hooks (no invented numbers)
- Layout editor, pets, sounds (Pixel Agents parity)
- Origin/cloud deploy once SCM is connected
- Code-split Phaser chunk (build warns >500kB)
- Accessories/hats per role for glanceable IDs beyond color swatches

## Acceptance checklist

| Item | Status |
|------|--------|
| Load; 11 agents visible | Pass (code) |
| Status flip controls | Pass (randomize); weak on CoS click-toggle |
| working → type / idle → walk / waiting → bubble | Pass |
| CoS office ↔ floor | Partial (button only) |
| Panel: no invented metrics | **Fail** until must-fix 1–2 |
| `npm run dev` playable | Pass |

## Suggested first patch (cloud/CLI, not chat)

Rewrite `agents.ts` lastTasks + `TASK_POOL`; add CoS click-to-toggle (or panel button); fix label tags + X color.

## Patch log

- **2026-09-15** Must-fixes 1–3 applied (Pixel Office SWE):
  - Scrubbed fake % / metric lastTask + TASK_POOL in `src/data/agents.ts`
  - CoS office↔floor via click CoS character or CoS office tiles (`OfficeScene.ts`); topbar button kept + label sync
  - `npm run build` OK
