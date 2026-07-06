"""Genera 3 cartas de tarot en pixel art: El Diablo (XV), El Loco (0) y la
Rueda de la Fortuna (X), en azul oscuro y plateado, estilo recargado
(marco triple, medallón con numeral, panel estrellado, ornamentos), con el
nombre en inglés dentro de la carta, abajo.

También genera las versiones invertidas (giradas 180 grados).

La base es 72x100: mismo ratio (0,72) que la baraja española (54x75), para
que al mostrarlas juntas tengan la misma proporción.

Uso:  python img/cartas/generar_tarot.py
Salida:  img/cartas/tarot-<carta>.png , tarot-<carta>-invertida.png
         y _contacto_tarot.png (revisión)
"""

import math
import os
from PIL import Image, ImageDraw

SALIDA = os.path.dirname(os.path.abspath(__file__))

W, H = 72, 100
SCALE = 6  # 432 x 600
CX = W // 2

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
    d.rectangle([7, 23, 64, 81], fill=NOCHE, outline=PLATA)
    d.rectangle([8, 24, 63, 80], outline=PLATA_D)
    # abanicos en las 4 esquinas del panel
    for cx_, cy_, a0, a1 in ((7, 23, 0, 90), (64, 23, 90, 180),
                             (64, 81, 180, 270), (7, 81, 270, 360)):
        d.arc([cx_ - 8, cy_ - 8, cx_ + 8, cy_ + 8], a0, a1, fill=PLATA_D)
        d.arc([cx_ - 5, cy_ - 5, cx_ + 5, cy_ + 5], a0, a1, fill=PLATA)
    # gotas colgantes del borde superior del panel
    for gx in (16, 24, 48, 56):
        d.line([(gx, 25), (gx, 27)], fill=PLATA_D)
        d.point((gx, 28), fill=PLATA_W)
    # ramas de laurel a los lados del medallón
    for lado in (-1, 1):
        x0 = CX + lado * 9
        x1 = CX + lado * 26
        d.line([(x0, 13), (x1, 13)], fill=PLATA_D)
        paso = 3 * lado
        for i, lx in enumerate(range(x0 + paso, x1, paso)):
            dy = -2 if i % 2 == 0 else 2
            d.line([(lx, 13), (lx - 2 * lado, 13 + dy)], fill=PLATA)
    # medallón del numeral (interrumpe el marco superior)
    d.ellipse([CX - 7, 6, CX + 7, 20], fill=AZUL, outline=PLATA)
    d.ellipse([CX - 5, 8, CX + 5, 18], outline=PLATA_D)
    texto(d, numeral, 11, PLATA_W, cx=CX)
    return img, d


def rotular(d, lineas):
    """Nombre de la carta bajo el panel, con hojitas a los lados."""
    if len(lineas) == 1:
        texto(d, lineas[0], 86)
    else:
        texto(d, lineas[0], 83)
        texto(d, lineas[1], 89)
    ys = 86
    for lado, x0 in ((-1, 14), (1, 58)):
        d.line([(x0, ys + 2), (x0 + lado * 4, ys - 1)], fill=PLATA_D)
        d.point((x0 + lado * 1, ys), fill=PLATA)
        d.point((x0 + lado * 3, ys - 1), fill=PLATA)


# ============================================================
#  Escenas
# ============================================================
def escena_diablo(d):
    # pentagrama invertido con anillo, tras la calavera
    pcx, pcy, pr = CX, 39, 11
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
    d.polygon([(30, 42), (25, 39), (22, 34), (21, 29), (22, 26),
               (23, 29), (25, 32), (28, 36), (32, 39)],
              fill=HUESO, outline=HUESO_D)
    d.polygon([(42, 42), (47, 39), (50, 34), (51, 29), (50, 26),
               (49, 29), (47, 32), (44, 36), (40, 39)],
              fill=HUESO, outline=HUESO_D)
    # calavera (tapa la base de los cuernos)
    d.ellipse([27, 37, 45, 53], fill=HUESO, outline=HUESO_D)          # cráneo
    d.arc([28, 38, 44, 52], 300, 60, fill=HUESO_D)                    # sombra dcha
    d.line([(40, 39), (42, 42)], fill=HUESO_D)                        # grieta
    # cuencas con ceño maligno (párpado caído hacia el centro)
    d.ellipse([30, 43, 35, 48], fill=OSCURO)
    d.ellipse([37, 43, 42, 48], fill=OSCURO)
    d.polygon([(30, 43), (35, 43), (35, 45)], fill=HUESO)
    d.polygon([(42, 43), (37, 43), (37, 45)], fill=HUESO)
    d.point((32, 46), fill=PLATA_D)                                   # brillo maligno
    d.point((39, 46), fill=PLATA_D)
    # fosas nasales
    d.line([(35, 49), (34, 51)], fill=OSCURO)
    d.line([(37, 49), (38, 51)], fill=OSCURO)
    # maxilar y boca abierta con colmillos
    d.polygon([(30, 50), (42, 50), (41, 55), (31, 55)], fill=HUESO, outline=HUESO_D)
    d.rectangle([31, 55, 41, 62], fill=OSCURO)
    d.polygon([(31, 55), (33, 55), (32, 59)], fill=HUESO)             # colmillo izq
    d.polygon([(35, 55), (37, 55), (36, 58)], fill=HUESO)
    d.polygon([(39, 55), (41, 55), (40, 59)], fill=HUESO)             # colmillo der
    # mandíbula inferior con dientes
    d.polygon([(30, 62), (42, 62), (40, 67), (32, 67)], fill=HUESO, outline=HUESO_D)
    d.polygon([(33, 62), (35, 62), (34, 60)], fill=HUESO)
    d.polygon([(37, 62), (39, 62), (38, 60)], fill=HUESO)
    # estrellas
    destello(d, 17, 28)
    destello(d, 55, 27)
    destello(d, 16, 60)
    destello(d, 56, 70)
    destello(d, 24, 73)
    destello(d, 48, 72)
    for px, py in ((21, 40), (52, 34), (15, 48), (57, 55), (32, 76), (48, 74),
                   (40, 30), (19, 68), (53, 62)):
        d.point((px, py), fill=PLATA_D)


def escena_loco(d):
    # pierna de apoyo con zapato de punta rizada
    d.rectangle([33, 62, 36, 76], fill=AZUL_MD)
    d.polygon([(29, 76), (37, 76), (37, 79), (30, 79), (28, 77)], fill=OSCURO)
    cascabel(d, 28, 76)
    # pierna alzada dando la patada
    d.polygon([(37, 62), (41, 61), (47, 66), (44, 69)], fill=AZUL_M, outline=AZUL_MD)
    d.polygon([(44, 67), (47, 66), (50, 72), (47, 74)], fill=AZUL_MD)
    d.polygon([(47, 72), (51, 72), (53, 75), (49, 76), (46, 75)], fill=OSCURO)
    cascabel(d, 53, 74)
    # torso bicolor con rombos
    d.polygon([(30, 48), (42, 48), (41, 64), (31, 64)], fill=AZUL_M, outline=AZUL_MD)
    d.polygon([(36, 48), (42, 48), (41, 64), (36, 64)], fill=AZUL_MD)
    for rx, ry in ((33, 52), (34, 58), (38, 54), (39, 60)):
        d.point((rx, ry), fill=PLATA_D)
    d.line([(31, 63), (41, 63)], fill=PLATA_D)                        # cinturón
    # brazo izquierdo en alto con una rosa blanca
    d.polygon([(31, 49), (28, 48), (21, 40), (24, 37)], fill=AZUL_M, outline=AZUL_MD)
    d.ellipse([20, 35, 24, 39], fill=HUESO, outline=HUESO_D)          # mano
    d.line([(20, 35), (18, 33)], fill=PLATA_D)                        # tallo
    destello(d, 17, 31, PLATA_W)                                      # flor
    # brazo derecho extendido con campanilla
    d.polygon([(41, 50), (44, 48), (52, 54), (50, 57)], fill=AZUL_MD, outline=AZUL_MD)
    d.ellipse([50, 54, 54, 58], fill=HUESO, outline=HUESO_D)          # mano
    d.line([(54, 59), (54, 60)], fill=PLATA_D)
    cascabel(d, 54, 62)
    # gorguera blanca en zigzag
    d.polygon([(30, 49), (32, 46), (34, 49), (36, 46), (38, 49), (40, 46), (42, 49),
               (41, 50), (31, 50)], fill=PLATA_W, outline=PLATA_D)
    # cabeza sonriente con rombo pintado (guiño joker)
    d.ellipse([31, 36, 41, 46], fill=HUESO, outline=HUESO_D)
    d.point((34, 40), fill=OSCURO)
    d.point((38, 40), fill=OSCURO)
    d.point((38, 38), fill=PLATA_D)                                   # rombo sobre el ojo
    d.line([(34, 43), (38, 43)], fill=OSCURO)                         # sonrisa
    d.point((33, 42), fill=OSCURO)
    d.point((39, 42), fill=OSCURO)
    # gorro de bufón de tres puntas con cascabeles
    d.polygon([(31, 37), (41, 37), (41, 34), (31, 34)], fill=AZUL_M, outline=AZUL_MD)
    d.polygon([(31, 36), (24, 30), (32, 34)], fill=AZUL_M, outline=AZUL_MD)
    d.polygon([(34, 34), (36, 27), (38, 34)], fill=AZUL_M, outline=AZUL_MD)
    d.polygon([(41, 36), (48, 30), (40, 34)], fill=AZUL_M, outline=AZUL_MD)
    cascabel(d, 23, 29)
    cascabel(d, 36, 26)
    cascabel(d, 49, 29)
    # estrellas y chispas alrededor
    destello(d, 17, 44)
    destello(d, 54, 38)
    destello(d, 16, 68)
    destello(d, 56, 76)
    destello(d, 28, 27)
    for px, py in ((49, 32), (15, 56), (57, 46), (24, 78), (42, 76), (52, 62)):
        d.point((px, py), fill=PLATA_D)


def escena_rueda(d):
    cx, cy = CX, 50
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
    d.polygon([(cx, 34), (cx - 2, 38), (cx + 2, 38)], outline=PLATA_W)  # fuego
    d.arc([cx + 11, 47, cx + 17, 53], 90, 270, fill=PLATA_W)            # luna
    d.point((cx + 13, 50), fill=PLATA_W)
    d.line([(cx, 62), (cx, 66)], fill=PLATA_W)                          # cruz
    d.line([(cx - 2, 64), (cx + 2, 64)], fill=PLATA_W)
    destello(d, cx - 14, 50, PLATA_W)                                   # estrella
    # tachuelas diagonales de la corona
    for sx, sy in ((cx + 10, 40), (cx - 10, 40), (cx - 10, 60), (cx + 10, 60)):
        d.point((sx, sy), fill=PLATA)
    # serpiente descendiendo (lado izquierdo, guiño Rider-Waite)
    serp = [(16, 28), (14, 33), (17, 38), (14, 43), (16, 48)]
    d.line(serp, fill=PLATA_D, width=1)
    d.polygon([(15, 49), (17, 51), (15, 53), (13, 51)], fill=PLATA, outline=PLATA_D)
    d.point((15, 51), fill=OSCURO)
    # estrellas y chispas
    destello(d, 54, 28)
    destello(d, 18, 70)
    destello(d, 54, 74)
    destello(d, 24, 30)
    for px, py in ((50, 34), (57, 50), (15, 60), (31, 76), (48, 76), (40, 28)):
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
