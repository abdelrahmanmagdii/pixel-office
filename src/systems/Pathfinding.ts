import { MAP_COLS, MAP_ROWS } from '../utils/constants';

export type Grid = boolean[][]; // true = walkable

export function emptyGrid(walkable = true): Grid {
  return Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => walkable),
  );
}

interface Node {
  col: number;
  row: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

function heuristic(aCol: number, aRow: number, bCol: number, bRow: number): number {
  return Math.abs(aCol - bCol) + Math.abs(aRow - bRow);
}

function key(col: number, row: number): string {
  return `${col},${row}`;
}

/** BFS/A* path on 4-directional grid. Returns path excluding start, including goal. */
export function findPath(
  grid: Grid,
  startCol: number,
  startRow: number,
  goalCol: number,
  goalRow: number,
): { col: number; row: number }[] {
  if (
    startCol < 0 ||
    startRow < 0 ||
    goalCol < 0 ||
    goalRow < 0 ||
    startCol >= MAP_COLS ||
    startRow >= MAP_ROWS ||
    goalCol >= MAP_COLS ||
    goalRow >= MAP_ROWS
  ) {
    return [];
  }

  if (!grid[goalRow][goalCol] && !(startCol === goalCol && startRow === goalRow)) {
    // Try nearest walkable neighbor of goal
    const alt = nearestWalkable(grid, goalCol, goalRow);
    if (!alt) return [];
    goalCol = alt.col;
    goalRow = alt.row;
  }

  if (startCol === goalCol && startRow === goalRow) return [];

  const open: Node[] = [];
  const closed = new Set<string>();
  const start: Node = {
    col: startCol,
    row: startRow,
    g: 0,
    h: heuristic(startCol, startRow, goalCol, goalRow),
    f: 0,
    parent: null,
  };
  start.f = start.g + start.h;
  open.push(start);

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const ck = key(current.col, current.row);
    if (closed.has(ck)) continue;
    closed.add(ck);

    if (current.col === goalCol && current.row === goalRow) {
      const path: { col: number; row: number }[] = [];
      let n: Node | null = current;
      while (n && !(n.col === startCol && n.row === startRow)) {
        path.push({ col: n.col, row: n.row });
        n = n.parent;
      }
      return path.reverse();
    }

    for (const [dx, dy] of dirs) {
      const nc = current.col + dx;
      const nr = current.row + dy;
      if (nc < 0 || nr < 0 || nc >= MAP_COLS || nr >= MAP_ROWS) continue;
      if (!grid[nr][nc]) continue;
      const nk = key(nc, nr);
      if (closed.has(nk)) continue;
      const g = current.g + 1;
      const h = heuristic(nc, nr, goalCol, goalRow);
      open.push({ col: nc, row: nr, g, h, f: g + h, parent: current });
    }
  }

  return [];
}

export function nearestWalkable(
  grid: Grid,
  col: number,
  row: number,
  maxR = 3,
): { col: number; row: number } | null {
  if (inBounds(col, row) && grid[row][col]) return { col, row };
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const c = col + dx;
        const rr = row + dy;
        if (inBounds(c, rr) && grid[rr][c]) return { col: c, row: rr };
      }
    }
  }
  return null;
}

function inBounds(col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < MAP_COLS && row < MAP_ROWS;
}

export function randomWalkableTile(
  grid: Grid,
  avoid?: { col: number; row: number }[],
  region?: { x0: number; y0: number; x1: number; y1: number },
): { col: number; row: number } | null {
  const candidates: { col: number; row: number }[] = [];
  const y0 = region?.y0 ?? 0;
  const y1 = region?.y1 ?? MAP_ROWS - 1;
  const x0 = region?.x0 ?? 0;
  const x1 = region?.x1 ?? MAP_COLS - 1;
  for (let row = y0; row <= y1; row++) {
    for (let col = x0; col <= x1; col++) {
      if (!grid[row][col]) continue;
      if (avoid?.some((a) => a.col === col && a.row === row)) continue;
      candidates.push({ col, row });
    }
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
