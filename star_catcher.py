"""
⭐ ЗОРЯНИЙ ЛОВЕЦЬ ⭐
Гра для маленьких програмістів!

Керування:
  ← → Стрілки (або A / D) — рухати кошик
  Enter / Пробіл           — почати / знову грати

Правила:
  ⭐ Зірка  = +10 очок
  🪙 Монета = +5 очок
  💎 Кристал= +25 очок (рідкісний!)
  🪨 Астероїд → -1 життя
"""

import tkinter as tk
import random
import math

# ── налаштування ────────────────────────────────────────────────
W, H         = 640, 520
BASKET_W     = 90
BASKET_H     = 22
BASKET_SPEED = 16
ITEM_R       = 14
BASE_SPEED   = 2.8
FPS_MS       = 16          # ≈ 60 кадрів/с

# Кольорова палітра
BG_TOP    = "#070720"
BG_BOT    = "#0e1a4a"
STAR_CLR  = "#FFD700"
COIN_CLR  = "#FFA500"
GEM_CLR   = "#00FFAA"
AST_CLR   = "#7a5230"
BASKET_CLR= "#4169E1"
SHINE_CLR = "#a0c4ff"

ITEM_TYPES = [
    # (type,      color,    points, weight)
    ("star",   STAR_CLR,  10,  40),
    ("coin",   COIN_CLR,   5,  30),
    ("gem",    GEM_CLR,   25,   8),
    ("asteroid", AST_CLR, -1,  22),
]

# ── допоміжні малюнки ───────────────────────────────────────────
def star_points(cx, cy, r, n=5):
    pts = []
    for i in range(n * 2):
        angle = math.pi / 2 + i * math.pi / n
        rad   = r if i % 2 == 0 else r * 0.42
        pts += [cx + rad * math.cos(angle), cy - rad * math.sin(angle)]
    return pts

def diamond_points(cx, cy, r):
    return [cx, cy - r,  cx + r * 0.7, cy,  cx, cy + r,  cx - r * 0.7, cy]

# ── головний клас гри ───────────────────────────────────────────
class StarCatcher:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("⭐  Зоряний Ловець  ⭐")
        self.root.resizable(False, False)

        self.canvas = tk.Canvas(self.root, width=W, height=H,
                                bg=BG_TOP, highlightthickness=0)
        self.canvas.pack()

        # фонові зірочки (статичні)
        random.seed(42)
        self.bg_stars = [(random.randint(0, W), random.randint(0, H - 80),
                          random.randint(1, 3))
                         for _ in range(120)]
        random.seed()

        self.keys = set()
        self.root.bind("<KeyPress>",   self._key_dn)
        self.root.bind("<KeyRelease>", self._key_up)
        self.root.focus_set()

        self._init_state()
        self._show_menu()

    # ── стан гри ──────────────────────────────────────────────
    def _init_state(self):
        self.score    = 0
        self.lives    = 3
        self.level    = 1
        self.bx       = W // 2          # центр кошика
        self.items    = []
        self.fx       = []              # спалахи при ловлі
        self.frame    = 0
        self.running  = False
        self.over     = False
        self.spawn_cd = 85

    # ── клавіші ───────────────────────────────────────────────
    def _key_dn(self, e):
        self.keys.add(e.keysym)
        if e.keysym in ("Return", "space") and (not self.running or self.over):
            self._start()

    def _key_up(self, e):
        self.keys.discard(e.keysym)

    # ── запуск ────────────────────────────────────────────────
    def _start(self):
        self._init_state()
        self.running = True
        self._loop()

    # ── головний цикл ─────────────────────────────────────────
    def _loop(self):
        if not self.running:
            return

        self.frame += 1

        # рух кошика
        if "Left"  in self.keys or "a" in self.keys:
            self.bx = max(BASKET_W // 2, self.bx - BASKET_SPEED)
        if "Right" in self.keys or "d" in self.keys:
            self.bx = min(W - BASKET_W // 2, self.bx + BASKET_SPEED)

        # рівень
        self.level  = self.score // 150 + 1
        speed       = BASE_SPEED + (self.level - 1) * 0.6
        self.spawn_cd = max(35, 85 - (self.level - 1) * 7)

        # спавн об'єктів
        if self.frame % self.spawn_cd == 0:
            self._spawn(speed)

        # оновлення об'єктів
        by = H - 55          # центр кошика по Y
        dead = []
        for it in self.items:
            it["y"] += it["vy"]
            # перевірка ловлі
            if (by - BASKET_H < it["y"] + ITEM_R < by + BASKET_H and
                    abs(it["x"] - self.bx) < BASKET_W // 2 + ITEM_R):
                if it["type"] == "asteroid":
                    self.lives -= 1
                    self._flash(it["x"], it["y"], "#FF4444", 18)
                    if self.lives <= 0:
                        self._end()
                        return
                else:
                    self.score += it["points"]
                    self._flash(it["x"], it["y"], it["color"], 14)
                dead.append(it)
            elif it["y"] > H + ITEM_R:
                dead.append(it)
        for d in dead:
            self.items.remove(d)

        # оновлення спалахів
        self.fx = [f for f in self.fx if f["t"] > 0]
        for f in self.fx:
            f["t"] -= 1

        self._draw()
        self.root.after(FPS_MS, self._loop)

    def _spawn(self, speed):
        x = random.randint(ITEM_R + 5, W - ITEM_R - 5)
        weights  = [t[3] for t in ITEM_TYPES]
        chosen   = random.choices(ITEM_TYPES, weights=weights)[0]
        tp, clr, pts, _ = chosen
        self.items.append({
            "type":   tp,
            "x":      x,
            "y":      -ITEM_R,
            "vy":     speed + random.uniform(-0.4, 0.8),
            "color":  clr,
            "points": pts,
            "rot":    random.uniform(0, math.pi),  # для астероїда
        })

    def _flash(self, x, y, color, r):
        self.fx.append({"x": x, "y": y, "color": color, "r": r, "t": 12})

    # ── малювання ─────────────────────────────────────────────
    def _draw(self):
        cv = self.canvas
        cv.delete("all")

        # фон — градієнт через прямокутники
        for i in range(8):
            t  = i / 7
            r  = int(7  + t * (14 - 7))
            g  = int(7  + t * (26 - 7))
            b  = int(32 + t * (74 - 32))
            cv.create_rectangle(0, i * H // 8, W, (i + 1) * H // 8,
                                 fill=f"#{r:02x}{g:02x}{b:02x}", outline="")

        # фонові зірочки
        for (sx, sy, sr) in self.bg_stars:
            bright = random.choice(("white", "#cccccc", "#aaaaaa"))
            cv.create_oval(sx, sy, sx + sr, sy + sr, fill=bright, outline="")

        # предмети
        for it in self.items:
            self._draw_item(it)

        # спалахи
        for f in self.fx:
            alpha = int(200 * f["t"] / 12)
            r_now = f["r"] + (12 - f["t"])
            cv.create_oval(f["x"] - r_now, f["y"] - r_now,
                           f["x"] + r_now, f["y"] + r_now,
                           outline=f["color"], width=2)

        # кошик
        self._draw_basket()

        # HUD
        cv.create_text(12, 12, anchor="nw",
                       text=f"⭐  {self.score}",
                       font=("Arial", 18, "bold"), fill=STAR_CLR)
        cv.create_text(W - 12, 12, anchor="ne",
                       text="♥ " * self.lives + "♡ " * (3 - self.lives),
                       font=("Arial", 18, "bold"), fill="#FF6B6B")
        cv.create_text(W // 2, 14, anchor="n",
                       text=f"Рівень {self.level}",
                       font=("Arial", 13, "bold"), fill=SHINE_CLR)

        # підказка внизу
        cv.create_text(W // 2, H - 8, anchor="s",
                       text="← → або A D  —  рухати кошик",
                       font=("Arial", 10), fill="#556688")

    def _draw_item(self, it):
        cv  = self.canvas
        x, y, clr = it["x"], it["y"], it["color"]
        tp  = it["type"]

        if tp == "star":
            pts = star_points(x, y, ITEM_R)
            cv.create_polygon(pts, fill=clr, outline="#cc8800", width=1)
            cv.create_oval(x - 4, y - 4, x + 4, y + 4, fill="#ffe066", outline="")

        elif tp == "coin":
            cv.create_oval(x - ITEM_R, y - ITEM_R, x + ITEM_R, y + ITEM_R,
                           fill=clr, outline="#cc6600", width=2)
            cv.create_oval(x - ITEM_R + 4, y - ITEM_R + 4,
                           x + ITEM_R - 4, y + ITEM_R - 4,
                           fill="#ffcc44", outline="")
            cv.create_text(x, y, text="₴", font=("Arial", 11, "bold"), fill="white")

        elif tp == "gem":
            pts = diamond_points(x, y, ITEM_R + 3)
            cv.create_polygon(pts, fill=clr, outline="#00cc88", width=2)
            inner = diamond_points(x - 2, y - 2, 6)
            cv.create_polygon(inner, fill="white", outline="")

        elif tp == "asteroid":
            cv.create_oval(x - ITEM_R, y - ITEM_R, x + ITEM_R, y + ITEM_R,
                           fill="#6b4226", outline="#9a6a3a", width=2)
            cv.create_oval(x - 6, y - 4, x - 1, y + 1, fill="#4a2e14", outline="")
            cv.create_oval(x + 2, y + 3, x + 7, y + 7, fill="#4a2e14", outline="")
            cv.create_oval(x - 3, y + 5, x + 1, y + 9, fill="#4a2e14", outline="")

    def _draw_basket(self):
        cv = self.canvas
        bx, by = self.bx, H - 55
        hw, hh = BASKET_W // 2, BASKET_H // 2

        # тінь
        cv.create_rectangle(bx - hw + 4, by - hh + 4,
                             bx + hw + 4, by + hh + 4,
                             fill="#000033", outline="")
        # корпус
        cv.create_rectangle(bx - hw, by - hh, bx + hw, by + hh,
                             fill=BASKET_CLR, outline=SHINE_CLR, width=2)
        # смуга блиску
        cv.create_rectangle(bx - hw + 6, by - hh + 4,
                             bx + hw - 6, by - hh + 8,
                             fill=SHINE_CLR, outline="")
        # "двигуни" по боках
        for dx in (-hw + 5, hw - 5):
            cv.create_oval(bx + dx - 5, by + hh - 2,
                           bx + dx + 5, by + hh + 8,
                           fill="#FF6622", outline="#FF8844")

    # ── кінець гри ────────────────────────────────────────────
    def _end(self):
        self.running = False
        self.over    = True
        self._draw()

        cv = self.canvas
        # затемнення
        cv.create_rectangle(W // 2 - 200, H // 2 - 150,
                             W // 2 + 200, H // 2 + 160,
                             fill="#08102a", outline=STAR_CLR, width=3)

        cv.create_text(W // 2, H // 2 - 110,
                       text="🎮  Гра закінчена!",
                       font=("Arial", 24, "bold"), fill=STAR_CLR)
        cv.create_text(W // 2, H // 2 - 55,
                       text=f"Твій рахунок:  {self.score}",
                       font=("Arial", 20), fill="white")
        cv.create_text(W // 2, H // 2 - 10,
                       text=f"Рівень досягнуто:  {self.level}  🚀",
                       font=("Arial", 16), fill=SHINE_CLR)

        msg = ("Чудово!" if self.score >= 200 else
               "Молодець!" if self.score >= 80 else "Спробуй ще!")
        cv.create_text(W // 2, H // 2 + 40,
                       text=msg, font=("Arial", 18, "bold"), fill=GEM_CLR)

        cv.create_text(W // 2, H // 2 + 100,
                       text="Натисни  Enter  або  Пробіл  →  грати знову",
                       font=("Arial", 13), fill="#8899bb")

    # ── меню ──────────────────────────────────────────────────
    def _show_menu(self):
        cv = self.canvas
        cv.delete("all")

        # фон
        cv.create_rectangle(0, 0, W, H, fill=BG_TOP, outline="")
        for (sx, sy, sr) in self.bg_stars:
            cv.create_oval(sx, sy, sx + sr, sy + sr, fill="white", outline="")

        cv.create_text(W // 2, 80,
                       text="⭐  Зоряний Ловець  ⭐",
                       font=("Arial", 30, "bold"), fill=STAR_CLR)
        cv.create_text(W // 2, 140,
                       text="Лови зірки та монети!",
                       font=("Arial", 17), fill="white")
        cv.create_text(W // 2, 175,
                       text="Уникай астероїдів  🪨",
                       font=("Arial", 17), fill="#FF8888")

        # легенда
        items_info = [
            (STAR_CLR, "⭐  Зірка      =  +10 очок"),
            (COIN_CLR, "🪙  Монета    =  +5 очок"),
            (GEM_CLR,  "💎  Кристал  =  +25 очок"),
            ("#FF8888", "🪨  Астероїд  =  −1 життя"),
        ]
        for i, (clr, txt) in enumerate(items_info):
            cv.create_text(W // 2, 240 + i * 32,
                           text=txt, font=("Arial", 15), fill=clr)

        cv.create_text(W // 2, 395,
                       text="← →  або  A D  —  рухати кошик",
                       font=("Arial", 14), fill=SHINE_CLR)

        btn = tk.Button(self.root, text="🚀  Почати гру!",
                        font=("Arial", 18, "bold"),
                        bg=STAR_CLR, fg=BG_TOP,
                        padx=18, pady=8, relief="raised",
                        cursor="hand2", command=self._start)
        cv.create_window(W // 2, 455, window=btn)

    # ── запуск ────────────────────────────────────────────────
    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    StarCatcher().run()
