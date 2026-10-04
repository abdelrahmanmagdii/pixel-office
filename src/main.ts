import './style.css';
import Phaser from 'phaser';
import {
  fetchOfficeConfig,
  loadOfficeConfig,
  officeTitle,
  officeSubtitle,
  setOfficeConfig,
} from './data/agents';
import type { OfficeConfig } from './data/agents';
import { OfficeScene } from './scenes/OfficeScene';
import type { PanelPayload, PixelOfficeApi } from './scenes/OfficeScene';
import type { AgentStatus } from './data/agents';

function applyChrome(): void {
  document.title = officeTitle;
  const h1 = document.getElementById('office-title');
  const sub = document.querySelector('#topbar .brand p');
  if (h1) h1.textContent = officeTitle;
  if (sub) sub.textContent = officeSubtitle;
}

function pixelOfficeApi(): PixelOfficeApi | undefined {
  return (window as unknown as { __pixelOffice?: PixelOfficeApi }).__pixelOffice;
}

function syncTopbarCoS(onFloor: boolean): void {
  const btn = document.getElementById('btn-toggle-cos');
  if (btn) btn.textContent = onFloor ? 'Toggle CoS: Patrol' : 'Toggle CoS: Desk';
}

function showPanel(payload: PanelPayload | null): void {
  const panel = document.getElementById('agent-panel')!;
  if (!payload) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  document.getElementById('panel-name')!.textContent = payload.name;
  document.getElementById('panel-role')!.textContent = payload.role;
  const panelStatus = document.getElementById('panel-status')!;
  panelStatus.textContent = payload.status.toUpperCase();
  panelStatus.className = `status-${payload.status}`;
  document.getElementById('panel-location')!.textContent = payload.location;
  document.getElementById('panel-task')!.textContent = payload.lastTask;
  (document.getElementById('panel-swatch') as HTMLElement).style.background = payload.color;

  const api = pixelOfficeApi();
  const btnCos = document.getElementById('btn-panel-cos')!;
  btnCos.classList.toggle('hidden', !payload.isChief);
  btnCos.textContent = api?.isCoSOnFloor?.() ? 'Toggle CoS: Desk' : 'Toggle CoS: Patrol';
  btnCos.onclick = () => {
    const onFloor = api?.toggleCoS() ?? false;
    syncTopbarCoS(onFloor);
  };

  document.querySelectorAll<HTMLButtonElement>('#panel-actions .status-btn').forEach((btn) => {
    const status = btn.dataset.status as AgentStatus;
    btn.classList.toggle('on', status === payload.status);
    btn.onclick = () => {
      api?.setStatus(payload.id, status);
    };
  });
}

type FeedState = 'live' | 'offline';

function setFeedPill(state: FeedState, detail: string): void {
  const pill = document.getElementById('live-status');
  if (!pill) return;
  pill.classList.remove('hidden', 'live', 'offline');
  pill.classList.add(state);
  pill.textContent = state === 'live' ? 'LIVE' : 'OFFLINE';
  pill.title = detail;
}

/**
 * Poll the roster and reconcile changes into the running scene.
 * Feed URL: `?feed=` → `feed` in agents.json → agents.json itself (picks up redeploys).
 * Interval: `?poll=` seconds → `pollSeconds` → 15s with a feed, 60s without. Min 5s.
 * On errors the last good roster stays on screen.
 */
function startPolling(url: string, isFeed: boolean, seconds: number, lastRaw: string): void {
  let last = lastRaw;
  let busy = false;
  const tick = async (): Promise<void> => {
    if (busy || document.hidden) return;
    busy = true;
    try {
      const { cfg, raw } = await fetchOfficeConfig(url);
      if (raw !== last) {
        last = raw;
        pixelOfficeApi()?.applyRoster(cfg);
        applyChrome();
      }
      if (isFeed) setFeedPill('live', `Updated ${new Date().toLocaleTimeString()} · every ${seconds}s`);
    } catch (err) {
      console.warn('[pixel-office] feed poll failed; keeping last roster', err);
      if (isFeed) setFeedPill('offline', `Feed unreachable (${String(err)}); showing last known roster`);
    } finally {
      busy = false;
    }
  };
  window.setInterval(() => void tick(), seconds * 1000);
  document.addEventListener('visibilitychange', () => void tick());
  (window as unknown as { __pixelOfficeFeed: unknown }).__pixelOfficeFeed = { url, seconds, pollNow: tick };
}

async function loadInitialRoster(): Promise<{ url: string; isFeed: boolean; seconds: number; raw: string }> {
  const q = new URLSearchParams(window.location.search);
  const staticUrl = `${import.meta.env.BASE_URL}agents.json`;
  let base: OfficeConfig;
  let raw = '';
  try {
    ({ cfg: base, raw } = await fetchOfficeConfig(staticUrl));
    setOfficeConfig(base);
  } catch {
    base = await loadOfficeConfig();
  }
  const feed = q.get('feed') || base.feed;
  const seconds = Math.max(5, Number(q.get('poll')) || base.pollSeconds || (feed ? 15 : 60));
  if (feed) {
    try {
      const snap = await fetchOfficeConfig(feed);
      setOfficeConfig(snap.cfg);
      raw = snap.raw;
      setFeedPill('live', `Connected · every ${seconds}s`);
    } catch (err) {
      setFeedPill('offline', `Feed unreachable (${String(err)}); showing agents.json`);
    }
  }
  return { url: feed || staticUrl, isFeed: Boolean(feed), seconds, raw };
}

async function boot(): Promise<void> {
  const feed = await loadInitialRoster();
  applyChrome();

  const gameParent = document.getElementById('game-container')!;
  const btnRandomize = document.getElementById('btn-randomize')!;
  const btnDemo = document.getElementById('btn-demo')!;
  const btnToggleCos = document.getElementById('btn-toggle-cos')!;
  const btnCustomize = document.getElementById('btn-customize')!;
  const panelClose = document.getElementById('panel-close')!;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: gameParent,
    backgroundColor: '#0b1220',
    pixelArt: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: gameParent.clientWidth || 960,
      height: gameParent.clientHeight || 640,
    },
    scene: [OfficeScene],
    banner: false,
  });

  game.scene.start('Office', {
    hooks: {
      onSelect: showPanel,
    },
  });

  startPolling(feed.url, feed.isFeed, feed.seconds, feed.raw);

  panelClose.addEventListener('click', () => showPanel(null));

  btnRandomize.addEventListener('click', () => pixelOfficeApi()?.randomizeBusy());

  btnDemo.addEventListener('click', () => {
    const api = pixelOfficeApi();
    if (!api) return;
    if (btnDemo.dataset.mode === 'stop') {
      api.stopDemo();
      btnDemo.textContent = 'Play tour';
      btnDemo.dataset.mode = '';
      return;
    }
    btnDemo.textContent = 'Stop tour';
    btnDemo.dataset.mode = 'stop';
    api.startDemo();
  });

  window.addEventListener('pixel-office:demo-end', () => {
    btnDemo.textContent = 'Play tour';
    btnDemo.dataset.mode = '';
  });

  btnToggleCos.addEventListener('click', () => {
    const api = pixelOfficeApi();
    if (!api) return;
    const onFloor = api.toggleCoS();
    btnToggleCos.textContent = onFloor ? 'Toggle CoS: Patrol' : 'Toggle CoS: Desk';
  });

  window.addEventListener('resize', () => {
    game.scale.resize(gameParent.clientWidth, gameParent.clientHeight);
  });

  // Customize: edit + download the roster without leaving the page
  const modal = document.getElementById('customize-modal')!;
  const ta = document.getElementById('customize-json') as HTMLTextAreaElement;
  btnCustomize.addEventListener('click', async () => {
    const res = await fetch(feed.url, { cache: 'no-store' });
    ta.value = JSON.stringify(await res.json(), null, 2);
    modal.classList.remove('hidden');
  });
  document.getElementById('customize-close')!.addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('customize-download')!.addEventListener('click', () => {
    const blob = new Blob([ta.value + '\n'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'agents.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  document.getElementById('customize-copy')!.addEventListener('click', async () => {
    await navigator.clipboard.writeText(ta.value);
  });
}

boot().catch((err) => {
  console.error('[pixel-office] boot failed', err);
});