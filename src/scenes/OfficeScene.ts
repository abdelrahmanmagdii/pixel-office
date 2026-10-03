import Phaser from 'phaser';
import type { AgentStatus } from '../data/agents';
import { AGENTS, TASK_POOL } from '../data/agents';
import { Agent } from '../entities/Agent';
import type { Grid } from '../systems/Pathfinding';
import { emptyGrid } from '../systems/Pathfinding';
import type { TileKind } from '../utils/constants';
import {
  BOSS_DESK,
  CAMERA,
  COFFEE_SPOT,
  EMPTY_DESKS,
  MAP_COLS,
  MAP_ROWS,
  TILE,
  WALL_WINDOWS,
  ZONES,
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

type DayPhase = 'day' | 'dusk' | 'night';

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
  private chiefReactionTimer = 14 + Math.random() * 8;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private floorLayer!: Phaser.GameObjects.Container;
  private glows: { agent: Agent; glow: Phaser.GameObjects.Ellipse }[] = [];
  private dayPhase: DayPhase = 'day';
  private clockHands!: Phaser.GameObjects.Graphics;

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
    this.buildAmbience();
    this.setupCamera();
    this.setupInput();

    (window as unknown as { __pixelOffice: PixelOfficeApi }).__pixelOffice = {
      randomizeBusy: () => this.randomizeBusy(),
      toggleCoS: () => this.toggleCoS(),
      isCoSOnFloor: () => this.cosOnFloor,
      setStatus: (id: string, status: AgentStatus) => this.setStatus(id, status),
      startDemo: () => this.startDemo(),
      stopDemo: () => this.stopDemo(),
    };
  }

  update(t: number, dtMs: number): void {
    const dt = Math.min(dtMs / 1000, 0.05);
    this.panCamera(dt);
    for (const a of this.agents) a.updateAgent(dt);
    this.chiefReact(dt);
    this.updateGlows(t, dt);
  }

  private buildMap(): TileKind[][] {
    // v5: near-black wall edges + dark gray hallway strips, then espresso wood
    // Left/right: wall | hallway | wood … wood | hallway | wall (sharp vertical cut)
    return Array.from({ length: MAP_ROWS }, (_, row) =>
      Array.from({ length: MAP_COLS }, (_, col) => {
        if (row === 0) {
          if (col === 0 || col === MAP_COLS - 1) return 'wall';
          return WALL_WINDOWS.includes(col) ? 'window' : 'wallface';
        }
        if (row === MAP_ROWS - 1) return 'wall';
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


  /** Block 3×2 tile desk footprint south of the seat (seat row stays walkable). */
  private blockDeskFootprint(grid: Grid, seatCol: number, seatRow: number): void {
    for (let dc = seatCol - 1; dc <= seatCol + 1; dc++) {
      for (let dr = seatRow + 1; dr <= seatRow + 2; dr++) {
        if (dr >= 0 && dr < MAP_ROWS && dc >= 0 && dc < MAP_COLS) {
          grid[dr][dc] = false;
        }
      }
    }
  }

  /** Boss desk 128×64 ≈ 4×2 south of Chief stand; stand stays walkable. */
  private blockBossDeskFootprint(grid: Grid): void {
    const { standCol, standRow } = BOSS_DESK;
    for (let dc = standCol - 2; dc <= standCol + 1; dc++) {
      for (let dr = standRow + 1; dr <= standRow + 2; dr++) {
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
      [5, 15],
      [22, 8],
    ];
  }

  private frameFor(k: TileKind): number {
    switch (k) {
      case 'wall':
        return TILE_FRAME.wall;
      case 'wallface':
        return TILE_FRAME.wallface;
      case 'window':
        return TILE_FRAME.window;
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

    for (const z of ZONES) {
      const x0 = 6.75 * TILE;
      const y0 = (z.seatRow - 0.4) * TILE;
      this.add
        .nineslice(x0, y0, 'rug', undefined, 15.5 * TILE, 2.9 * TILE, 8, 8, 8, 8)
        .setOrigin(0, 0)
        .setTint(z.tint)
        .setAlpha(0.8)
        .setDepth(1);
      // Vertical sign on the rug's west edge, clear of chairs and nameplates
      this.zoneChip(x0 - 1, y0 + 1.45 * TILE, z.label).setOrigin(0.5, 1).setRotation(-Math.PI / 2);
    }

    // STARBASE poster on the north-wall whiteboard
    this.add
      .text(14 * TILE + 16, 1 * TILE + 20, '★ STARBASE 2026', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#fbbf24',
      })
      .setOrigin(0.5)
      .setDepth(1002)
      .setAlpha(0.95);
  }

  private zoneChip(x: number, y: number, label: string): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#e7e5e4',
        backgroundColor: '#1c1917b3',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0, 1)
      .setResolution(2)
      .setDepth(3);
  }

  private placeFurniture(): void {
    // Agents sit NORTH of their desk facing the camera; we see the backs of the screens.
    // Depth is y-sorted with agents (1000 + row) so walkers pass in front/behind correctly.
    const prop = (col: number, row: number, key: string, yOff = 28, originY = 1) =>
      this.add
        .image(col * TILE + 16, row * TILE + yOff, key)
        .setOrigin(0.5, originY)
        .setDepth(1000 + row + 0.9);
    const placeDesk = (seatCol: number, seatRow: number, key: string) =>
      this.add
        .image(seatCol * TILE + TILE / 2, seatRow * TILE + 4, key)
        .setOrigin(0.5, 0)
        .setDepth(1000 + seatRow + 0.5);
    const placeChair = (seatCol: number, seatRow: number) =>
      this.add
        .image(seatCol * TILE + TILE / 2, seatRow * TILE + TILE / 2, 'chair')
        .setOrigin(0.5, 0.7)
        .setDepth(1000 + seatRow - 0.5);

    placeDesk(BOSS_DESK.standCol, BOSS_DESK.standRow, 'desk-boss-back');

    const LAPTOP_IDS = new Set(['linkedin', 'x', 'reddit', 'travel', 'deal']);
    for (const a of AGENTS) {
      if (a.isChief) continue;
      placeChair(a.desk.col, a.desk.row);
      placeDesk(a.desk.col, a.desk.row, LAPTOP_IDS.has(a.id) ? 'desk-laptop-back' : 'desk-back');
    }

    for (const d of EMPTY_DESKS) {
      placeChair(d.col, d.row);
      placeDesk(d.col, d.row, d.key === 'desk-empty' ? d.key : `${d.key}-back`);
    }

    // North wall
    prop(4, 1, 'filing-cabinet');
    prop(6, 1, 'plant-large');
    prop(8, 1, 'boxes');
    prop(10, 1, 'bookshelf');
    prop(14, 1, 'whiteboard', 20, 0.5);
    prop(18, 1, 'plant-tall');
    prop(20, 1, 'boxes');
    prop(22, 1, 'filing-cabinet');

    // West wood edge (col 2) — hallway col 1 stays clear
    prop(2, 4, 'plant-large');
    prop(2, 7, 'side-table');
    prop(2, 11, 'plant-tall');
    prop(2, 15, 'plant');

    // East wood edge (col 25) — hallway col 26 stays clear
    prop(25, 4, 'cooler');
    prop(25, 7, 'bench');
    prop(25, 14, 'trash');

    // Sparse aisle accents
    prop(5, 15, 'plant');
    prop(22, 8, 'plant-succulent');

    // Boss flanks
    prop(9, 15, 'plant-tall');
    prop(19, 15, 'plant-large');

    // Break corner (SE)
    prop(24, 15, 'cooler');
    prop(23, 15, 'coffee-station');
    prop(23, 17, 'bookshelf');
    prop(25, 17, 'boxes');
    prop(22, 17, 'trash');
    this.zoneChip(24 * TILE, 14 * TILE + 14, 'BREAK').setOrigin(0.5, 1).setDepth(1020);
  }

  /** Wall clock, day/night tint and per-desk screen glow. */
  private buildAmbience(): void {
    const cx = 9 * TILE + 16;
    const cy = 14;
    this.add.image(cx, cy, 'clock').setDepth(2);
    this.clockHands = this.add.graphics().setDepth(2);
    const drawClock = () => {
      const d = new Date();
      const h = ((d.getHours() % 12) + d.getMinutes() / 60) / 12;
      const m = d.getMinutes() / 60;
      const g = this.clockHands;
      g.clear();
      g.lineStyle(1, 0x1c1917, 1);
      g.lineBetween(cx, cy, cx + Math.sin(h * Math.PI * 2) * 3, cy - Math.cos(h * Math.PI * 2) * 3);
      g.lineBetween(cx, cy, cx + Math.sin(m * Math.PI * 2) * 5, cy - Math.cos(m * Math.PI * 2) * 5);
    };
    drawClock();
    this.time.addEvent({ delay: 30_000, loop: true, callback: drawClock });

    this.dayPhase = this.resolveDayPhase();
    const tint =
      this.dayPhase === 'night'
        ? { color: 0x0b1640, alpha: 0.32 }
        : this.dayPhase === 'dusk'
          ? { color: 0xf59e0b, alpha: 0.08 }
          : null;
    if (tint) {
      this.add
        .rectangle(0, 0, MAP_COLS * TILE, MAP_ROWS * TILE, tint.color, tint.alpha)
        .setOrigin(0)
        .setDepth(3000);
    }

    for (const a of this.agents) {
      const seat = a.def.isChief ? { col: BOSS_DESK.standCol, row: BOSS_DESK.standRow } : a.def.desk;
      const glow = this.add
        .ellipse(seat.col * TILE + TILE / 2, seat.row * TILE + 4, a.def.isChief ? 72 : 40, 18, 0x7dd3fc)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(3001);
      this.glows.push({ agent: a, glow });
    }
  }

  /** `?time=day|dusk|night` overrides the local clock (handy for screenshots). */
  private resolveDayPhase(): DayPhase {
    const q = new URLSearchParams(window.location.search).get('time');
    if (q === 'day' || q === 'dusk' || q === 'night') return q;
    const h = new Date().getHours();
    if (h >= 20 || h < 6) return 'night';
    if (h >= 17 || h < 8) return 'dusk';
    return 'day';
  }

  private updateGlows(t: number, dt: number): void {
    const boost = this.dayPhase === 'night' ? 1.6 : 1;
    this.glows.forEach(({ agent, glow }, i) => {
      const target = agent.isTyping() ? (0.16 + 0.05 * Math.sin(t / 260 + i * 1.7)) * boost : 0;
      glow.setAlpha(glow.alpha + (target - glow.alpha) * Math.min(1, dt * 5));
    });
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
        agent.setCoffeeSpot(COFFEE_SPOT);
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
    const cam = this.cameras.main;
    cam.setBackgroundColor(0x0b1220);
    cam.setZoom(this.fitZoom());
    cam.centerOn((MAP_COLS * TILE) / 2, (MAP_ROWS * TILE) / 2);
    // Own clamp (not setBounds) so a map smaller than the view stays centered.
    this.events.on('postupdate', () => this.clampCamera());
  }

  /** Start zoom: whole map on desktop; full height (desks fill the width) on narrow screens. */
  private fitZoom(): number {
    const { width, height } = this.scale;
    const byW = width / (MAP_COLS * TILE);
    const byH = height / (MAP_ROWS * TILE);
    const fit = width < 720 ? byH * 0.95 : Math.min(byW, byH);
    return Phaser.Math.Clamp(fit, CAMERA.minZoom, CAMERA.defaultZoom);
  }

  /** Lowest useful zoom: a little smaller than the whole map. */
  private minZoom(): number {
    const { width, height } = this.scale;
    const contain = Math.min(width / (MAP_COLS * TILE), height / (MAP_ROWS * TILE));
    return Math.max(CAMERA.minZoom, Math.min(contain * 0.9, CAMERA.defaultZoom));
  }

  private clampCamera(): void {
    const cam = this.cameras.main;
    const axis = (scroll: number, size: number, map: number) => {
      const view = size / cam.zoom;
      const mid = scroll + size / 2;
      const m = view >= map ? map / 2 : Phaser.Math.Clamp(mid, view / 2, map - view / 2);
      return m - size / 2;
    };
    cam.scrollX = axis(cam.scrollX, cam.width, MAP_COLS * TILE);
    cam.scrollY = axis(cam.scrollY, cam.height, MAP_ROWS * TILE);
  }

  /** Zoom while keeping the world point under (sx, sy) fixed. */
  private zoomAt(next: number, sx: number, sy: number): void {
    const cam = this.cameras.main;
    const z = Phaser.Math.Clamp(next, this.minZoom(), CAMERA.maxZoom);
    const wx = cam.scrollX + cam.width / 2 + (sx - cam.width / 2) / cam.zoom;
    const wy = cam.scrollY + cam.height / 2 + (sy - cam.height / 2) / cam.zoom;
    cam.setZoom(z);
    cam.scrollX = wx - (sx - cam.width / 2) / z - cam.width / 2;
    cam.scrollY = wy - (sy - cam.height / 2) / z - cam.height / 2;
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
    this.input.addPointer(1);

    this.input.on('wheel', (p: Phaser.Input.Pointer, _g: unknown, _x: number, dy: number) => {
      this.zoomAt(this.cameras.main.zoom * (1 - dy * 0.0015), p.x, p.y);
    });

    // Drag (mouse or one finger) pans; pinch zooms; a press without movement is a tap.
    let dragging = false;
    let moved = false;
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;
    let pinchDist = 0;
    const p1 = this.input.pointer1;
    const p2 = this.input.pointer2;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.demoMode) this.stopDemo();
      if (p1.isDown && p2.isDown) {
        pinchDist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        moved = true;
        return;
      }
      if (p.rightButtonDown()) return;
      dragging = true;
      moved = false;
      downX = lastX = p.x;
      downY = lastY = p.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const cam = this.cameras.main;
      if (p1.isDown && p2.isDown) {
        const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (pinchDist > 0) this.zoomAt(cam.zoom * (d / pinchDist), (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        pinchDist = d;
        return;
      }
      if (!dragging || !p.isDown) return;
      if (!moved && Phaser.Math.Distance.Between(p.x, p.y, downX, downY) > 6) moved = true;
      if (!moved) return;
      cam.scrollX -= (p.x - lastX) / cam.zoom;
      cam.scrollY -= (p.y - lastY) / cam.zoom;
      lastX = p.x;
      lastY = p.y;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const wasTap = dragging && !moved && p.button === 0;
      dragging = false;
      if (!p1.isDown && !p2.isDown) pinchDist = 0;
      if (wasTap) this.handleTap(p);
    });
  }

  private handleTap(p: Phaser.Input.Pointer): void {
    const world = this.cameras.main.getWorldPoint(p.x, p.y);
    // Scale tap radius with zoom so targets stay hittable when zoomed out
    const radius = Phaser.Math.Clamp(28 / this.cameras.main.zoom, 16, 42);
    let best: Agent | null = null;
    let bestDist = radius;
    for (const a of this.agents) {
      const d = Phaser.Math.Distance.Between(world.x, world.y, a.x, a.y - 14);
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
    for (const a of this.agents) a.dismissBubble();
    this.selectAgent(null);
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

  /** Chief occasionally calls out idle or waiting agents from the boss desk. */
  private chiefReact(dt: number): void {
    const chief = this.agents.find((a) => a.def.isChief);
    if (!chief || chief.status !== 'working' || chief.location !== 'office') return;
    this.chiefReactionTimer -= dt;
    if (this.chiefReactionTimer > 0) return;
    this.chiefReactionTimer = 16 + Math.random() * 10;
    const idlers = this.agents.filter((a) => !a.def.isChief && a.status === 'idle');
    const waiters = this.agents.filter((a) => !a.def.isChief && a.status === 'waiting');
    let line: string;
    if (idlers.length) {
      const target = idlers[Math.floor(Math.random() * idlers.length)];
      line = `${target.def.name}, back to work.`;
    } else if (waiters.length) {
      const target = waiters[Math.floor(Math.random() * waiters.length)];
      line = `${target.def.name}, what is the holdup?`;
    } else {
      line = 'Floor is humming. Good work.';
    }
    chief.say(line);
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
    const fit = this.fitZoom();
    const spots = [
      { x: 464, y: 450, zoom: 1.9 },
      { x: 464, y: 140, zoom: 1.6 },
      { x: 464, y: 270, zoom: 1.4 },
      { x: 768, y: 500, zoom: 2 },
      { x: 448, y: 320, zoom: fit },
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
