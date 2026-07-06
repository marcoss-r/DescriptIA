"""Genera 3 cartas de tarot en pixel art: El Diablo (XV), El Loco (0) y la
Rueda de la Fortuna (X), en azul oscuro y plateado, estilo recargado
(marco triple, medallón con numeral, panel estrellado, ornamentos), con el
nombre en inglés dentro de la carta, abajo.

También genera las versiones invertidas (giradas 180 grados).

Uso:  python img/cartas/generar_tarot.py
Salida:  img/cartas/tarot-<carta>.png , tarot-<carta>-invertida.png
         y _contacto_tarot.png (revisión)
"""

import math
import os
from PIL import Image, ImageDraw

SALIDA = os.path.dirname(os.path.abspath(__file__))

W, H = 64, 104
SCALE = 6  # 384 x 624

# --- Paleta: azul oscuro + plata ---
AZUL    = (15, 23, 46)       # fondo de la carta
NOCHE   = (9, 14, 32)        # panel interior (cielo)
PLATA   = (186, 198, 216)
PLATA_D = (105, 120, 148)
PLATA_W = (241, 246, 252)
HUESO   = (228, 224, 212)
HUESO_D = (158, 152, 136)
AZUL_M  = (62, 84, 132)      # ropa del loco
AZUL_MD = (40, 56, 96)
OSCURO  = (5, 8, 20)


# ============================================================
#  Fuente 3x5 (solo los caracteres necesarios)
# ============================================================
FUENTE = {
    "T": ["###", ".#.", ".#.", ".#.", ".#."],
    "H": ["#.#", "#.#", "###", "#.#", "#.#"],
    "E": ["###", "#..", "###", "#..", "###"],
    "D": ["##.", "#.#", "#.#", "#.#", "##."],
    "V": ["#.#", "#.#", "#.#", "#.#", ".#."],
    "I": ["###", ".#.", ".#.", ".#.", "###"],
    "L": ["#..", "#..", "#..", "#..", "###"],
    "F": ["###", "#..", "###", "#..", "#.."],
    "O": ["###", "#.#", "#.#", "#.#", "###"],
    "W": ["#.#", "#.#", "#.#", "###", "#.#"],
    "R": ["##.", "#.#", "##.", "#.#", "#.#"],
    "U": ["#.#", "#.#", "#.#", "#.#", "###"],
    "N": ["##.", "#.#", "#.#", "#.#", "#.#"],
    "X": ["#.#", "#.#", ".#.", "#.#", "#.#"],
}


def texto(d, s, y, color=PLATA_W, cx=None):
    """Texto 3x5 centrado en la carta, o en torno a cx si se indica."""
    ancho = sum(3 if ch == " " else 4 for ch in s) - 1
    x = (W - ancho) // 2 if cx is None else cx - ancho // 2
    for ch in s:
        if ch == " ":
            x += 3
            continue
        for gy, fila in enumerate(FUENTE[ch]):
            for gx, c in enumerate(fila):
                if c == "#":
                    d.point((x + gx, y + gy), fill=color)
        x += 4


def destello(d, x, y, c=PLATA_W):
    """Estrella de 4 puntas (rombo de 5 píxeles)."""
    d.point((x, y), fill=c)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        d.point((x + dx, y + dy), fill=PLATA_D)


def cascabel(d, x, y):
    d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=PLATA_W, outline=PLATA_D)


# ============================================================
#  Marco recargado común
# ============================================================
def base_carta(numeral):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # triple marco plateado
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=7, fill=AZUL, outline=PLATA_D)
    d.rounded_rectangle([2, 2, W - 3, H - 3], radius=6, outline=PLATA)
    d.rounded_rectangle([4, 4, W - 5, H - 5], radius=5, outline=PLATA_D)
    # panel interior (cielo nocturno)
    d.rectangle([7, 23, 56, 83], fill=NOCHE, outline=PLATA)
    d.rectangle([8, 24, 55, 82], outline=PLATA_D)
    # abanicos en las 4 esquinas del panel
    for cx_, cy_, a0, a1 in ((7, 23, 0, 90), (56, 23, 90, 180),
                             (56, 83, 180, 270), (7, 83, 270, 360)):
        d.arc([cx_ - 8, cy_ - 8, cx_ + 8, cy_ + 8], a0, a1, fill=PLATA_D)
        d.arc([cx_ - 5, cy_ - 5, cx_ + 5, cy_ + 5], a0, a1, fill=PLATA)
    # gotas colgantes del borde superior del panel
    for gx in (14, 20, 44, 50):
        d.line([(gx, 25), (gx, 27)], fill=PLATA_D)
        d.point((gx, 28), fill=PLATA_W)
    # ramas de laurel a los lados del medallón
    for lado in (-1, 1):
        x0 = 32 + lado * 9
        x1 = 32 + lado * 24
        d.line([(x0, 13), (x1, 13)], fill=PLATA_D)
        paso = 3 * lado
        for i, lx in enumerate(range(x0 + paso, x1, paso)):
            dy = -2 if i % 2 == 0 else 2
            d.line([(lx, 13), (lx - 2 * lado, 13 + dy)], fill=PLATA)
    # medallón del numeral (interrumpe el marco superior)
    d.ellipse([25, 6, 39, 20], fill=AZUL, outline=PLATA)
    d.ellipse([27, 8, 37, 18], outline=PLATA_D)
    texto(d, numeral, 11, PLATA_W, cx=32)
    return img, d


def rotular(d, lineas):
    """Nombre de la carta bajo el panel, con hojitas a los lados."""
    if len(lineas) == 1:
        texto(d, lineas[0], 87)
        ys = 89
    else:
        texto(d, lineas[0], 85)
        texto(d, lineas[1], 92)
        ys = 89
    for lado, x0 in ((-1, 12), (1, 52)):
        d.line([(x0, ys + 2), (x0 + lado * 4, ys - 1)], fill=PLATA_D)
        d.point((x0 + lado * 1, ys), fill=PLATA)
        d.point((x0 + lado * 3, ys - 1), fill=PLATA)


# ============================================================
#  Escenas
# ============================================================
def escena_diablo(d):
    cx = 32
    # pentagrama invertido con anillo, tras la calavera
    pcx, pcy, pr = cx, 39, 11
    d.ellipse([pcx - 13, pcy - 13, pcx + 13, pcy + 13], outline=PLATA_D)
    pts = []
    for i in range(5):
        a = math.radians(90 + i * 72)          # punta hacia abajo (invertido)
        pts.append((pcx + pr * math.cos(a), pcy + pr * math.sin(a)))
    for i in range(5):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 2) % 5]
        d.line([(int(round(x0)), int(round(y0))), (int(round(x1)), int(round(y1)))],
               fill=PLATA)
    # cuernos: siluetas curvas cuya base queda bajo el cráneo (nacen de él)
    d.polygon([(26, 42), (21, 39), (18, 34), (17, 29), (18, 26),
               (19, 29), (21, 32), (24, 36), (28, 39)],
              fill=HUESO, outline=HUESO_D)
    d.polygon([(38, 42), (43, 39), (46, 34), (47, 29), (46, 26),
               (45, 29), (43, 32), (40, 36), (36, 39)],
              fill=HUESO, outline=HUESO_D)
    # calavera (tapa la base de los cuernos)
    d.ellipse([23, 37, 41, 53], fill=HUESO, outline=HUESO_D)          # cráneo
    d.arc([24, 38, 40, 52], 300, 60, fill=HUESO_D)                    # sombra dcha
    d.line([(36, 39), (38, 42)], fill=HUESO_D)                        # grieta
    # cuencas con ceño maligno (párpado caído hacia el centro)
    d.ellipse([26, 43, 31, 48], fill=OSCURO)
    d.ellipse([33, 43, 38, 48], fill=OSCURO)
    d.polygon([(26, 43), (31, 43), (31, 45)], fill=HUESO)
    d.polygon([(38, 43), (33, 43), (33, 45)], fill=HUESO)
    d.point((28, 46), fill=PLATA_D)                                   # brillo maligno
    d.point((35, 46), fill=PLATA_D)
    # fosas nasales
    d.line([(31, 49), (30, 51)], fill=OSCURO)
    d.line([(33, 49), (34, 51)], fill=OSCURO)
    # maxilar y boca abierta con colmillos
    d.polygon([(26, 50), (38, 50), (37, 55), (27, 55)], fill=HUESO, outline=HUESO_D)
    d.rectangle([27, 55, 37, 62], fill=OSCURO)
    d.polygon([(27, 55), (29, 55), (28, 59)], fill=HUESO)             # colmillo izq
    d.polygon([(31, 55), (33, 55), (32, 58)], fill=HUESO)
    d.polygon([(35, 55), (37, 55), (36, 59)], fill=HUESO)             # colmillo der
    # mandíbula inferior con dientes
    d.polygon([(26, 62), (38, 62), (36, 67), (28, 67)], fill=HUESO, outline=HUESO_D)
    d.polygon([(29, 62), (31, 62), (30, 60)], fill=HUESO)
    d.polygon([(33, 62), (35, 62), (34, 60)], fill=HUESO)
    # estrellas
    destello(d, 13, 28)
    destello(d, 51, 27)
    destello(d, 12, 60)
    destello(d, 52, 70)
    destello(d, 20, 73)
    destello(d, 44, 72)
    for px, py in ((17, 40), (48, 34), (11, 48), (53, 55), (28, 76), (44, 74), (36, 30),
                   (15, 68), (49, 62)):
        d.point((px, py), fill=PLATA_D)


def escena_loco(d):
    # pierna de apoyo con zapato de punta rizada
    d.rectangle([29, 62, 32, 76], fill=AZUL_MD)
    d.polygon([(25, 76), (33, 76), (33, 79), (26, 79), (24, 77)], fill=OSCURO)
    cascabel(d, 24, 76)
    # pierna alzada dando la patada
    d.polygon([(33, 62), (37, 61), (43, 66), (40, 69)], fill=AZUL_M, outline=AZUL_MD)
    d.polygon([(40, 67), (43, 66), (46, 72), (43, 74)], fill=AZUL_MD)
    d.polygon([(43, 72), (47, 72), (49, 75), (45, 76), (42, 75)], fill=OSCURO)
    cascabel(d, 49, 74)
    # torso bicolor con rombos
    d.polygon([(26, 48), (38, 48), (37, 64), (27, 64)], fill=AZUL_M, outline=AZUL_MD)
    d.polygon([(32, 48), (38, 48), (37, 64), (32, 64)], fill=AZUL_MD)
    for rx, ry in ((29, 52), (30, 58), (34, 54), (35, 60)):
        d.point((rx, ry), fill=PLATA_D)
    d.line([(27, 63), (37, 63)], fill=PLATA_D)                        # cinturón
    # brazo izquierdo en alto con una rosa blanca
    d.polygon([(27, 49), (24, 48), (17, 40), (20, 37)], fill=AZUL_M, outline=AZUL_MD)
    d.ellipse([16, 35, 20, 39], fill=HUESO, outline=HUESO_D)          # mano
    d.line([(16, 35), (14, 33)], fill=PLATA_D)                        # tallo
    destello(d, 13, 31, PLATA_W)                                      # flor
    # brazo derecho extendido con campanilla
    d.polygon([(37, 50), (40, 48), (48, 54), (46, 57)], fill=AZUL_MD, outline=AZUL_MD)
    d.ellipse([46, 54, 50, 58], fill=HUESO, outline=HUESO_D)          # mano
    d.line([(50, 59), (50, 60)], fill=PLATA_D)
    cascabel(d, 50, 62)
    # gorguera blanca en zigzag
    d.polygon([(26, 49), (28, 46), (30, 49), (32, 46), (34, 49), (36, 46), (38, 49),
               (37, 50), (27, 50)], fill=PLATA_W, outline=PLATA_D)
    # cabeza sonriente con rombo pintado (guiño joker)
    d.ellipse([27, 36, 37, 46], fill=HUESO, outline=HUESO_D)
    d.point((30, 40), fill=OSCURO)
    d.point((34, 40), fill=OSCURO)
    d.point((34, 38), fill=PLATA_D)                                   # rombo sobre el ojo
    d.line([(30, 43), (34, 43)], fill=OSCURO)                         # sonrisa
    d.point((29, 42), fill=OSCURO)
    d.point((35, 42), fill=OSCURO)
    # gorro de bufón de tres puntas con cascabeles
    d.polygon([(27, 37), (37, 37), (37, 34), (27, 34)], fill=AZUL_M, outline=AZUL_MD)
    d.polygon([(27, 36), (20, 30), (28, 34)], fill=AZUL_M, outline=AZUL_MD)
    d.polygon([(30, 34), (32, 27), (34, 34)], fill=AZUL_M, outline=AZUL_MD)
    d.polygon([(37, 36), (44, 30), (36, 34)], fill=AZUL_M, outline=AZUL_MD)
    cascabel(d, 19, 29)
    cascabel(d, 32, 26)
    cascabel(d, 45, 29)
    # estrellas y chispas alrededor
    destello(d, 13, 44)
    destello(d, 50, 38)
    destello(d, 12, 68)
    destello(d, 52, 76)
    destello(d, 24, 27)
    for px, py in ((45, 32), (11, 56), (53, 46), (20, 78), (38, 76), (48, 62)):
        d.point((px, py), fill=PLATA_D)


def escena_rueda(d):
    cx, cy = 32, 50
    # rayos exteriores
    for i in range(8):
        a = math.radians(22.5 + i * 45)
        x0 = cx + int(round(19 * math.cos(a)))
        y0 = cy + int(round(19 * math.sin(a)))
        x1 = cx + int(round(22 * math.cos(a)))
        y1 = cy + int(round(22 * math.sin(a)))
        d.line([(x0, y0), (x1, y1)], fill=PLATA_D)
    # rueda: doble llanta, radios y buje
    d.ellipse([cx - 17, cy - 17, cx + 17, cy + 17], outline=PLATA)
    d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], outline=PLATA_D)
    d.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], outline=PLATA_D)
    for i in range(8):
        a = math.radians(i * 45)
        x1 = cx + int(round(11 * math.cos(a)))
        y1 = cy + int(round(11 * math.sin(a)))
        d.line([(cx, cy), (x1, y1)], fill=PLATA_D)
    # buje con ojo que todo lo ve
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=NOCHE, outline=PLATA)
    d.line([(cx - 2, cy), (cx + 2, cy)], fill=PLATA_D)
    d.point((cx, cy), fill=PLATA_W)
    # símbolos arcanos en la corona (triángulo, luna, cruz, estrella)
    d.polygon([(32, 34), (30, 38), (34, 38)], outline=PLATA_W)        # fuego
    d.arc([43, 47, 49, 53], 90, 270, fill=PLATA_W)                    # luna
    d.point((45, 50), fill=PLATA_W)
    d.line([(32, 62), (32, 66)], fill=PLATA_W)                        # cruz
    d.line([(30, 64), (34, 64)], fill=PLATA_W)
    destello(d, 18, 50, PLATA_W)                                      # estrella
    # tachuelas diagonales de la corona
    for sx, sy in ((42, 40), (22, 40), (22, 60), (42, 60)):
        d.point((sx, sy), fill=PLATA)
    # serpiente descendiendo (lado izquierdo, guiño Rider-Waite)
    serp = [(12, 28), (10, 33), (13, 38), (10, 43), (12, 48)]
    d.line(serp, fill=PLATA_D, width=1)
    d.polygon([(11, 49), (13, 51), (11, 53), (9, 51)], fill=PLATA, outline=PLATA_D)
    d.point((11, 51), fill=OSCURO)
    # estrellas y chispas
    destello(d, 50, 28)
    destello(d, 14, 70)
    destello(d, 50, 74)
    destello(d, 20, 30)
    for px, py in ((46, 34), (53, 50), (11, 60), (27, 76), (44, 76), (36, 28)):
        d.point((px, py), fill=PLATA_D)


# ============================================================
#  Generación
# ============================================================
CARTAS = [
    ("diablo", "XV", ["THE DEVIL"], escena_diablo),
    ("loco",   "O",  ["THE FOOL"], escena_loco),
    ("rueda",  "X",  ["WHEEL OF", "FORTUNE"], escena_rueda),
]


def main():
    finales = {}
    for nombre, numeral, lineas, escena in CARTAS:
        img, d = base_carta(numeral)
        escena(d)
        rotular(d, lineas)
        grande = img.resize((W * SCALE, H * SCALE), Image.NEAREST)
        grande.save(os.path.join(SALIDA, f"tarot-{nombre}.png"))
        grande.rotate(180).save(os.path.join(SALIDA, f"tarot-{nombre}-invertida.png"))
        finales[nombre] = grande

    # hoja de contacto (solo derechas)
    mini_w, mini_h = W * 3, H * 3
    gap = 8
    hoja = Image.new("RGB", (3 * (mini_w + gap) + gap, mini_h + 2 * gap), (25, 25, 30))
    for i, (nombre, _, _, _) in enumerate(CARTAS):
        mini = finales[nombre].resize((mini_w, mini_h), Image.NEAREST)
        hoja.paste(mini, (gap + i * (mini_w + gap), gap), mini)
    hoja.save(os.path.join(SALIDA, "_contacto_tarot.png"))
    print(f"Generadas {len(CARTAS)} cartas de tarot (+ invertidas) en {SALIDA}")


if __name__ == "__main__":
    main()
