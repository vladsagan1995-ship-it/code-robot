// parser.js — Python subset parser
// Supports: forward(), turn_right(), turn_left(), forward(N),
//           for i in range(N):  (indented body),
//           varname = N,  forward(varname)

// ── Friendly Ukrainian error messages ───────────────────────────────────────
const ERR = {
  unknownCmd:      (n) => `Невідома команда: <b>${n}()</b> 🤔  Може, опечатка?`,
  notAllowed:      (n) => `Команда <b>${n}</b> ще не відкрита на цьому рівні 🔒`,
  missingColon:        `Після <b>range(...)</b> потрібна двокрапка <b>:</b>`,
  emptyLoop:           `У циклі немає команд! Додай рядок з 4 пробілами ↵`,
  unexpectedIndent:    `Зайвий відступ — цей рядок не має починатися з пробілів`,
  badArg:          (n) => `Аргумент у <b>${n}()</b> — лише число або назва змінної`,
  divByZero:           `range(0) — цикл не виконується! Спробуй число більше 0`,
  tooLarge:            `Число занадто велике — максимум 50`,
  forSyntax:           `Синтаксис циклу: <b>for i in range(N):</b>`,
  missingColon2:       `Після <b>)</b> потрібна двокрапка <b>:</b>  →  <b>for i in range(N):</b>`,
  unknownToken:    (t) => `Не розумію: <b>${t}</b> — перевір правопис`,
  badAssign:       (n) => `<b>${n} = ?</b> — після = потрібне ціле число, наприклад: <b>${n} = 5</b>`,
};

const KNOWN_CMDS = new Set(["forward", "turn_right", "turn_left"]);

// ── parse(source, allowedCommands) ──────────────────────────────────────────
// Returns: { ok:true, nodes:[] }  |  { ok:false, error:{ message, line } }
function parse(source, allowedCommands) {
  const allowed  = new Set(allowedCommands);
  const canLoop  = allowed.has("for_range");
  const canVar   = allowed.has("variable");
  const lines    = source.split("\n");

  function err(msg, lineIdx) {
    return { ok: false, error: { message: msg, line: lineIdx + 1 } };
  }

  function indentOf(line) {
    let n = 0;
    for (const ch of line) {
      if (ch === " ")      n++;
      else if (ch === "\t") n += 4;
      else break;
    }
    return n;
  }

  function isBlank(line) {
    const s = line.trim();
    return s === "" || s.startsWith("#");
  }

  // Parse a single expression token → { val, isLiteral?, isVar? } | { err }
  function parseExpr(token, lineIdx) {
    if (/^\d+$/.test(token)) {
      const n = parseInt(token, 10);
      if (n > 50)  return { err: err(ERR.tooLarge, lineIdx) };
      if (n === 0) return { err: err(ERR.divByZero, lineIdx) };
      return { val: n, isLiteral: true };
    }
    if (/^[a-zA-Z_]\w*$/.test(token)) {
      return { val: token, isVar: true };
    }
    return { err: err(ERR.badArg(token), lineIdx) };
  }

  // Parse a block of lines where indent > parentIndent
  // bodyIndent = exact indent that body lines must have
  function parseBlock(startIdx, bodyIndent) {
    const nodes = [];
    let j = startIdx;

    while (j < lines.length) {
      if (isBlank(lines[j])) { j++; continue; }
      const ind = indentOf(lines[j]);
      if (ind < bodyIndent) break;      // dedent = end of block

      const res = parseLine(j, bodyIndent);
      if (res.err) return res;
      if (res.node === null) break;
      j = res.nextIdx;
      nodes.push(res.node);
    }

    return { nodes, nextIdx: j };
  }

  // Parse one line at expectedIndent level
  function parseLine(idx, expectedIndent) {
    // skip blanks
    while (idx < lines.length && isBlank(lines[idx])) idx++;
    if (idx >= lines.length) return { node: null, nextIdx: idx };

    const raw = lines[idx];
    const ind = indentOf(raw);
    const s   = raw.trim();

    if (ind > expectedIndent) return { err: err(ERR.unexpectedIndent, idx) };
    if (ind < expectedIndent) return { node: null, nextIdx: idx };

    // ── for i in range(N): ────────────────────────────────────────────────
    if (s.startsWith("for ")) {
      if (!canLoop) return { err: err(ERR.notAllowed("for ... in range():"), idx) };

      // must end with colon
      if (!s.endsWith(":")) return { err: err(ERR.missingColon2, idx) };

      const m = s.match(/^for\s+\w+\s+in\s+range\((\w+)\)\s*:$/);
      if (!m) return { err: err(ERR.forSyntax, idx) };

      const exprRes = parseExpr(m[1], idx);
      if (exprRes.err) return exprRes;

      const blockRes = parseBlock(idx + 1, expectedIndent + 4);
      if (blockRes.err) return blockRes;
      if (blockRes.nodes.length === 0) return { err: err(ERR.emptyLoop, idx) };

      return {
        node: { type: "for", count: exprRes, body: blockRes.nodes, line: idx + 1 },
        nextIdx: blockRes.nextIdx,
      };
    }

    // ── varname = N ────────────────────────────────────────────────────────
    const assignM = s.match(/^([a-zA-Z_]\w*)\s*=\s*(\w+)\s*(#.*)?$/);
    if (assignM && !s.includes("(")) {
      const name = assignM[1];
      if (!canVar) return { err: err(ERR.notAllowed(name + " = ..."), idx) };

      const exprRes = parseExpr(assignM[2], idx);
      if (exprRes.err) return { err: err(ERR.badAssign(name), idx) };

      return {
        node: { type: "assign", name, value: exprRes, line: idx + 1 },
        nextIdx: idx + 1,
      };
    }

    // ── command call: name() or name(arg) ─────────────────────────────────
    const callM = s.match(/^([a-zA-Z_]\w*)\((\w*)\)\s*(#.*)?$/);
    if (callM) {
      const name     = callM[1];
      const argToken = callM[2].trim();

      if (!KNOWN_CMDS.has(name)) return { err: err(ERR.unknownCmd(name), idx) };
      if (!allowed.has(name))    return { err: err(ERR.notAllowed(name + "()"), idx) };

      let arg = null;
      if (argToken !== "") {
        const exprRes = parseExpr(argToken, idx);
        if (exprRes.err) return exprRes;
        arg = exprRes;
      }

      return {
        node: { type: "call", name, arg, line: idx + 1 },
        nextIdx: idx + 1,
      };
    }

    // ── unknown ────────────────────────────────────────────────────────────
    const nameM = s.match(/^([a-zA-Z_]\w*)/);
    if (nameM && !KNOWN_CMDS.has(nameM[1]) && nameM[1] !== "for") {
      return { err: err(ERR.unknownCmd(nameM[1]), idx) };
    }
    return { err: err(ERR.unknownToken(s.slice(0, 20)), idx) };
  }

  // ── Main parse loop (top-level: expectedIndent = 0) ──────────────────────
  const nodes = [];
  let idx = 0;

  while (idx < lines.length) {
    if (isBlank(lines[idx])) { idx++; continue; }

    if (indentOf(lines[idx]) > 0) {
      return err(ERR.unexpectedIndent, idx);
    }

    const res = parseLine(idx, 0);
    if (res.err) return res.err;
    if (res.node === null) break;
    nodes.push(res.node);
    idx = res.nextIdx;
  }

  return { ok: true, nodes };
}
