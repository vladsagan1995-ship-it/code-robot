// game.js — main controller: state machine, UI, events

// ── State machine ────────────────────────────────────────────────────────────
const STATE = {
  MENU:    "MENU",
  INTRO:   "INTRO",
  EDITING: "EDITING",
  RUNNING: "RUNNING",
  WIN:     "WIN",
};

// ── Speed map ────────────────────────────────────────────────────────────────
const SPEEDS = { 1: 700, 2: 350, 3: 100 };

// ── Command chip definitions ─────────────────────────────────────────────────
const CMD_CHIPS = [
  { id: "forward",    label: "forward()",    insert: "forward()\n",             tip: "Крок уперед" },
  { id: "turn_right", label: "turn_right()", insert: "turn_right()\n",          tip: "Поворот праворуч" },
  { id: "turn_left",  label: "turn_left()",  insert: "turn_left()\n",           tip: "Поворот ліворуч" },
  { id: "for_range",  label: "for loop",     insert: "for i in range(?):\n    ", tip: "Цикл повторення" },
  { id: "variable",   label: "var = N",      insert: "steps = ?\n",             tip: "Змінна (ящик з числом)" },
];

// ── App ──────────────────────────────────────────────────────────────────────
class App {
  constructor() {
    this.state      = STATE.MENU;
    this.levelIdx   = 0;     // index into LEVELS array
    this.animator   = null;
    this.progress   = this._loadProgress();

    // DOM refs
    this.screenMenu  = document.getElementById("screen-menu");
    this.screenGame  = document.getElementById("screen-game");
    this.screenWin   = document.getElementById("screen-win");
    this.levelCards  = document.getElementById("level-cards");
    this.worldGrid   = document.getElementById("world-grid");
    this.codeInput   = document.getElementById("code-input");
    this.errorBanner = document.getElementById("error-banner");
    this.btnRun      = document.getElementById("btn-run");
    this.btnReset    = document.getElementById("btn-reset");
    this.btnBack     = document.getElementById("btn-back");
    this.btnHint     = document.getElementById("btn-hint");
    this.hintModal   = document.getElementById("hint-modal");
    this.hintText    = document.getElementById("hint-text");
    this.levelTitle  = document.getElementById("level-title");
    this.levelDesc   = document.getElementById("level-desc");
    this.conceptBadge= document.getElementById("concept-badge");
    this.cmdChips    = document.getElementById("cmd-chips");
    this.speedSlider = document.getElementById("speed-slider");
    this.winTitle    = document.getElementById("win-title");
    this.winStars    = document.getElementById("win-stars");
    this.winMsg      = document.getElementById("win-msg");
    this.btnNext     = document.getElementById("btn-next");
    this.btnReplay   = document.getElementById("btn-replay");
    this.btnMenuFromWin = document.getElementById("btn-menu-from-win");
    this.linesCount  = document.getElementById("lines-count");

    this._setupEvents();
    this._renderMenu();

    // register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  // ── Progress persistence ─────────────────────────────────────────────────
  _loadProgress() {
    try {
      const raw = localStorage.getItem("codebot_progress");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { unlocked: [0], stars: {}, code: {} };
  }

  _saveProgress() {
    try {
      localStorage.setItem("codebot_progress", JSON.stringify(this.progress));
    } catch (e) {}
  }

  _isUnlocked(idx) {
    return this.progress.unlocked.includes(idx);
  }

  _unlock(idx) {
    if (!this.progress.unlocked.includes(idx)) {
      this.progress.unlocked.push(idx);
      this._saveProgress();
    }
  }

  _saveStars(idx, stars) {
    const key = String(idx);
    if ((this.progress.stars[key] || 0) < stars) {
      this.progress.stars[key] = stars;
      this._saveProgress();
    }
  }

  _saveCode(idx, code) {
    this.progress.code[String(idx)] = code;
    this._saveProgress();
  }

  // ── Event setup ──────────────────────────────────────────────────────────
  _setupEvents() {
    this.btnRun.addEventListener("click",   () => this._run());
    this.btnReset.addEventListener("click", () => this._reset());
    this.btnBack.addEventListener("click",  () => this._goMenu());
    this.btnHint.addEventListener("click",  () => this._showHint());
    document.getElementById("hint-close").addEventListener("click", () => this._closeHint());
    this.hintModal.addEventListener("click", (e) => { if (e.target === this.hintModal) this._closeHint(); });

    this.btnNext.addEventListener("click",       () => this._nextLevel());
    this.btnReplay.addEventListener("click",     () => this._replay());
    this.btnMenuFromWin.addEventListener("click",() => this._goMenu());

    this.speedSlider.addEventListener("input", () => {
      const ms = SPEEDS[this.speedSlider.value] ?? 350;
      if (this.animator) this.animator.setSpeed(ms);
    });

    this.codeInput.addEventListener("input", () => {
      this._clearError();
      this._updateLineCount();
    });
    this.codeInput.addEventListener("keydown", (e) => {
      // Tab inserts 4 spaces
      if (e.key === "Tab") {
        e.preventDefault();
        const s = this.codeInput.selectionStart;
        const end = this.codeInput.selectionEnd;
        const v = this.codeInput.value;
        this.codeInput.value = v.slice(0, s) + "    " + v.slice(end);
        this.codeInput.selectionStart = this.codeInput.selectionEnd = s + 4;
        this._updateLineCount();
      }
    });
  }

  // ── Menu ─────────────────────────────────────────────────────────────────
  _renderMenu() {
    this.levelCards.innerHTML = "";
    LEVELS.forEach((lvl, idx) => {
      const unlocked = this._isUnlocked(idx);
      const stars    = this.progress.stars[String(idx)] || 0;

      const card = document.createElement("div");
      card.className = "level-card" + (unlocked ? "" : " locked");
      card.innerHTML = `
        <div class="card-emoji">${unlocked ? lvl.emoji : "🔒"}</div>
        <div class="card-num">Рівень ${lvl.id}</div>
        <div class="card-name">${lvl.titleUA}</div>
        <div class="card-stars">${this._starsHTML(stars)}</div>
      `;
      if (unlocked) {
        card.addEventListener("click", () => this._openLevel(idx));
      }
      this.levelCards.appendChild(card);
    });

    this._setState(STATE.MENU);
  }

  _starsHTML(n) {
    return "⭐".repeat(n) + "☆".repeat(3 - n);
  }

  // ── Open level ───────────────────────────────────────────────────────────
  _openLevel(idx) {
    this.levelIdx = idx;
    const lvl = LEVELS[idx];

    this.levelTitle.textContent  = `${lvl.emoji}  Рівень ${lvl.id}: ${lvl.titleUA}`;
    this.levelDesc.innerHTML     = lvl.descriptionUA.replace(/\n/g, "<br>");
    this.conceptBadge.textContent = "💡 " + lvl.conceptUA;

    // Restore saved code or use starter
    const saved = this.progress.code[String(idx)];
    this.codeInput.value = saved !== undefined ? saved : (lvl.starterCode || "");
    this._updateLineCount();

    // Build command chips
    this._renderChips(lvl.allowedCommands);

    // Build grid
    const gemKeys = new Set(findGems(lvl.grid).map(([r, c]) => `${r},${c}`));
    if (!this.animator) {
      this.animator = new Animator(this.worldGrid, (result) => this._onAnimationEnd(result));
    }
    this.animator.setSpeed(SPEEDS[this.speedSlider.value] || 350);
    this.animator.buildGrid(lvl, gemKeys);

    const start = findStart(lvl.grid);
    this.animator.placeRobot(start.row, start.col, lvl.startDir);

    this._clearError();
    this._setState(STATE.EDITING);
  }

  _renderChips(allowedCommands) {
    this.cmdChips.innerHTML = "";
    CMD_CHIPS.filter(ch => allowedCommands.includes(ch.id)).forEach(ch => {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.title     = ch.tip;
      btn.textContent = ch.label;
      btn.addEventListener("click", () => {
        this._insertAtCursor(ch.insert);
        this.codeInput.focus();
      });
      this.cmdChips.appendChild(btn);
    });
  }

  _insertAtCursor(text) {
    const el  = this.codeInput;
    const s   = el.selectionStart;
    const e   = el.selectionEnd;
    const val = el.value;
    // Insert at end of current line
    const newVal = val.slice(0, s) + text + val.slice(e);
    el.value = newVal;
    el.selectionStart = el.selectionEnd = s + text.length;
    this._clearError();
    this._updateLineCount();
  }

  // ── Run ──────────────────────────────────────────────────────────────────
  _run() {
    if (this.state === STATE.RUNNING) return;
    const lvl  = LEVELS[this.levelIdx];
    const code = this.codeInput.value;

    this._saveCode(this.levelIdx, code);
    this._clearError();

    // Parse
    const parseResult = parse(code, lvl.allowedCommands);
    if (!parseResult.ok) {
      this._showError(parseResult.error.message, parseResult.error.line);
      return;
    }

    // Execute
    const start   = findStart(lvl.grid);
    const gemKeys = new Set(findGems(lvl.grid).map(([r, c]) => `${r},${c}`));
    const steps   = execute(parseResult.nodes, {
      grid: lvl.grid,
      row:  start.row,
      col:  start.col,
      dir:  lvl.startDir,
      gems: gemKeys,
      requiredGems: lvl.requiredGems,
    });

    // Rebuild grid for clean animation start
    this.animator.buildGrid(lvl, gemKeys);
    this.animator.placeRobot(start.row, start.col, lvl.startDir);

    this._setState(STATE.RUNNING);
    this.animator.animate(steps, start.row, start.col, lvl.startDir);
  }

  _onAnimationEnd(result) {
    if (!result || result.type === "no_win") {
      const msg = result?.message || "Спробуй ще раз!";
      this._showError("🤖 " + msg);
      this._setState(STATE.EDITING);
    } else if (result.type === "error") {
      this._showError("⚠️ " + result.message);
      this._setState(STATE.EDITING);
    } else if (result.type === "win") {
      this._onWin();
    } else {
      this._setState(STATE.EDITING);
    }
  }

  // ── Win ──────────────────────────────────────────────────────────────────
  _onWin() {
    const lvl      = LEVELS[this.levelIdx];
    const code     = this.codeInput.value;
    const lines    = code.split("\n").filter(l => l.trim() && !l.trim().startsWith("#")).length;
    const stars    = lines <= lvl.optimalLines ? 3 :
                     lines <= lvl.optimalLines * 2 ? 2 : 1;

    this._saveStars(this.levelIdx, stars);

    // Unlock next level
    if (this.levelIdx + 1 < LEVELS.length) {
      this._unlock(this.levelIdx + 1);
      this.btnNext.style.display = "";
    } else {
      this.btnNext.style.display = "none";
    }

    this.winStars.innerHTML = this._starsHTML(stars);
    this.winTitle.textContent = stars === 3 ? "Чудово! 🎉" :
                                 stars === 2 ? "Молодець! 👏" : "Пройдено! ✅";

    const msgs3 = ["Ідеальний код! Ти — програміст! 🚀", "Бездоганно! 💎", "Просто клас! ⭐"];
    const msgs2 = ["Добре! Спробуй коротший варіант 😉", "Правильно! Ще трохи оптимізації 💪"];
    const msgs1 = ["Вийшло! Подивись підказку — є коротший шлях 💡"];
    this.winMsg.textContent = stars === 3 ? msgs3[Math.floor(Math.random() * msgs3.length)] :
                               stars === 2 ? msgs2[Math.floor(Math.random() * msgs2.length)] :
                               msgs1[0];

    this._launchConfetti();
    this._setState(STATE.WIN);
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  _nextLevel() {
    const next = this.levelIdx + 1;
    if (next < LEVELS.length) {
      this._openLevel(next);
    }
  }

  _replay() {
    this._openLevel(this.levelIdx);
  }

  _goMenu() {
    if (this.animator) this.animator.stop();
    this._renderMenu();
  }

  // ── Reset ────────────────────────────────────────────────────────────────
  _reset() {
    if (this.animator) this.animator.stop();
    const lvl = LEVELS[this.levelIdx];
    const gemKeys = new Set(findGems(lvl.grid).map(([r, c]) => `${r},${c}`));
    this.animator.buildGrid(lvl, gemKeys);
    const start = findStart(lvl.grid);
    this.animator.placeRobot(start.row, start.col, lvl.startDir);
    this._clearError();
    this._setState(STATE.EDITING);
  }

  // ── Hint ─────────────────────────────────────────────────────────────────
  _showHint() {
    this.hintText.innerHTML = LEVELS[this.levelIdx].hintUA;
    this.hintModal.classList.remove("hidden");
  }

  _closeHint() {
    this.hintModal.classList.add("hidden");
  }

  // ── Error display ────────────────────────────────────────────────────────
  _showError(msg, line) {
    this.errorBanner.innerHTML = msg + (line ? `  <span class="err-line">(рядок ${line})</span>` : "");
    this.errorBanner.classList.remove("hidden");
  }

  _clearError() {
    this.errorBanner.classList.add("hidden");
    this.errorBanner.innerHTML = "";
  }

  // ── Line count ───────────────────────────────────────────────────────────
  _updateLineCount() {
    const lines = this.codeInput.value.split("\n").filter(l => l.trim() && !l.trim().startsWith("#")).length;
    if (this.linesCount) this.linesCount.textContent = `${lines} рядк${lines === 1 ? "" : lines < 5 ? "и" : "ів"}`;
  }

  // ── State transitions ─────────────────────────────────────────────────────
  _setState(s) {
    this.state = s;
    this.screenMenu.classList.toggle("hidden", s !== STATE.MENU);
    this.screenGame.classList.toggle("hidden", s === STATE.MENU || s === STATE.WIN);
    this.screenWin.classList.toggle("hidden",  s !== STATE.WIN);

    this.btnRun.disabled   = s === STATE.RUNNING;
    this.btnReset.disabled = s === STATE.RUNNING;
    this.codeInput.readOnly = s === STATE.RUNNING;

    if (s === STATE.RUNNING) {
      this.btnRun.textContent = "⏳ Виконується...";
    } else {
      this.btnRun.textContent = "▶  Запустити!";
    }
  }

  // ── Confetti ──────────────────────────────────────────────────────────────
  _launchConfetti() {
    const container = document.getElementById("confetti-container");
    if (!container) return;
    container.innerHTML = "";
    const colors = ["#fbbf24","#7c3aed","#22c55e","#f472b6","#38bdf8","#ff6b6b"];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement("div");
      p.className = "confetti-piece";
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        width: ${6 + Math.random() * 8}px;
        height: ${6 + Math.random() * 8}px;
        border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
        animation-delay: ${Math.random() * 0.5}s;
        animation-duration: ${0.8 + Math.random() * 0.8}s;
      `;
      container.appendChild(p);
    }
    setTimeout(() => { container.innerHTML = ""; }, 2000);
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  window._app = new App();
});
