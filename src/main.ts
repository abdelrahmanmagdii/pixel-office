import './style.css';
import Phaser from 'phaser';
import { loadOfficeConfig, officeTitle, officeSubtitle } from './data/agents';
import { OfficeScene } from './scenes/OfficeScene';
import type { PanelPayload } from './scenes/OfficeScene';

function applyChrome(): void {
  document.title = officeTitle;
  const h1 = document.querySelector('#topbar h1');
  const sub = document.querySelector('#topbar .brand p');
  if (h1) h1.textContent = officeTitle;
  if (sub) sub.textContent = officeSubtitle;
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
  document.getElementById('panel-id')!.textContent = payload.id;
  (document.getElementById('panel-swatch') as HTMLElement).style.background = payload.color;
}

async function boot(): Promise<void> {
  await loadOfficeConfig();
  applyChrome();

  const gameParent = document.getElementById('game-container')!;
  const btnRandomize = document.getElementById('btn-randomize')!;
  const btnToggleCos = document.getElementById('btn-toggle-cos')!;
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

  panelClose.addEventListener('click', () => showPanel(null));

  btnRandomize.addEventListener('click', () => {
    const api = (window as unknown as { __pixelOffice?: { randomizeBusy: () => void } }).__pixelOffice;
    api?.randomizeBusy();
  });

  btnToggleCos.addEventListener('click', () => {
    const api = (window as unknown as {
      __pixelOffice?: { toggleCoS: () => boolean };
    }).__pixelOffice;
    if (!api) return;
    const onFloor = api.toggleCoS();
    btnToggleCos.textContent = onFloor ? 'Toggle CoS: Patrol' : 'Toggle CoS: Desk';
  });

  window.addEventListener('resize', () => {
    game.scale.resize(gameParent.clientWidth, gameParent.clientHeight);
  });
}

boot().catch((err) => {
  console.error('[pixel-office] boot failed', err);
});
