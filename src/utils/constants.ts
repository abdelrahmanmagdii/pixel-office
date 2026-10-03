export const TILE = 32;
export const MAP_COLS = 28;
export const MAP_ROWS = 20;

/** Walkable tile kinds */
export type TileKind =
  | 'floor'
  | 'wall'
  | 'wallface'
  | 'window'
  | 'hallway'
  | 'desk'
  | 'glass'
  | 'door'
  | 'carpet';

/**
 * Chief boss/reception desk at bottom of map.
 * Chief STANDS at (standCol, standRow) facing DOWN (toward camera/user).
 * The desk is drawn on the two rows south of the stand tile.
 */
export const BOSS_DESK = {
  standCol: 14,
  standRow: 14,
};

/** Tile idle agents walk to for a coffee break (south of the coffee station). */
export const COFFEE_SPOT = { col: 23, row: 16 };

/** North-wall columns that get a window tile. */
export const WALL_WINDOWS = [3, 12, 16, 24];

/** Desk rows (seat row) with a tinted rug and a label. */
export const ZONES = [
  { label: 'ENGINEERING', seatRow: 3, tint: 0x6b8fc4 },
  { label: 'OPERATIONS', seatRow: 7, tint: 0x6fae84 },
  { label: 'PRODUCT', seatRow: 11, tint: 0xc08aa6 },
];

/**
 * Unoccupied filler desks (v5) — existing desk/desk-laptop sprites, no agents.
 * Seat tiles; 96×64 footprint blocks north of seat. Keep clear of Chief front.
 */
export const EMPTY_DESKS: { col: number; row: number; key: 'desk' | 'desk-laptop' | 'desk-empty' }[] = [
  { col: 16, row: 11, key: 'desk-empty' },   // bare wood — reads clearly empty
  { col: 20, row: 11, key: 'desk' },         // unoccupied monitor desk
  { col: 4, row: 5, key: 'desk-empty' },     // bare wood west
  { col: 24, row: 9, key: 'desk-laptop' },   // unoccupied laptop east
];

export const CAMERA = {
  /** Upper bound for the start zoom; the start zoom fits the map to the viewport. */
  defaultZoom: 1.4,
  minZoom: 0.4,
  maxZoom: 3.2,
  panSpeed: 280,
  /** Main-floor focus (tile coords) — open office desks, not map center. */
  startCol: 15,
  startRow: 9,
};
