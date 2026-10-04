import type { AgentDef } from './agents';
import {
  DESK_COLS,
  FIRST_DESK_ROW,
  MAP_COLS,
  MAP_ROWS,
  ROW_PITCH,
  setDeskRowCount,
} from '../utils/constants';

export type Seat = { col: number; row: number };

export interface Layout {
  rows: number;
  /** Grid desk seats (row-major), minus any that collide with an off-grid desk. */
  slots: Seat[];
  /** Explicit desks from the roster that are not on the grid. */
  offGrid: Seat[];
  /** Changes when the floor itself must be rebuilt (size, Chief, off-grid desks). */
  signature: string;
}

const key = (s: Seat) => `${s.col},${s.row}`;
/** Seat + desk footprint is 3 cols × 3 rows; two desks overlap when closer than that. */
const overlaps = (a: Seat, b: Seat) => Math.abs(a.col - b.col) <= 2 && Math.abs(a.row - b.row) <= 2;

function gridSlots(rows: number): Seat[] {
  const out: Seat[] = [];
  for (let r = 0; r < rows; r++) {
    for (const col of DESK_COLS) out.push({ col, row: FIRST_DESK_ROW + r * ROW_PITCH });
  }
  return out;
}

/**
 * Assign every non-Chief agent a desk (mutates `desk`) and size the floor.
 * Order of preference: explicit roster desk → `keep` (desk from the previous
 * snapshot, so live updates don't reshuffle people) → first free grid slot.
 * Rows are added until everyone fits.
 */
export function planLayout(agents: AgentDef[], keep?: Map<string, Seat>): Layout {
  const staff = agents.filter((a) => !a.isChief);
  let rows = Math.max(3, Math.ceil(staff.length / DESK_COLS.length));
  for (;;) {
    setDeskRowCount(rows);
    const all = gridSlots(rows);
    const onGrid = (s: Seat) => all.some((g) => g.col === s.col && g.row === s.row);
    const maxRow = MAP_ROWS - 9; // keep clear of the boss desk block
    const offGrid: Seat[] = [];
    for (const a of staff) {
      const d = a.desk;
      if (a.autoDesk || onGrid(d)) continue;
      const inBounds = d.col >= 3 && d.col <= MAP_COLS - 4 && d.row >= 2 && d.row <= maxRow;
      if (inBounds && !offGrid.some((o) => overlaps(o, d))) offGrid.push({ ...d });
    }
    const slots = all.filter((s) => !offGrid.some((o) => overlaps(o, s)));
    const free = new Set(slots.map(key));
    const taken = new Set<string>();
    const pending: AgentDef[] = [];
    for (const a of staff) {
      const explicit = !a.autoDesk ? a.desk : undefined;
      if (explicit && offGrid.some((o) => key(o) === key(explicit)) && !taken.has(key(explicit))) {
        taken.add(key(explicit));
        continue;
      }
      const want = [explicit, keep?.get(a.id)].find((s) => s && free.has(key(s)) && !taken.has(key(s)));
      if (want) {
        a.desk = { ...want };
        taken.add(key(want));
      } else pending.push(a);
    }
    const open = slots.filter((s) => !taken.has(key(s)));
    if (open.length < pending.length) {
      rows++;
      continue;
    }
    pending.forEach((a, i) => (a.desk = { ...open[i] }));
    const chief = agents.find((a) => a.isChief)?.id ?? '';
    return {
      rows,
      slots,
      offGrid,
      signature: `${rows}|${chief}|${offGrid.map(key).sort().join(';')}`,
    };
  }
}
