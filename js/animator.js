// animator.js — renders grid and animates Step[]

const CELL_MAX    = 56;   // max px per cell (desktop)
const CELL_MAX_SM = 46;   // max px per cell (mobile)

// Direction rotation degrees for robot emoji
const DIR_ROT = { 0: 0, 1: 90, 2: 180, 3: -90 };

// ── Animator class ───────────────────────────────────────────────────────────
class Animator {
  constructor(container, onComplete) {
    this.container = container;  // #world-grid div
    this.onComplete = onComplete;
    this.cells = [];             // 2D array of cell divs
    this.robotEl = null;
    this.playing = false;
    this.speedMs = 350;          // ms per step
    this._timer = null;
    this._stepIdx = 0;
    this._steps = [];
    this._gemEls = new Map();    // "r,c" → gem div
    this._level = null;
    this._cellSize = CELL_MAX;
  }

  // Compute cell size to fit both screen width and height
  calcCellSize(cols, rows) {
    const isMobile = window.innerWidth <= 680;
    const maxCell  = isMobile ? CELL_MAX_SM : CELL_MAX;

    // Horizontal: fit grid in 92% of screen width
    const availW   = Math.floor(window.innerWidth  * 0.92);
    const availH   = Math.floor(window.innerHeight * 0.44); // grid takes ~44% height on mobile
    const byWidth  = Math.floor(availW / cols);
    const byHeight = Math.floor(availH / rows);

    return Math.min(maxCell, byWidth, byHeight, isMobile ? 52 : 999);
  }

  get cellSize() { return this._cellSize; }

  // ── Build grid DOM ──────────────────────────────────────────────────────
  buildGrid(level, gemKeys) {
    this._level = level;
    const grid = level.grid;

    // Compute cell size dynamically to fit screen
    this._cellSize = this.calcCellSize(grid[0].length, grid.length);
    const cs = this._cellSize;

    this.container.innerHTML = "";
    this.container.style.gridTemplateColumns = `repeat(${grid[0].length}, ${cs}px)`;
    this.container.style.gridTemplateRows    = `repeat(${grid.length}, ${cs}px)`;
    this.container.style.width  = `${grid[0].length * cs}px`;
    this.container.style.height = `${grid.length * cs}px`;

    this.cells = [];
    this._gemEls = new Map();

    for (let r = 0; r < grid.length; r++) {
      this.cells[r] = [];
      for (let c = 0; c < grid[r].length; c++) {
        const ch = grid[r][c];
        const div = document.createElement("div");
        div.className = "cell";
        div.dataset.r = r;
        div.dataset.c = c;

        const iconSize = `${Math.round(cs * 0.62)}px`;

        if (ch === "#") {
          div.classList.add("cell-wall");
        } else if (ch === "E") {
          div.classList.add("cell-exit");
          const icon = document.createElement("span");
          icon.className = "cell-icon";
          icon.textContent = "🚪";
          icon.style.fontSize = iconSize;
          div.appendChild(icon);
        } else {
          div.classList.add("cell-floor");
        }

        // Gem overlay (added separately so it can animate)
        if (ch === "G" && gemKeys.has(`${r},${c}`)) {
          const gem = document.createElement("span");
          gem.className = "gem";
          gem.textContent = "💎";
          gem.style.fontSize = iconSize;
          div.appendChild(gem);
          this._gemEls.set(`${r},${c}`, gem);
        }

        this.container.appendChild(div);
        this.cells[r][c] = div;
      }
    }

    // Robot element (absolutely positioned over grid)
    if (this.robotEl) this.robotEl.remove();
    this.robotEl = document.createElement("div");
    this.robotEl.id = "robot";
    this.robotEl.textContent = "🤖";
    this.robotEl.style.fontSize = `${cs * 0.72}px`;
    this.robotEl.style.width  = `${cs}px`;
    this.robotEl.style.height = `${cs}px`;

    this.container.style.position = "relative";
    this.container.appendChild(this.robotEl);
  }

  // ── Place robot at position (no animation) ─────────────────────────────
  placeRobot(row, col, dir) {
    const cs = this.cellSize;
    this.robotEl.style.transition = "none";
    this.robotEl.style.transform = `translate(${col * cs}px, ${row * cs}px) rotate(${DIR_ROT[dir]}deg)`;
    // Force reflow so next transition applies
    void this.robotEl.offsetWidth;
  }

  // ── Animate steps ───────────────────────────────────────────────────────
  animate(steps, startRow, startCol, startDir) {
    this._steps   = steps;
    this._stepIdx = 0;
    this.playing  = true;
    this.placeRobot(startRow, startCol, startDir);
    this._currentRow = startRow;
    this._currentCol = startCol;
    this._currentDir = startDir;
    this._runNext();
  }

  _runNext() {
    if (!this.playing) return;
    if (this._stepIdx >= this._steps.length) {
      this.playing = false;
      this.onComplete(null);
      return;
    }

    const step = this._steps[this._stepIdx++];
    this._applyStep(step);
  }

  _applyStep(step) {
    const cs = this.cellSize;
    const dur = this.speedMs;

    if (step.type === "move" && !step.hitWall) {
      const [tr, tc] = step.to;
      this._currentRow = tr;
      this._currentCol = tc;

      this.robotEl.style.transition = `transform ${dur * 0.8}ms ease-in-out`;
      this.robotEl.style.transform =
        `translate(${tc * cs}px, ${tr * cs}px) rotate(${DIR_ROT[this._currentDir]}deg)`;

      // Gem collect effect
      if (step.gemKey) {
        this._timer = setTimeout(() => {
          this._collectGem(step.gemKey);
          this._schedule(dur * 0.8);
        }, dur * 0.4);
        return;
      }
      this._schedule(dur * 0.85);

    } else if (step.type === "move" && step.hitWall) {
      // Bump: nudge toward wall then back
      const [dr, dc] = [[0,1],[1,0],[0,-1],[-1,0]][this._currentDir];
      const nudge = cs * 0.25;
      const x = this._currentCol * cs + dc * nudge;
      const y = this._currentRow * cs + dr * nudge;

      this.robotEl.style.transition = `transform ${dur * 0.25}ms ease-out`;
      this.robotEl.style.transform =
        `translate(${x}px, ${y}px) rotate(${DIR_ROT[this._currentDir]}deg)`;

      this._timer = setTimeout(() => {
        this.robotEl.style.transition = `transform ${dur * 0.25}ms ease-in`;
        this.robotEl.style.transform =
          `translate(${this._currentCol * cs}px, ${this._currentRow * cs}px) rotate(${DIR_ROT[this._currentDir]}deg)`;
        this._schedule(dur * 0.6);
      }, dur * 0.28);

    } else if (step.type === "turn") {
      this._currentDir = step.toDir;
      this.robotEl.style.transition = `transform ${dur * 0.6}ms ease-in-out`;
      this.robotEl.style.transform =
        `translate(${this._currentCol * cs}px, ${this._currentRow * cs}px) rotate(${DIR_ROT[this._currentDir]}deg)`;
      this._schedule(dur * 0.7);

    } else if (step.type === "win") {
      this.playing = false;
      this._timer = setTimeout(() => {
        this._celebrateCell(step.pos);
        this.onComplete({ type: "win" });
      }, dur * 0.5);

    } else if (step.type === "no_win") {
      this.playing = false;
      this._timer = setTimeout(() => {
        this.onComplete({ type: "no_win", message: step.message });
      }, dur * 0.3);

    } else if (step.type === "runtime_error") {
      this.playing = false;
      this._timer = setTimeout(() => {
        this.onComplete({ type: "error", message: step.message });
      }, dur * 0.2);

    } else {
      this._schedule(dur * 0.1);
    }
  }

  _schedule(ms) {
    this._timer = setTimeout(() => this._runNext(), ms);
  }

  _collectGem(key) {
    const el = this._gemEls.get(key);
    if (!el) return;
    el.classList.add("gem-collect");
    setTimeout(() => el.remove(), 400);
    this._gemEls.delete(key);
  }

  _celebrateCell([r, c]) {
    const cell = this.cells[r]?.[c];
    if (cell) cell.classList.add("cell-win-flash");
    this.robotEl.classList.add("robot-bounce");
  }

  stop() {
    this.playing = false;
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
  }

  setSpeed(ms) {
    this.speedMs = ms;
  }

  // Reset visual to initial state
  resetRobot(row, col, dir) {
    this.stop();
    // Re-add gems
    if (this._level) {
      this._gemEls.forEach((el) => el.classList.remove("gem-collect"));
      // For full reset, caller should rebuild grid
    }
    this.placeRobot(row, col, dir);
    this.robotEl.classList.remove("robot-bounce");
  }
}
