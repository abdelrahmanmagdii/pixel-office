export const TILE = 32;
export const MAP_COLS = 28;
/** Base map height; grows by ROW_PITCH per extra desk row (see setDeskRowCount). */
export const BASE_MAP_ROWS = 20;
export let MAP_ROWS = BASE_MAP_ROWS;

/** Desk grid: seat columns, first seat row, and rows between desk rows. */
export const DESK_COLS = [8, 12, 16, 20];
export const FIRST_DESK_ROW = 3;
export const ROW_PITCH = 4;
export const BASE_DESK_ROWS = 3;
/** Rows added below the base layout; everything south of the desks moves down by this. */
export let SOUTH_SHIFT = 0;
export let DESK_ROWS = BASE_DESK_ROWS;

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

const ZONE_STYLES = [
  { label: 'ENGINEERING', tint: 0x6b8fc4 },
  { label: 'OPERATIONS', tint: 0x6fae84 },
  { label: 'PRODUCT', tint: 0xc08aa6 },
  { label: 'STUDIO', tint: 0xc4a86b },
  { label: 'RESEARCH', tint: 0x6bb7c4 },
  { label: 'GROWTH', tint: 0x9a8fc4 },
];

/** Desk rows (seat row) with a tinted rug and a label. */
export function zones(): { label: string; seatRow: number; tint: number }[] {
  return Array.from({ length: DESK_ROWS }, (_, i) => ({
    ...ZONE_STYLES[i % ZONE_STYLES.length],
    seatRow: FIRST_DESK_ROW + i * ROW_PITCH,
  }));
}

/** Resize the floor for `rows` desk rows (min 3); moves the boss desk and break corner south. */
export function setDeskRowCount(rows: number): void {
  DESK_ROWS = Math.max(BASE_DESK_ROWS, rows);
  SOUTH_SHIFT = (DESK_ROWS - BASE_DESK_ROWS) * ROW_PITCH;
  MAP_ROWS = BASE_MAP_ROWS + SOUTH_SHIFT;
  BOSS_DESK.standRow = 14 + SOUTH_SHIFT;
  COFFEE_SPOT.row = 16 + SOUTH_SHIFT;
}

/** Rows at or below 14 belong to the south block (boss desk, break corner). */
export function south(row: number): number {
  return row >= 14 ? row + SOUTH_SHIFT : row;
}

/**
 * Unoccupied filler desks (v5) — existing desk/desk-laptop sprites, no agents.
 * Seat tiles; 96×64 footprint blocks north of seat. Keep clear of Chief front.
 */
export const EMPTY_DESKS: { col: number; row: number; key: 'desk' | 'desk-laptop' | 'desk-empty' }[] = [
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
