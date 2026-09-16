import Phaser from 'phaser';
import type { AgentDef, AgentStatus } from '../data/agents';
import { IDLE_LINES, WAITING_LINES, WORKING_LINES } from '../data/agents';
import { TILE } from '../utils/constants';
import type { Grid } from '../systems/Pathfinding';
import { findPath, randomWalkableTile } from '../systems/Pathfinding';

export type AgentLocation = 'floor' | 'office';
type Facing = 'down' | 'up' | 'left' | 'right';

export class Agent extends Phaser.GameObjects.Container {
  readonly def: AgentDef;
  status: AgentStatus;
  lastTask: string;
  location: AgentLocation = 'floor';

  private sprite: Phaser.GameObjects.Sprite;
  private bubble?: Phaser.GameObjects.Container;
  private label: Phaser.GameObjects.Text;
  private path: { col: number; row: number }[] = [];
  private moveSpeed = 70; // px/sec
  private idleTimer = 0;
  private bubbleTimer = 0;
  private grid: Grid;
  private deskSeat: { col: number; row: number };
  private officeSeat: { col: number; row: number } | null = null;
  private selectedRing: Phaser.GameObjects.Graphics;
  private hoverRing: Phaser.GameObjects.Graphics;
  private statusDot: Phaser.GameObjects.Graphics;
  private wanderRegion: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private facing: Facing = 'down';
  private hovered = false;
  private selected = false;

  constructor(
    scene: Phaser.Scene,
    def: AgentDef,
    grid: Grid,
    startCol: number,
    startRow: number,
    officeSeat?: { col: number; row: number },
  ) {
    super(scene, startCol * TILE + TILE / 2, startRow * TILE + TILE / 2);
    this.def = def;
    this.status = def.status;
    this.lastTask = def.lastTask;
    this.grid = grid;
    this.deskSeat = { ...def.desk };
    this.officeSeat = officeSeat ?? null;
    // Chief 'office' = posted at boss desk. Must be set BEFORE applyStatus(working).
    if (def.isChief && this.officeSeat) {
      this.location = 'office';
    }

    // 48×48 chibi on 32px tile grid — feet anchored near tile center
    this.sprite = scene.add.sprite(0, 0, `agent-${def.id}`, 0);
    this.sprite.setOrigin(0.5, 0.88);
    this.sprite.setDisplaySize(48, 48);

    this.label = scene.add
      .text(0, 10, def.name.split(' ')[0], {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#e2e8f0',
        backgroundColor: '#0f172acc',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 0);

    this.selectedRing = scene.add.graphics();
    this.selectedRing.setVisible(false);
    this.hoverRing = scene.add.graphics();
    this.hoverRing.setVisible(false);
    this.statusDot = scene.add.graphics();

    this.add([this.hoverRing, this.selectedRing, this.sprite, this.statusDot, this.label]);
    this.setSize(TILE, TILE);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-24, -44, 48, 52),
      Phaser.Geom.Rectangle.Contains,
    );
    this.input!.cursor = 'pointer';

    this.on('pointerover', () => this.setHovered(true));
    this.on('pointerout', () => this.setHovered(false));

    scene.add.existing(this);
    this.setDepth(1000 + startRow);

    this.applyStatus(this.status, true);
  }

  setSelected(on: boolean): void {
    this.selected = on;
    this.selectedRing.clear();
    this.selectedRing.setVisible(on);
    if (on) {
      // Gold selection wins over hover — hide hover so rings don't fight
      this.hoverRing.clear();
      this.hoverRing.setVisible(false);
      this.selectedRing.lineStyle(2, 0xfbbf24, 1);
      this.selectedRing.strokeCircle(0, -10, 18);
    } else if (this.hovered) {
      this.drawHoverRing();
    }
  }

  private setHovered(on: boolean): void {
    this.hovered = on;
    if (this.selected) {
      // Selected gold takes precedence
      this.hoverRing.clear();
      this.hoverRing.setVisible(false);
      return;
    }
    if (on) this.drawHoverRing();
    else {
      this.hoverRing.clear();
      this.hoverRing.setVisible(false);
    }
  }

  private drawHoverRing(): void {
    this.hoverRing.clear();
    this.hoverRing.setVisible(true);
    // Soft cyan hover — distinct from selected gold
    this.hoverRing.lineStyle(2, 0x22d3ee, 0.75);
    this.hoverRing.strokeCircle(0, -10, 18);
  }

  setWanderRegion(region: { x0: number; y0: number; x1: number; y1: number } | null): void {
    this.wanderRegion = region;
  }

  getTile(): { col: number; row: number } {
    return {
      col: Math.floor(this.x / TILE),
      row: Math.floor(this.y / TILE),
    };
  }

  hasBubble(): boolean {
    return !!this.bubble;
  }

  /** Public dismiss for scene click handling. */
  dismissBubble(): void {
    this.clearBubble();
  }

  applyStatus(status: AgentStatus, immediate = false): void {
    this.status = status;
    this.path = [];
    this.clearBubble();
    this.redrawStatusDot();
    this.bubbleTimer = 4 + Math.random() * 6;

    if (status === 'working') {
      const seat =
        this.def.isChief && this.location === 'office' && this.officeSeat
          ? this.officeSeat
          : this.deskSeat;
      const arrive = () =>
        this.def.isChief && this.location === 'office'
          ? this.standFacingUser()
          : this.sitAndType();
      if (immediate) {
        this.x = seat.col * TILE + TILE / 2;
        this.y = seat.row * TILE + TILE / 2;
        arrive();
      } else {
        this.walkTo(seat.col, seat.row, arrive);
      }
    } else if (status === 'waiting') {
      this.showIdleFrame();
      this.showBubble(Phaser.Utils.Array.GetRandom(WAITING_LINES));
      // Shuffle soon so waiting agents aren't frozen
      this.idleTimer = 1.2 + Math.random() * 2;
    } else {
      this.showIdleFrame();
      // Start wandering quickly so idle motion is visible within ~5s
      this.idleTimer = 0.4 + Math.random() * 1.2;
    }
  }

  /** Move Chief between boss desk (standing) and floor patrol. */
  goToLocation(loc: AgentLocation): void {
    if (!this.def.isChief) return;
    this.location = loc;
    if (loc === 'office') {
      // At boss desk — no wander while posted
      this.setWanderRegion(null);
      const seat = this.officeSeat ?? this.deskSeat;
      if (this.status === 'working') {
        this.walkTo(seat.col, seat.row, () => this.standFacingUser());
      } else {
        this.walkTo(seat.col, seat.row, () => this.standFacingUser());
      }
    } else {
      // Floor patrol across main wood floor
      this.setWanderRegion({ x0: 2, y0: 2, x1: 25, y1: 15 });
      this.showIdleFrame();
      this.idleTimer = 0.2;
      const t = this.getTile();
      this.walkTo(Math.min(20, t.col + 2), Math.max(3, t.row - 3));
    }
  }

  updateAgent(dt: number): void {
    this.setDepth(1000 + Math.floor(this.y / TILE));

    if (this.path.length) {
      this.followPath(dt);
      return;
    }

    if (this.status === 'working') {
      // Stay at desk; occasional mutter bubble
      this.tickOccasionalBubble(dt, WORKING_LINES, 8, 14);
      return;
    }

    if (this.status === 'waiting') {
      this.idleTimer -= dt;
      if (this.idleTimer <= 0) {
        const t = this.getTile();
        const near = randomWalkableTile(this.grid, undefined, {
          x0: Math.max(0, t.col - 2),
          y0: Math.max(0, t.row - 2),
          x1: Math.min(27, t.col + 2),
          y1: Math.min(19, t.row + 2),
        });
        if (near) this.walkTo(near.col, near.row);
        this.showBubble(Phaser.Utils.Array.GetRandom(WAITING_LINES));
        // Noticeable shuffle every ~3–7s
        this.idleTimer = 3 + Math.random() * 4;
      }
      return;
    }

    // idle wander — visible motion within ~5–10s
    this.idleTimer -= dt;
    if (this.idleTimer <= 0) {
      const target = randomWalkableTile(this.grid, [this.getTile()], this.wanderRegion ?? undefined);
      if (target) this.walkTo(target.col, target.row);
      // ~2–5s between walks so motion stays noticeable
      this.idleTimer = 2 + Math.random() * 3;
      // Chance of an idle mutter when starting a wander
      if (Math.random() < 0.35) {
        this.showBubble(Phaser.Utils.Array.GetRandom(IDLE_LINES));
      }
    } else {
      this.tickOccasionalBubble(dt, IDLE_LINES, 7, 12);
    }
  }

  private tickOccasionalBubble(
    dt: number,
    lines: string[],
    minGap: number,
    maxGap: number,
  ): void {
    this.bubbleTimer -= dt;
    if (this.bubbleTimer > 0) return;
    if (!this.bubble && Math.random() < 0.55) {
      this.showBubble(Phaser.Utils.Array.GetRandom(lines));
    }
    this.bubbleTimer = minGap + Math.random() * (maxGap - minGap);
  }

  private sheetKey(): string {
    return `agent-${this.def.id}`;
  }

  private sitAndType(): void {
    this.facing = 'up';
    this.sprite.play(`${this.sheetKey()}-type`, true);
  }

  /** Chief at boss desk: stand facing DOWN toward camera/user (sheet frame 0). */
  private standFacingUser(): void {
    this.facing = 'down';
    this.sprite.stop();
    this.sprite.setTexture(this.sheetKey(), 0);
  }

  private showIdleFrame(): void {
    this.sprite.stop();
    // idle = first down frame
    this.sprite.setTexture(this.sheetKey(), 0);
    this.facing = 'down';
  }

  private playWalk(facing: Facing): void {
    this.facing = facing;
    this.sprite.play(`${this.sheetKey()}-walk-${facing}`, true);
  }

  private walkTo(col: number, row: number, onArrive?: () => void): void {
    const from = this.getTile();
    this.path = findPath(this.grid, from.col, from.row, col, row);
    (this as unknown as { _onArrive?: () => void })._onArrive = onArrive;
    if (!this.path.length && onArrive) onArrive();
  }

  private followPath(dt: number): void {
    const next = this.path[0];
    if (!next) return;
    const tx = next.col * TILE + TILE / 2;
    const ty = next.row * TILE + TILE / 2;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.moveSpeed * dt;
    if (dist <= step) {
      this.x = tx;
      this.y = ty;
      this.path.shift();
      if (!this.path.length) {
        this.sprite.stop();
        // face last direction, standing frame of that dir
        const idleFrame =
          this.facing === 'down'
            ? 0
            : this.facing === 'up'
              ? 2
              : this.facing === 'left'
                ? 4
                : 6;
        this.sprite.setTexture(this.sheetKey(), idleFrame);
        const cb = (this as unknown as { _onArrive?: () => void })._onArrive;
        (this as unknown as { _onArrive?: () => void })._onArrive = undefined;
        cb?.();
      }
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      let facing: Facing;
      if (Math.abs(dx) > Math.abs(dy)) {
        facing = dx < 0 ? 'left' : 'right';
      } else {
        facing = dy < 0 ? 'up' : 'down';
      }
      this.playWalk(facing);
    }
  }

  private redrawStatusDot(): void {
    this.statusDot.clear();
    const color =
      this.status === 'working' ? 0xf87171 : this.status === 'waiting' ? 0xc084fc : 0x34d399;
    this.statusDot.fillStyle(color, 1);
    this.statusDot.fillCircle(12, -28, 3);
    this.statusDot.lineStyle(1, 0x0f172a, 0.8);
    this.statusDot.strokeCircle(12, -28, 3);
  }

  private showBubble(text: string): void {
    this.clearBubble();

    const padX = 8;
    const padY = 6;
    const wrapWidth = 130;
    const slice = 8; // NineSlice corner inset (BUBBLE_SPEC / FURNITURE_SPEC)

    const panelKey =
      this.status === 'working'
        ? 'bubble-9slice-working'
        : this.status === 'waiting'
          ? 'bubble-9slice-waiting'
          : 'bubble-9slice-idle';
    const tailKey =
      this.status === 'working'
        ? 'bubble-tail-working'
        : this.status === 'waiting'
          ? 'bubble-tail-waiting'
          : 'bubble-tail-idle';

    const label = this.scene.add
      .text(0, 0, text, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#1c1814',
        align: 'center',
        wordWrap: { width: wrapWidth },
      })
      .setOrigin(0.5, 0.5);

    const panelW = Math.max(label.width + padX * 2, slice * 2 + 8);
    const panelH = Math.max(label.height + padY * 2, slice * 2 + 4);

    const panel = this.scene.add.nineslice(
      0,
      0,
      panelKey,
      undefined,
      panelW,
      panelH,
      slice,
      slice,
      slice,
      slice,
    );
    panel.setOrigin(0.5, 1);

    const tail = this.scene.add.image(0, 0, tailKey).setOrigin(0.5, 0);
    const tailH = tail.displayHeight;

    // Panel bottom sits on the tail; tip of tail at local y=0 (points at head)
    panel.setPosition(0, -tailH);
    tail.setPosition(0, -tailH);
    label.setPosition(0, -tailH - panelH / 2);

    // Raised well above sprite head / clears nameplate below sprite
    this.bubble = this.scene.add.container(0, -52, [panel, tail, label]);
    this.bubble.setScale(0.8);
    this.bubble.setAlpha(0);

    // Clickable hit area — dismiss on pointerdown without blocking agent select
    const hitW = Math.max(panelW, 28);
    const hitH = Math.max(panelH + tailH, 24);
    this.bubble.setSize(hitW, hitH);
    this.bubble.setInteractive(
      new Phaser.Geom.Rectangle(-hitW / 2, -hitH, hitW, hitH),
      Phaser.Geom.Rectangle.Contains,
    );
    this.bubble.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        _lx: number,
        _ly: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.clearBubble();
        void pointer;
      },
    );

    this.add(this.bubble);

    // Soft pop-in: scale 0.8→1 + short fade
    this.scene.tweens.add({
      targets: this.bubble,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 160,
      ease: 'Back.Out',
    });
  }

  private clearBubble(): void {
    if (this.bubble) {
      this.scene.tweens.killTweensOf(this.bubble);
      this.bubble.destroy();
      this.bubble = undefined;
    }
  }
}
