import Phaser from 'phaser';
import { AGENTS } from '../data/agents';
import { TILE } from './constants';

/** Frame indices into the public tileset (32×32, left → right). */
export const TILE_FRAME = {
  floor: 0, // wood plank
  gray: 1, // dark hallway strip (v5)
  wall: 2, // near-black edge wall (v5)
  glass: 3,
  door: 4,
  carpet: 5,
  shadow: 6,
} as const;

/** Preload tiles + furniture from the app's public assets; characters stay frozen. */
export function preloadAssets(scene: Phaser.Scene): void {
  const base = import.meta.env.BASE_URL;
  const F = `${base}assets/furniture`;
  scene.load.spritesheet('tileset', `${F}/tileset.png`, {
    frameWidth: TILE,
    frameHeight: TILE,
  });
  // Legacy + new furniture keys (FURNITURE_SPEC.md)
  for (const key of [
    'desk',
    'desk-laptop',
    'desk-boss',
    'desk-empty',
    'chair',
    'stool',
    'plant',
    'plant-tall',
    'plant-succulent',
    'plant-large',
    'boxes',
    'bookshelf',
    'cooler',
    'coffee-station',
    'filing-cabinet',
    'whiteboard',
    'trash',
    'side-table',
    'bench',
    // Speech bubbles (9-slice + tails) — UI art only
    'bubble-9slice',
    'bubble-9slice-idle',
    'bubble-9slice-waiting',
    'bubble-9slice-working',
    'bubble-frame',
    'bubble-tail',
    'bubble-tail-idle',
    'bubble-tail-waiting',
    'bubble-tail-working',
  ] as const) {
    scene.load.image(key, `${F}/${key}.png`);
  }

  /** Agent chibi frames are 48×48 (tiles stay 32). Characters locked. */
  const AGENT_FRAME = 48;
  for (const a of AGENTS) {
    scene.load.spritesheet(`agent-${a.id}`, `${base}assets/characters/agent-${a.id}.png`, {
      frameWidth: AGENT_FRAME,
      frameHeight: AGENT_FRAME,
    });
  }
}

/**
 * Register walk / type animations from agent sprite sheets.
 * Sheet cols: 0–1 down, 2–3 up, 4–5 left, 6–7 right, 8–9 sit/type.
 */
export function createAgentAnims(scene: Phaser.Scene): void {
  for (const a of AGENTS) {
    const id = a.id;
    const sheet = `agent-${id}`;
    const ensure = (key: string, start: number, end: number, frameRate: number) => {
      if (scene.anims.exists(key)) return;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(sheet, { start, end }),
        frameRate,
        repeat: -1,
      });
    };
    ensure(`${sheet}-walk-down`, 0, 1, 6);
    ensure(`${sheet}-walk-up`, 2, 3, 6);
    ensure(`${sheet}-walk-left`, 4, 5, 6);
    ensure(`${sheet}-walk-right`, 6, 7, 6);
    ensure(`${sheet}-type`, 8, 9, 4);
  }
}

/** @deprecated Use preloadAssets + createAgentAnims — kept name for call-site clarity. */
export function generateTextures(scene: Phaser.Scene): void {
  createAgentAnims(scene);
}
