export const TILE = 32;
export const MAP_COLS = 28;
export const MAP_ROWS = 20;

/** Walkable tile kinds */
export type TileKind = 'floor' | 'wall' | 'hallway' | 'desk' | 'glass' | 'door' | 'carpet';

/**
 * Chief boss/reception desk at bottom of map.
 * Chief STANDS at (standCol, standRow) facing DOWN (toward camera/user).
 * Desk sprites sit just north of the stand tile.
 */
export const BOSS_DESK = {
  standCol: 14,
  standRow: 17,
};

/**
 * Unoccupied filler desks (v5) — existing desk/desk-laptop sprites, no agents.
 * Seat tiles; 96×64 footprint blocks north of seat. Keep clear of Chief front.
 */
export const EMPTY_DESKS: { col: number; row: number; key: 'desk' | 'desk-laptop' | 'desk-empty' }[] = [
  { col: 16, row: 14, key: 'desk-empty' },   // bare wood — reads clearly empty
  { col: 20, row: 14, key: 'desk' },         // unoccupied monitor desk
  { col: 4, row: 8, key: 'desk-empty' },     // bare wood west
  { col: 24, row: 12, key: 'desk-laptop' },  // unoccupied laptop east
];

export const CAMERA = {
  /** Balanced default (~1.27× prior 1.1): most of main floor visible, hint of CoS/break. */
  defaultZoom: 1.4,
  minZoom: 0.7,
  maxZoom: 3.2,
  panSpeed: 280,
  /** Main-floor focus (tile coords) — open office desks, not map center. */
  startCol: 15,
  startRow: 9,
};
