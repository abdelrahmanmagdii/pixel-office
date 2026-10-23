export const MAP_COLS: number;
export const BASE_MAP_ROWS: number;
export const DESK_COLS: readonly number[];
export const FIRST_DESK_ROW: number;
export const ROW_PITCH: number;
export const BASE_DESK_ROWS: number;
export const BOSS_SEAT: { readonly col: number; readonly row: number };
export const SEAT_CLEAR: number;

export interface Seat {
  col: number;
  row: number;
}

export type FillerDeskKey = 'desk-empty' | 'desk-back' | 'desk-laptop-back';

export interface FillerDesk extends Seat {
  key: FillerDeskKey;
}

export function gridSeats(rows: number): Seat[];
export function bossSeatForRows(rows: number): Seat;
export function overlapsSeat(a: Seat, b: Seat): boolean;
export function staffSeats(count: number): Seat[];
export function pickChiefIndex(flags: Array<boolean | undefined>): number;
export function fillerDesks(): FillerDesk[];
export function assignRosterSeats(
  list: Array<{ isChief?: boolean; desk?: { col?: number; row?: number } }>,
): Array<{ isChief: boolean; desk: Seat }>;
