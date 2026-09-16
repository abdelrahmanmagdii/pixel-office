import Phaser from 'phaser';
import type { AgentStatus } from '../data/agents';
import { AGENTS, TASK_POOL, officeTitle } from '../data/agents';
import { Agent } from '../entities/Agent';
import type { Grid } from '../systems/Pathfinding';
import { emptyGrid } from '../systems/Pathfinding';
import type { TileKind } from '../utils/constants';
import {
  BOSS_DESK,
  EMPTY_DESKS,
  CAMERA,
  MAP_COLS,
  MAP_ROWS,
  TILE,
} from '../utils/constants';
import { createAgentAnims, preloadAssets, TILE_FRAME } from '../utils/PixelArt';

export type PanelPayload = {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  lastTask: string;
  color: string;
  location: string;
  isChief: boolean;
};

type UiHooks = {
  onSelect: (payload: PanelPayload | null) => void;
};

export class OfficeScene extends Phaser.Scene {
  private tiles!: TileKind[][];
  private grid!: Grid;
  private agents: Agent[] = [];
  private selected: Agent | null = null;
  private hooks!: UiHooks;
  private cosOnFloor = false;
  private demoMode = false;
  private demoTimer: Phaser.Time.TimerEvent | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private floorLayer!: Phaser.GameObjects.Container;

  constructor() {
    super('Office');
  }

  init(data: { hooks: UiHooks }): void {
    this.hooks = data.hooks;
  }

  preload(): void {
    preloadAssets(this);
  }

  create(): void {
    createAgentAnims(this);
    this.tiles = this.buildMap();
    this.grid = this.buildWalkGrid();
    this.floorLayer = this.add.container(0, 0);
    this.drawMap();
    this.placeFurniture();
    this.spawnAgents();
    this.setupCamera();
    this.setupInput();

    this.add
      .text(MAP_COLS * TILE - 8, 8, officeTitle, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#94a3b8',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(5000)
      .setAlpha(0.85);

    (window as unknown as { __pixelOffice: PixelOfficeApi }).__pixelOffice = {
      randomizeBusy: () => this.randomizeBusy(),
      toggleCoS: () => this.toggleCoS(),
      isCoSOnFloor: () => this.cosOnFloor,
      setStatus: (id: string, status: AgentStatus) => this.setStatus(id, status),
      startDemo: () => this.startDemo(),
      stopDemo: () => this.stopDemo(),
    };
  }

  update(_t: number, dtMs: number): void {
    const dt = Math.min(dtMs / 1000, 0.05);
    this.panCamera(dt);
    for (const a of this.agents) a.updateAgent(dt);
  }

  private buildMap(): TileKind[][] {
    // v5: near-black wall edges + dark gray hallway strips, then espresso wood
    // Left/right: wall | hallway | wood … wood | hallway | wall (sharp vertical cut)
    return Array.from({ length: MAP_ROWS }, (_, row) =>
      Array.from({ length: MAP_COLS }, (_, col) => {
        if (row === 0 || row === MAP_ROWS - 1) return 'wall';
        if (col === 0 || col === MAP_COLS - 1) return 'wall';
        if (col === 1 || col === MAP_COLS - 2) return 'hallway';
        return 'floor';
      }),
    );
  }

  private buildWalkGrid(): Grid {
    const grid = emptyGrid(false);
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const k = this.tiles[row][col];
        grid[row][col] = k === 'floor' || k === 'hallway' || k === 'carpet' || k === 'door';
      }
    }
    // Agent desks 96×64 ≈ 3×2; seat/stand tile stays walkable
    for (const a of AGENTS) {
      if (a.isChief) continue;
      this.blockDeskFootprint(grid, a.desk.col, a.desk.row);
    }
    for (const d of EMPTY_DESKS) {
      this.blockDeskFootprint(grid, d.col, d.row);
    }
    this.blockBossDeskFootprint(grid);

    for (const [c, r] of this.blockingProps()) {
      if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) grid[r][c] = false;
    }

    return grid;
  }


  /** Block 3×2 tile desk footprint north of the seat (seat row stays walkable). */
  private blockDeskFootprint(grid: Grid, seatCol: number, seatRow: number): void {
    for (let dc = seatCol - 1; dc <= seatCol + 1; dc++) {
      for (let dr = seatRow - 2; dr <= seatRow - 1; dr++) {
        if (dr >= 0 && dr < MAP_ROWS && dc >= 0 && dc < MAP_COLS) {
          grid[dr][dc] = false;
        }
      }
    }
  }

  /** Boss desk 128×64 ≈ 4×2 north of Chief stand; stand stays walkable. */
  private blockBossDeskFootprint(grid: Grid): void {
    const { standCol, standRow } = BOSS_DESK;
    for (let dc = standCol - 2; dc <= standCol + 1; dc++) {
      for (let dr = standRow - 2; dr <= standRow - 1; dr++) {
        if (dr >= 0 && dr < MAP_ROWS && dc >= 0 && dc < MAP_COLS) {
          grid[dr][dc] = false;
        }
      }
    }
  }

  /** Tile cells occupied by non-walkable props (must match placeFurniture). */
  private blockingProps(): [number, number][] {
    return [
      // north wall edge props (on wood, row 1)
      [4, 1],
      [6, 1],
      [8, 1],
      [10, 1],
      [14, 1],
      [18, 1],
      [20, 1],
      [22, 1],
      // west wood edge (col 2 — hallway col 1 stays clear)
      [2, 4],
      [2, 7],
      [2, 11],
      [2, 15],
      // east wood edge (col 25 — hallway col 26 stays clear)
      [25, 4],
      [25, 7],
      [25, 11],
      [25, 14],
      // break corner (SE)
      [23, 15],
      [24, 15],
      [22, 17],
      [23, 17],
      [25, 17],
      // light props near boss (not desk silhouette)
      [9, 15],
      [19, 15],
      // sparse aisle accents
      [6, 12],
      [22, 8],
    ];
  }

  private frameFor(k: TileKind): number {
    switch (k) {
      case 'wall':
        return TILE_FRAME.wall;
      case 'hallway':
        return TILE_FRAME.gray;
      case 'glass':
        return TILE_FRAME.glass;
      case 'door':
        return TILE_FRAME.door;
      case 'carpet':
        return TILE_FRAME.carpet;
      default:
        return TILE_FRAME.floor;
    }
  }

  private drawMap(): void {
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const img = this.add
          .image(
            col * TILE + TILE / 2,
            row * TILE + TILE / 2,
            'tileset',
            this.frameFor(this.tiles[row][col]),
          )
          .setDepth(0);
        this.floorLayer.add(img);
      }
    }

    this.add
      .text(14 * TILE, 2 * TILE, 'MAIN FLOOR', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#78716c',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const zoneLabel = (col: number, row: number, label: string) => {
      this.add
        .text(col * TILE, row * TILE, label, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#78716c',
        })
        .setOrigin(0.5)
        .setDepth(2)
        .setAlpha(0.6);
    };
    zoneLabel(14, 5, 'ENGINEERING');
    zoneLabel(14, 9, 'OPERATIONS');
    zoneLabel(14, 13, 'PRODUCT');

    // STARBASE poster on the north-wall whiteboard
    this.add
      .text(14 * TILE + 16, 1 * TILE + 20, '★ STARBASE 2026', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#fbbf24',
      })
      .setOrigin(0.5)
      .setDepth(7)
      .setAlpha(0.95);

    this.add
      .text(BOSS_DESK.standCol * TILE + TILE / 2, (BOSS_DESK.standRow - 3) * TILE, 'CHIEF', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fbbf24',
      })
      .setOrigin(0.5, 0)
      .setDepth(2);
  }

  private placeFurniture(): void {
    // Furniture v2: desks 96×64 (origin bottom-center), stools/chairs 48×48
    const placeDesk = (seatCol: number, seatRow: number, key: string) => {
      const x = seatCol * TILE + TILE / 2;
      const y = seatRow * TILE; // front edge of desk / north of seat
      this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(5);
    };
    const placeSeat = (seatCol: number, seatRow: number, key: string) => {
      this.add
        .image(seatCol * TILE + TILE / 2, seatRow * TILE + TILE / 2, key)
        .setOrigin(0.5, 0.7)
        .setDepth(4);
    };

    // --- Boss desk: single desk-boss.png (128×64). Chief stands SOUTH in front, facing camera ---
    {
      const { standCol, standRow } = BOSS_DESK;
      const x = standCol * TILE + TILE / 2;
      const y = standRow * TILE;
      this.add.image(x, y, 'desk-boss').setOrigin(0.5, 1).setDepth(5);
    }

    // --- Agent desks: mix monitor / laptop + stools ---
    let deskIdx = 0;
    for (const a of AGENTS) {
      if (a.isChief) continue;
      const deskKey = deskIdx % 2 === 0 ? 'desk' : 'desk-laptop';
      deskIdx += 1;
      placeDesk(a.desk.col, a.desk.row, deskKey);
      placeSeat(a.desk.col, a.desk.row, 'stool');
      this.add
        .text(a.desk.col * TILE + TILE / 2, (a.desk.row - 2) * TILE + 4, a.name.split(' ')[0], {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#44403c',
        })
        .setOrigin(0.5, 0)
        .setDepth(6);
    }

    // --- v5 empty desks (no agents) — desk-empty sprites; keep Chief front clear ---
    for (const d of EMPTY_DESKS) {
      placeDesk(d.col, d.row, d.key);
      placeSeat(d.col, d.row, 'stool');
    }

    // --- v5 edge props on wood beside hallway strips; bigger plants ---
    // North wall
    this.add.image(4 * TILE + 16, 1 * TILE + 28, 'filing-cabinet').setOrigin(0.5, 1).setDepth(6);
    this.add.image(6 * TILE + 16, 1 * TILE + 28, 'plant-large').setOrigin(0.5, 1).setDepth(6);
    this.add.image(8 * TILE + 16, 1 * TILE + 28, 'boxes').setOrigin(0.5, 1).setDepth(6);
    this.add.image(10 * TILE + 16, 1 * TILE + 28, 'bookshelf').setOrigin(0.5, 1).setDepth(6);
    this.add.image(14 * TILE + 16, 1 * TILE + 20, 'whiteboard').setOrigin(0.5, 0.5).setDepth(6);
    this.add.image(18 * TILE + 16, 1 * TILE + 28, 'plant-tall').setOrigin(0.5, 1).setDepth(6);
    this.add.image(20 * TILE + 16, 1 * TILE + 28, 'boxes').setOrigin(0.5, 1).setDepth(6);
    this.add.image(22 * TILE + 16, 1 * TILE + 28, 'filing-cabinet').setOrigin(0.5, 1).setDepth(6);

    // West wood edge (col 2) — hallway col 1 stays clear
    this.add.image(2 * TILE + 16, 4 * TILE + 28, 'plant-large').setOrigin(0.5, 1).setDepth(6);
    this.add.image(2 * TILE + 16, 7 * TILE + 28, 'side-table').setOrigin(0.5, 1).setDepth(6);
    this.add.image(2 * TILE + 16, 11 * TILE + 28, 'plant-tall').setOrigin(0.5, 1).setDepth(6);
    this.add.image(2 * TILE + 16, 15 * TILE + 28, 'plant').setOrigin(0.5, 1).setDepth(6);

    // East wood edge (col 25) — hallway col 26 stays clear
    this.add.image(25 * TILE + 16, 4 * TILE + 28, 'cooler').setOrigin(0.5, 1).setDepth(6);
    this.add.image(25 * TILE + 16, 7 * TILE + 28, 'bench').setOrigin(0.5, 1).setDepth(6);
    this.add.image(25 * TILE + 16, 11 * TILE + 28, 'plant-large').setOrigin(0.5, 1).setDepth(6);
    this.add.image(25 * TILE + 16, 14 * TILE + 28, 'trash').setOrigin(0.5, 1).setDepth(6);

    // Sparse aisle accents
    this.add.image(6 * TILE + 16, 12 * TILE + 28, 'plant').setOrigin(0.5, 1).setDepth(6);
    this.add.image(22 * TILE + 16, 8 * TILE + 28, 'plant-succulent').setOrigin(0.5, 1).setDepth(6);

    // Boss flanks — larger plants, clear of desk silhouette
    this.add.image(9 * TILE + 16, 15 * TILE + 28, 'plant-tall').setOrigin(0.5, 1).setDepth(6);
    this.add.image(19 * TILE + 16, 15 * TILE + 28, 'plant-large').setOrigin(0.5, 1).setDepth(6);

    // --- Break corner (SE) ---
    this.add.image(24 * TILE + 16, 15 * TILE + 28, 'cooler').setOrigin(0.5, 1).setDepth(7);
    this.add.image(23 * TILE + 16, 15 * TILE + 28, 'coffee-station').setOrigin(0.5, 1).setDepth(7);
    this.add.image(23 * TILE + 16, 17 * TILE + 28, 'bookshelf').setOrigin(0.5, 1).setDepth(7);
    this.add.image(25 * TILE + 16, 17 * TILE + 28, 'boxes').setOrigin(0.5, 1).setDepth(6);
    this.add.image(22 * TILE + 16, 17 * TILE + 28, 'trash').setOrigin(0.5, 1).setDepth(6);

    this.add
      .text(24 * TILE + 16, 14 * TILE + 8, 'BREAK', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#78716c',
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  private spawnAgents(): void {
    for (const def of AGENTS) {
      let start = { ...def.desk };
      let officeSeat: { col: number; row: number } | undefined;
      if (def.isChief) {
        officeSeat = { col: BOSS_DESK.standCol, row: BOSS_DESK.standRow };
        start = { ...officeSeat };
      }
      const agent = new Agent(this, def, this.grid, start.col, start.row, officeSeat);
      if (def.isChief) {
        agent.location = 'office'; // posted at boss desk (standing)
        agent.setWanderRegion(null);
      } else {
        // Main-floor wander so idle agents aren't frozen statues
        agent.setWanderRegion({ x0: 2, y0: 2, x1: 25, y1: 16 });
      }
      this.agents.push(agent);
    }
  }

  private selectAgent(agent: Agent | null): void {
    if (this.selected) this.selected.setSelected(false);
    this.selected = agent;
    if (!agent) {
      this.hooks.onSelect(null);
      return;
    }
    agent.setSelected(true);
    this.hooks.onSelect({
      id: agent.def.id,
      name: agent.def.name,
      role: agent.def.role,
      status: agent.status,
      lastTask: agent.lastTask,
      color: '#' + agent.def.color.toString(16).padStart(6, '0'),
      location: agent.def.isChief
        ? agent.location === 'office'
          ? 'Boss desk'
          : 'Floor patrol'
        : 'Main floor',
      isChief: Boolean(agent.def.isChief),
    });
  }

  private setupCamera(): void {
    const w = MAP_COLS * TILE;
    const h = MAP_ROWS * TILE;
    this.cameras.main.setBounds(0, 0, w, h);
    // Start on main floor desk cluster at a tighter zoom (scroll still adjusts)
    this.cameras.main.centerOn(
      CAMERA.startCol * TILE + TILE / 2,
      CAMERA.startRow * TILE + TILE / 2,
    );
    this.cameras.main.setZoom(CAMERA.defaultZoom);
    this.cameras.main.setBackgroundColor(0x0b1220);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;

    this.input.on('wheel', (_p: unknown, _g: unknown, _x: number, dy: number) => {
      const cam = this.cameras.main;
      const next = Phaser.Math.Clamp(
        cam.zoom - dy * 0.0015,
        CAMERA.minZoom,
        CAMERA.maxZoom,
      );
      cam.setZoom(next);
    });

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.demoMode) this.stopDemo();
      if (p.middleButtonDown() || (p.leftButtonDown() && p.event.shiftKey)) {
        dragging = true;
        lastX = p.x;
        lastY = p.y;
        return;
      }
      if (!p.leftButtonDown()) return;

      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      // Scale click radius with zoom, so targets stay clickable when zoomed out
      const clickRadius = Phaser.Math.Clamp(28 / this.cameras.main.zoom, 16, 42);
      let best: Agent | null = null;
      let bestDist = clickRadius;
      for (const a of this.agents) {
        const d = Phaser.Math.Distance.Between(world.x, world.y, a.x, a.y - 6);
        if (d < bestDist) {
          bestDist = d;
          best = a;
        }
      }
      if (best) {
        // Second click on the Chief toggles Desk <-> Patrol
        const wasSelected = this.selected === best;
        best.dismissBubble();
        this.selectAgent(best);
        if (wasSelected && best.def.isChief) this.toggleCoS();
        return;
      }

      // Empty floor: dismiss all bubbles + deselect; soft pan/focus to click
      for (const a of this.agents) a.dismissBubble();
      this.selectAgent(null);
      this.cameras.main.pan(world.x, world.y, 220, 'Sine.easeInOut');
    });
    this.input.on('pointerup', () => {
      dragging = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging) return;
      const cam = this.cameras.main;
      cam.scrollX -= (p.x - lastX) / cam.zoom;
      cam.scrollY -= (p.y - lastY) / cam.zoom;
      lastX = p.x;
      lastY = p.y;
    });
  }

  private panCamera(dt: number): void {
    const cam = this.cameras.main;
    const sp = (CAMERA.panSpeed * dt) / cam.zoom;
    if (this.cursors.left?.isDown || this.wasd.A.isDown) cam.scrollX -= sp;
    if (this.cursors.right?.isDown || this.wasd.D.isDown) cam.scrollX += sp;
    if (this.cursors.up?.isDown || this.wasd.W.isDown) cam.scrollY -= sp;
    if (this.cursors.down?.isDown || this.wasd.S.isDown) cam.scrollY += sp;
  }

  private syncCoSButtonLabel(): void {
    const btn = document.getElementById('btn-toggle-cos');
    if (!btn) return;
    btn.textContent = this.cosOnFloor ? 'Toggle CoS: Patrol' : 'Toggle CoS: Desk';
  }

  randomizeBusy(): void {
    const statuses: AgentStatus[] = ['idle', 'working', 'waiting'];
    for (const a of this.agents) {
      const next = statuses[Math.floor(Math.random() * statuses.length)];
      a.lastTask = TASK_POOL[Math.floor(Math.random() * TASK_POOL.length)];
      a.applyStatus(next);
    }
    if (this.selected) this.selectAgent(this.selected);
  }

  /** Patrol (floor) vs posted at boss desk (office). Default = desk. */
  toggleCoS(): boolean {
    this.cosOnFloor = !this.cosOnFloor;
    const cos = this.agents.find((a) => a.def.isChief);
    if (cos) {
      cos.goToLocation(this.cosOnFloor ? 'floor' : 'office');
      if (this.selected === cos) this.selectAgent(cos);
    }
    this.syncCoSButtonLabel();
    return this.cosOnFloor;
  }

  /** Set a single agent's status from the panel. */
  setStatus(id: string, status: AgentStatus): void {
    const a = this.agents.find((x) => x.def.id === id);
    if (!a) return;
    a.lastTask = TASK_POOL[Math.floor(Math.random() * TASK_POOL.length)];
    a.applyStatus(status);
    if (this.selected === a) this.selectAgent(a);
  }

  /** Cinematic camera tour for demos and screen recordings. */
  startDemo(): void {
    if (this.demoMode) return;
    this.demoMode = true;
    const cam = this.cameras.main;
    const spots = [
      { x: 464, y: 560, zoom: 1.9 },
      { x: 480, y: 236, zoom: 1.5 },
      { x: 470, y: 380, zoom: 1.3 },
      { x: 784, y: 480, zoom: 2 },
      { x: 496, y: 330, zoom: 0.72 },
      { x: 496, y: 304, zoom: 1.4 },
    ];
    const step = (i: number): void => {
      if (!this.demoMode) return;
      if (i >= spots.length) {
        this.demoMode = false;
        window.dispatchEvent(new Event('pixel-office:demo-end'));
        return;
      }
      const s = spots[i];
      cam.pan(s.x, s.y, 1800, 'Sine.easeInOut');
      cam.zoomTo(s.zoom, 1800, 'Sine.easeInOut');
      this.demoTimer = this.time.delayedCall(2100, () => step(i + 1));
    };
    step(0);
  }

  stopDemo(): void {
    this.demoMode = false;
    if (this.demoTimer) {
      this.demoTimer.remove();
      this.demoTimer = null;
    }
    window.dispatchEvent(new Event('pixel-office:demo-end'));
  }
}

export type PixelOfficeApi = {
  randomizeBusy: () => void;
  toggleCoS: () => boolean;
  isCoSOnFloor: () => boolean;
  setStatus: (id: string, status: AgentStatus) => void;
  startDemo: () => void;
  stopDemo: () => void;
};
