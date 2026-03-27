// executor.js — walks parsed AST, produces Step[] for animation
//
// Step types:
//   { type:'move',  from:[r,c], to:[r,c], dir, hitWall:bool, gemKey:string|null }
//   { type:'turn',  pos:[r,c],  fromDir, toDir }
//   { type:'win',   pos:[r,c] }
//   { type:'no_win', message }
//   { type:'runtime_error', message }
//
// Direction encoding:
//   0 = right  → col+1
//   1 = down   → row+1
//   2 = left   → col-1
//   3 = up     → row-1

const MOVE_DELTA = [
  [ 0,  1],  // 0 right
  [ 1,  0],  // 1 down
  [ 0, -1],  // 2 left
  [-1,  0],  // 3 up
];

const MAX_STEPS = 300;

// execute(nodes, levelState) → Step[]
// levelState: { grid, row, col, dir, gems:Set<"r,c">, requiredGems }
function execute(nodes, levelState) {
  const state = {
    row:           levelState.row,
    col:           levelState.col,
    dir:           levelState.dir,
    gems:          new Set(levelState.gems),
    gemsCollected: 0,
    requiredGems:  levelState.requiredGems,
    grid:          levelState.grid,
    vars:          new Map(),
    steps:         [],
    totalSteps:    0,
    done:          false,   // set true on win or hard error
  };

  function cellAt(r, c) {
    if (r < 0 || r >= state.grid.length) return "#";
    const row = state.grid[r];
    if (c < 0 || c >= row.length) return "#";
    return row[c];
  }

  function pushError(msg) {
    state.steps.push({ type: "runtime_error", message: msg });
    state.done = true;
  }

  function doForward(n) {
    for (let k = 0; k < n && !state.done; k++) {
      if (++state.totalSteps > MAX_STEPS) {
        pushError("Занадто багато кроків! Перевір число у <b>range()</b> 🤔");
        return;
      }

      const [dr, dc] = MOVE_DELTA[state.dir];
      const tr = state.row + dr;
      const tc = state.col + dc;

      if (cellAt(tr, tc) === "#") {
        // Wall bump — no movement
        state.steps.push({
          type: "move", from: [state.row, state.col], to: [state.row, state.col],
          dir: state.dir, hitWall: true, gemKey: null,
        });
        return; // stop moving after wall
      }

      // Collect gem if present
      const gemKey = `${tr},${tc}`;
      let collectedGem = null;
      if (state.gems.has(gemKey)) {
        state.gems.delete(gemKey);
        state.gemsCollected++;
        collectedGem = gemKey;
      }

      state.steps.push({
        type: "move", from: [state.row, state.col], to: [tr, tc],
        dir: state.dir, hitWall: false, gemKey: collectedGem,
      });

      state.row = tr;
      state.col = tc;

      // Check win (exit reached AND all required gems collected)
      if (cellAt(state.row, state.col) === "E" &&
          state.gemsCollected >= state.requiredGems) {
        state.steps.push({ type: "win", pos: [state.row, state.col] });
        state.done = true;
        return;
      }
    }
  }

  function doTurn(clockwiseDelta) {
    if (state.done) return;
    if (++state.totalSteps > MAX_STEPS) {
      pushError("Занадто багато кроків! Перевір число у <b>range()</b> 🤔");
      return;
    }
    const fromDir = state.dir;
    state.dir = ((state.dir + clockwiseDelta) % 4 + 4) % 4;
    state.steps.push({
      type: "turn", pos: [state.row, state.col], fromDir, toDir: state.dir,
    });
  }

  function resolveExpr(expr) {
    if (!expr) return 1;
    if (expr.isLiteral) return expr.val;
    if (expr.isVar) {
      const v = state.vars.get(expr.val);
      if (v === undefined) {
        pushError(`Змінна <b>${expr.val}</b> не визначена — спочатку: <b>${expr.val} = 5</b>`);
        return null;
      }
      return v;
    }
    return 1;
  }

  function walkNodes(nodes) {
    for (const node of nodes) {
      if (state.done) return;

      switch (node.type) {
        case "call": {
          const n = resolveExpr(node.arg);
          if (n === null) return;
          if (node.name === "forward")     doForward(n);
          else if (node.name === "turn_right") doTurn(+1);
          else if (node.name === "turn_left")  doTurn(-1);
          break;
        }
        case "assign": {
          const v = resolveExpr(node.value);
          if (v === null) return;
          state.vars.set(node.name, v);
          break;
        }
        case "for": {
          const count = resolveExpr(node.count);
          if (count === null) return;
          for (let k = 0; k < count && !state.done; k++) {
            walkNodes(node.body);
          }
          break;
        }
      }
    }
  }

  walkNodes(nodes);

  if (!state.done) {
    // Ran out of code without winning
    const gemsLeft = state.requiredGems - state.gemsCollected;
    state.steps.push({
      type: "no_win",
      message: gemsLeft > 0
        ? `Ще ${gemsLeft} 💎 треба зібрати! Потім знайди вихід 🚪`
        : "Не дійшов до виходу 🚪  Спробуй ще раз! 💪",
    });
  }

  return state.steps;
}
