// levels.js — all 8 level definitions
// Grid chars: # wall  . floor  S start  G gem  E exit
// startDir:   0=right  1=down  2=left  3=up

const LEVELS = [
  {
    id: 1,
    title: "First Step",
    titleUA: "Перший крок",
    emoji: "🚀",
    conceptUA: "forward() — зробити один крок уперед",
    descriptionUA: "Роботу 🤖 треба дістатись виходу 🚪!\nВін дивиться вправо →",
    hintUA:
      "Команда <b>forward()</b> рухає робота на один крок у напрямку, куди він дивиться.\n\n" +
      "Напиши кілька разів:\n<code>forward()\nforward()\nforward()</code>",
    grid: [
      "######",
      "#S..E#",
      "######",
    ],
    startDir: 0,
    requiredGems: 0,
    allowedCommands: ["forward"],
    optimalLines: 3,
    starterCode: "# Напиши forward() тут ↓\n",
  },
  {
    id: 2,
    title: "Turn!",
    titleUA: "Поворот!",
    emoji: "↩️",
    conceptUA: "turn_left() і turn_right() — поворот на 90°",
    descriptionUA: "Попереду стіна! Навчи робота повертати.",
    hintUA:
      "<b>turn_left()</b> — повернути ліворуч\n<b>turn_right()</b> — повернути праворуч\n\n" +
      "Приклад:\n<code>forward()\nturn_left()\nforward()\nforward()</code>",
    grid: [
      "#####",
      "##E##",
      "##.##",
      "#S.##",
      "#####",
    ],
    startDir: 0,
    requiredGems: 0,
    allowedCommands: ["forward", "turn_right", "turn_left"],
    optimalLines: 4,
    starterCode: "",
  },
  {
    id: 3,
    title: "Shorter Code!",
    titleUA: "Коротший код!",
    emoji: "⚡",
    conceptUA: "forward(N) — зробити N кроків одразу",
    descriptionUA: "Довгий шлях... Напиши коротший код!",
    hintUA:
      "Замість писати forward() багато разів,\nможна написати одну команду:\n\n" +
      "<code>forward(3)</code>  — три кроки\n<code>forward(7)</code>  — сім кроків\n\n" +
      "Спробуй!",
    grid: [
      "###########",
      "#S.......E#",
      "###########",
    ],
    startDir: 0,
    requiredGems: 0,
    allowedCommands: ["forward", "turn_right", "turn_left"],
    optimalLines: 1,
    starterCode: "# Спробуй forward(N), де N = кількість кроків\n",
  },
  {
    id: 4,
    title: "First Loop!",
    titleUA: "Перший цикл!",
    emoji: "🔄",
    conceptUA: "for i in range(N): — повторити N разів",
    descriptionUA: "Познайомся з циклом — він повторює команди!",
    hintUA:
      "Цикл повторює те, що всередині нього:\n\n" +
      "<code>for i in range(4):\n    forward()</code>\n\n" +
      "⚠️ Важливо: перед forward() — 4 пробіли!\n\n" +
      "Спробуй: скільки разів треба повторити?",
    grid: [
      "############",
      "#S........E#",
      "############",
    ],
    startDir: 0,
    requiredGems: 0,
    allowedCommands: ["forward", "turn_right", "turn_left", "for_range"],
    optimalLines: 2,
    starterCode: "for i in range(?):\n    forward()\n",
  },
  {
    id: 5,
    title: "Loop + Turn",
    titleUA: "Цикл з поворотом",
    emoji: "🌀",
    conceptUA: "У циклі може бути кілька команд!",
    descriptionUA: "Використай цикл разом з поворотами!",
    hintUA:
      "У циклі можна мати кілька рядків:\n\n" +
      "<code>for i in range(3):\n    forward()\n    forward()</code>\n\n" +
      "Або mix з turn:\n<code>for i in range(2):\n    forward()\n    turn_right()</code>",
    grid: [
      "#########",
      "####E####",
      "####.####",
      "####.####",
      "#S...####",
      "#########",
    ],
    startDir: 0,
    requiredGems: 0,
    allowedCommands: ["forward", "turn_right", "turn_left", "for_range"],
    optimalLines: 4,
    starterCode: "",
  },
  {
    id: 6,
    title: "My Variable",
    titleUA: "Моя змінна",
    emoji: "📦",
    conceptUA: "steps = N — дати числу ім'я (змінна)",
    descriptionUA: "Змінна — це ящик, що зберігає число!",
    hintUA:
      "Змінна зберігає число і дає йому ім'я:\n\n" +
      "<code>steps = 5\nforward(steps)</code>\n\n" +
      "Або у циклі:\n<code>count = 4\nfor i in range(count):\n    forward()</code>\n\n" +
      "Скільки кроків треба?",
    grid: [
      "########",
      "#S....E#",
      "########",
    ],
    startDir: 0,
    requiredGems: 0,
    allowedCommands: ["forward", "turn_right", "turn_left", "for_range", "variable"],
    optimalLines: 2,
    starterCode: "# steps = ?\n# forward(steps)\n",
  },
  {
    id: 7,
    title: "Collect Gems!",
    titleUA: "Збери кристали!",
    emoji: "💎",
    conceptUA: "Збери всі 💎 і дійди до виходу!",
    descriptionUA: "Кристали збираються автоматично, коли робот на них стає.",
    hintUA:
      "Пройди через кристал — він збереться сам!\n\n" +
      "Використай все, що знаєш:\n<code>steps = 3\nfor i in range(steps):\n    forward()\nturn_right()\nforward(2)</code>",
    grid: [
      "#########",
      "#S.G...E#",
      "#########",
    ],
    startDir: 0,
    requiredGems: 1,
    allowedCommands: ["forward", "turn_right", "turn_left", "for_range", "variable"],
    optimalLines: 2,
    starterCode: "",
  },
  {
    id: 8,
    title: "Free Maze!",
    titleUA: "Вільний лабіринт!",
    emoji: "🏆",
    conceptUA: "Час проявити все, що знаєш!",
    descriptionUA: "Збери обидва кристали 💎💎 і знайди вихід!\nТи — справжній програміст! 🚀",
    hintUA:
      "Використовуй усі команди:\n\n" +
      "<code>forward()  forward(N)\nturn_right()  turn_left()\nfor i in range(N):\n    ...\nsteps = N</code>\n\n" +
      "Порада: спочатку подивись на карту і намалюй шлях на папері!",
    grid: [
      "########",
      "#S.#..E#",
      "#.#.##.#",
      "#G.G...#",
      "########",
    ],
    startDir: 0,
    requiredGems: 2,
    allowedCommands: ["forward", "turn_right", "turn_left", "for_range", "variable"],
    optimalLines: 6,  // optimal: turn_right()+forward(2)+turn_left()+forward(5)+turn_left()+forward(2)
    starterCode: "# Твій код тут — ти впораєшся! 💪\n",
  },
];

// Helper: find start position in grid
function findStart(grid) {
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf("S");
    if (c !== -1) return { row: r, col: c };
  }
  return { row: 1, col: 1 };
}

// Helper: find all gem positions
function findGems(grid) {
  const gems = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === "G") gems.push([r, c]);
    }
  }
  return gems;
}

// Helper: find exit position
function findExit(grid) {
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf("E");
    if (c !== -1) return [r, c];
  }
  return null;
}
