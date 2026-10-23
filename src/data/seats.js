/**
 * Single source for desk seats.
 * Imported by the Phaser app (via constants.ts) and by the roster scripts.
 * Keep this file plain ESM so Node can load it without a TypeScript runner.
 */

/** @typedef {{ col: number, row: number }} Seat */

export const MAP_COLS = 28;
export const BASE_MAP_ROWS = 20;
export const DESK_COLS = [8, 12, 16, 20];
export const FIRST_DESK_ROW = 3;
export const ROW_PITCH = 4;
export const BASE_DESK_ROWS = 3;

/** Chief stands here on the base floor. Extra desk rows move the boss south by ROW_PITCH. */
export const BOSS_SEAT = { col: 14, row: 14 };

/** Two desks overlap when their seats are this close (3×3 footprint). */
export const SEAT_CLEAR = 2;

/**
 * @param {number} rows
 * @returns {Seat[]}
 */
export function gridSeats(rows) {
  /** @type {Seat[]} */
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (const col of DESK_COLS) out.push({ col, row: FIRST_DESK_ROW + r * ROW_PITCH });
  }
  return out;
}

/**
 * Boss stand tile after the floor has grown to `rows` desk rows.
 * @param {number} rows
 * @returns {Seat}
 */
export function bossSeatForRows(rows) {
  const shift = (Math.max(BASE_DESK_ROWS, rows) - BASE_DESK_ROWS) * ROW_PITCH;
  return { col: BOSS_SEAT.col, row: BOSS_SEAT.row + shift };
}

/**
 * @param {Seat} a
 * @param {Seat} b
 */
export function overlapsSeat(a, b) {
  return Math.abs(a.col - b.col) <= SEAT_CLEAR && Math.abs(a.row - b.row) <= SEAT_CLEAR;
}

/**
 * Staff seats that do not overlap the boss desk once it has shifted for this team size.
 * @param {number} count
 * @returns {Seat[]}
 */
export function staffSeats(count) {
  let rows = Math.max(BASE_DESK_ROWS, Math.ceil(Math.max(0, count) / DESK_COLS.length));
  for (;;) {
    const boss = bossSeatForRows(rows);
    const seats = gridSeats(rows).filter((s) => !overlapsSeat(s, boss));
    if (seats.length >= count) return seats.slice(0, count);
    rows++;
  }
}

/**
 * First explicit chief wins. If nobody is explicitly chief, index 0 becomes
 * chief unless that entry set isChief: false.
 * @param {Array<boolean | undefined>} flags
 * @returns {number} index, or -1 when the roster has no chief
 */
export function pickChiefIndex(flags) {
  const explicit = flags.findIndex((f) => f === true);
  if (explicit >= 0) return explicit;
  if (flags.length === 0 || flags[0] === false) return -1;
  return 0;
}

/**
 * Unoccupied filler desks on the base floor.
 * The last two base-grid seats (16,11 bare and 20,11 monitor) stay empty
 * for the default 10-person staff. Side desks are props, not grid seats.
 * Texture keys are the sprites the scene draws (no desk → desk-back remap).
 * @returns {Array<Seat & { key: 'desk-empty' | 'desk-back' | 'desk-laptop-back' }>}
 */
export function fillerDesks() {
  const seats = gridSeats(BASE_DESK_ROWS);
  return [
    { ...seats[seats.length - 2], key: 'desk-empty' },
    { ...seats[seats.length - 1], key: 'desk-back' },
    { col: 4, row: 5, key: 'desk-empty' },
    { col: 24, row: 9, key: 'desk-laptop-back' },
  ];
}

/**
 * Give every agent a desk that lines up with the rugs and stays off the boss desk.
 * Explicit desks are kept when they do not overlap the (possibly shifted) boss.
 * The chief's recorded seat is the base boss stand tile; the scene moves the
 * real boss desk south when the floor grows.
 *
 * @param {Array<{ isChief?: boolean, desk?: { col?: number, row?: number } }>} list
 * @returns {Array<{ isChief: boolean, desk: Seat }>}
 */
export function assignRosterSeats(list) {
  const flags = list.map((b) => (b.isChief === true ? true : b.isChief === false ? false : undefined));
  const chief = pickChiefIndex(flags);
  const staffIdx = list.map((_, i) => i).filter((i) => i !== chief);
  let rows = Math.max(BASE_DESK_ROWS, Math.ceil(staffIdx.length / DESK_COLS.length) || BASE_DESK_ROWS);
  /** @type {Seat[]} */
  let seats = [];
  /** @type {Seat} */
  let boss = bossSeatForRows(rows);
  for (;;) {
    boss = bossSeatForRows(rows);
    seats = gridSeats(rows).filter((s) => !overlapsSeat(s, boss));
    if (seats.length >= staffIdx.length) break;
    rows++;
  }
  const used = new Set();
  const key = (/** @type {Seat} */ s) => `${s.col},${s.row}`;
  /** @type {Array<{ isChief: boolean, desk: Seat }>} */
  const result = list.map(() => ({ isChief: false, desk: { ...seats[0] } }));
  if (chief >= 0) result[chief] = { isChief: true, desk: { ...BOSS_SEAT } };
  /** @type {number[]} */
  const pending = [];
  for (const i of staffIdx) {
    const raw = list[i]?.desk;
    const explicit =
      raw && Number.isInteger(raw.col) && Number.isInteger(raw.row) ? { col: raw.col, row: raw.row } : null;
    if (explicit && !overlapsSeat(explicit, boss) && !used.has(key(explicit))) {
      used.add(key(explicit));
      result[i] = { isChief: false, desk: explicit };
    } else {
      pending.push(i);
    }
  }
  const free = seats.filter((s) => !used.has(key(s)));
  pending.forEach((i, n) => {
    result[i] = { isChief: false, desk: { ...free[n] } };
  });
  return result;
}
