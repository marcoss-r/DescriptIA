"""Genera los 22 arcanos mayores de «21 Arcanos» en pixel art, en NEGRO y
DORADO (paleta propia del blackjack, distinta del azul/plata de Cartas de la
Fortuna), manteniendo el diseno de generar_tarot.py: marco triple, medallon
superior con el numeral, panel de escena y nombre dentro de la carta, abajo.

Tambien genera las versiones invertidas (giradas 180 grados) y una hoja de
contacto de revision.

La base es 72x100: mismo ratio (0,72) que el resto de barajas de la app.

NOTA de reanudacion: cada arcano es una funcion escena_* registrada en la
lista CARTAS del final. El script es ejecutable aunque falten escenas: genera
las que esten registradas. Para continuar, anadir la siguiente funcion de
escena y su entrada en CARTAS.

Uso:  python img/21arc/generar_tarot_bj.py
Salida:  img/21arc/tarot-bj-<carta>.png , tarot-bj-<carta>-invertida.png
         y _contacto_tarot_bj.png (revision)
"""

import math
import os
from PIL import Image, ImageDraw

SALIDA = os.path.dirname(os.path.abspath(__file__))

W, H = 72, 100
SCALE = 6  # 432 x 600
CX = W // 2

# --- Paleta: negro + dorado ---
NEGRO   = (12, 10, 8)        # fondo de la carta
PANEL   = (6, 5, 4)          # panel interior (noche)
ORO     = (212, 175, 55)
ORO_D   = (140, 110, 40)
ORO_W   = (250, 230, 160)
HUESO   = (228, 224, 212)
HUESO_D = (158, 152, 136)
ROPA    = (126, 96, 44)      # ropajes de las figuras (pardo dorado)
ROPA_D  = (82, 62, 28)
OSCURO  = (2, 2, 2)


# ============================================================
#  Fuente 3x5 (solo los caracteres necesarios)
# ============================================================
FUENTE = {
    "A": [".#.", "#.#", "###", "#.#", "#.#"],
    "C": ["###", "#..", "#..", "#..", "###"],
    "D": ["##.", "#.#", "#.#", "#.#", "##."],
    "E": ["###", "#..", "###", "#..", "###"],
    "F": ["###", "#..", "###", "#..", "#.."],
    "G": ["###", "#..", "#.#", "#.#", "###"],
    "H": ["#.#", "#.#", "###", "#.#", "#.#"],
    "I": ["###", ".#.", ".#.", ".#.", "###"],
    "J": ["..#", "..#", "..#", "#.#", ".#."],
    "L": ["#..", "#..", "#..", "#..", "###"],
    "M": ["#.#", "###", "#.#", "#.#", "#.#"],
    "N": ["##.", "#.#", "#.#", "#.#", "#.#"],
    "O": ["###", "#.#", "#.#", "#.#", "###"],
    "P": ["##.", "#.#", "##.", "#..", "#.."],
    "R": ["##.", "#.#", "##.", "#.#", "#.#"],
    "S": ["###", "#..", "###", "..#", "###"],
    "T": ["###", ".#.", ".#.", ".#.", ".#."],
    "U": ["#.#", "#.#", "#.#", "#.#", "###"],
    "V": ["#.#", "#.#", "#.#", "#.#", ".#."],
    "W": ["#.#", "#.#", "#.#", "###", "#.#"],
    "X": ["#.#", "#.#", ".#.", "#.#", "#.#"],
}


def texto(d, s, y, color=ORO_W, cx=None):
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


def destello(d, x, y, c=ORO_W):
    """Estrella de 4 puntas (rombo de 5 pixeles)."""
    d.point((x, y), fill=c)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        d.point((x + dx, y + dy), fill=ORO_D)


def cascabel(d, x, y):
    d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=ORO_W, outline=ORO_D)


# ============================================================
#  Marco recargado comun (identico al tarot azul, en negro/dorado)
# ============================================================
def base_carta(numeral):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # triple marco dorado
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=7, fill=NEGRO, outline=ORO_D)
    d.rounded_rectangle([2, 2, W - 3, H - 3], radius=6, outline=ORO)
    d.rounded_rectangle([4, 4, W - 5, H - 5], radius=5, outline=ORO_D)
    # panel interior (noche)
    d.rectangle([7, 23, 64, 81], fill=PANEL, outline=ORO)
    d.rectangle([8, 24, 63, 80], outline=ORO_D)
    # abanicos en las 4 esquinas del panel
    for cx_, cy_, a0, a1 in ((7, 23, 0, 90), (64, 23, 90, 180),
                             (64, 81, 180, 270), (7, 81, 270, 360)):
        d.arc([cx_ - 8, cy_ - 8, cx_ + 8, cy_ + 8], a0, a1, fill=ORO_D)
        d.arc([cx_ - 5, cy_ - 5, cx_ + 5, cy_ + 5], a0, a1, fill=ORO)
    # gotas colgantes del borde superior del panel
    for gx in (16, 24, 48, 56):
        d.line([(gx, 25), (gx, 27)], fill=ORO_D)
        d.point((gx, 28), fill=ORO_W)
    # medallon del numeral (se ensancha con numerales largos, p. ej. XVIII)
    ancho_num = 4 * len(numeral) - 1
    half = max(7, ancho_num // 2 + 3)
    # ramas de laurel a los lados del medallon
    for lado in (-1, 1):
        x0 = CX + lado * (half + 2)
        x1 = CX + lado * 26
        d.line([(x0, 13), (x1, 13)], fill=ORO_D)
        paso = 3 * lado
        for i, lx in enumerate(range(x0 + paso, x1, paso)):
            dy = -2 if i % 2 == 0 else 2
            d.line([(lx, 13), (lx - 2 * lado, 13 + dy)], fill=ORO)
    d.ellipse([CX - half, 6, CX + half, 20], fill=NEGRO, outline=ORO)
    d.ellipse([CX - half + 2, 8, CX + half - 2, 18], outline=ORO_D)
    texto(d, numeral, 11, ORO_W, cx=CX)
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
        d.line([(x0, ys + 2), (x0 + lado * 4, ys - 1)], fill=ORO_D)
        d.point((x0 + lado * 1, ys), fill=ORO)
        d.point((x0 + lado * 3, ys - 1), fill=ORO)


def chispas(d, puntos):
    for px, py in puntos:
        d.point((px, py), fill=ORO_D)


# ============================================================
#  Escenas (una por arcano)
# ============================================================
def escena_loco(d):
    """0 - El Loco: bufon dando una patada al aire, rehecho en negro/dorado."""
    # pierna de apoyo con zapato de punta rizada
    d.rectangle([33, 62, 36, 76], fill=ROPA_D)
    d.polygon([(29, 76), (37, 76), (37, 79), (30, 79), (28, 77)], fill=OSCURO)
    d.line([(29, 79), (36, 79)], fill=ORO_D)
    cascabel(d, 28, 76)
    # pierna alzada dando la patada
    d.polygon([(37, 62), (41, 61), (47, 66), (44, 69)], fill=ROPA, outline=ROPA_D)
    d.polygon([(44, 67), (47, 66), (50, 72), (47, 74)], fill=ROPA_D)
    d.polygon([(47, 72), (51, 72), (53, 75), (49, 76), (46, 75)], fill=OSCURO)
    d.line([(48, 76), (52, 75)], fill=ORO_D)
    cascabel(d, 53, 74)
    # torso bicolor con rombos
    d.polygon([(30, 48), (42, 48), (41, 64), (31, 64)], fill=ROPA, outline=ROPA_D)
    d.polygon([(36, 48), (42, 48), (41, 64), (36, 64)], fill=ROPA_D)
    for rx, ry in ((33, 52), (34, 58), (38, 54), (39, 60)):
        d.point((rx, ry), fill=ORO)
    d.line([(31, 63), (41, 63)], fill=ORO_D)                          # cinturon
    # brazo izquierdo en alto con una rosa
    d.polygon([(31, 49), (28, 48), (21, 40), (24, 37)], fill=ROPA, outline=ROPA_D)
    d.ellipse([20, 35, 24, 39], fill=HUESO, outline=HUESO_D)          # mano
    d.line([(20, 35), (18, 33)], fill=ORO_D)                          # tallo
    destello(d, 17, 31, ORO_W)                                        # flor
    # brazo derecho extendido con campanilla
    d.polygon([(41, 50), (44, 48), (52, 54), (50, 57)], fill=ROPA_D, outline=ROPA_D)
    d.ellipse([50, 54, 54, 58], fill=HUESO, outline=HUESO_D)          # mano
    d.line([(54, 59), (54, 60)], fill=ORO_D)
    cascabel(d, 54, 62)
    # gorguera en zigzag
    d.polygon([(30, 49), (32, 46), (34, 49), (36, 46), (38, 49), (40, 46), (42, 49),
               (41, 50), (31, 50)], fill=ORO_W, outline=ORO_D)
    # cabeza sonriente con rombo pintado
    d.ellipse([31, 36, 41, 46], fill=HUESO, outline=HUESO_D)
    d.point((34, 40), fill=OSCURO)
    d.point((38, 40), fill=OSCURO)
    d.point((38, 38), fill=ORO_D)                                     # rombo sobre el ojo
    d.line([(34, 43), (38, 43)], fill=OSCURO)                         # sonrisa
    d.point((33, 42), fill=OSCURO)
    d.point((39, 42), fill=OSCURO)
    # gorro de bufon de tres puntas con cascabeles
    d.polygon([(31, 37), (41, 37), (41, 34), (31, 34)], fill=ROPA, outline=ROPA_D)
    d.polygon([(31, 36), (24, 30), (32, 34)], fill=ROPA, outline=ROPA_D)
    d.polygon([(34, 34), (36, 27), (38, 34)], fill=ROPA, outline=ROPA_D)
    d.polygon([(41, 36), (48, 30), (40, 34)], fill=ROPA, outline=ROPA_D)
    cascabel(d, 23, 29)
    cascabel(d, 36, 26)
    cascabel(d, 49, 29)
    # estrellas y chispas alrededor
    destello(d, 17, 44)
    destello(d, 54, 38)
    destello(d, 16, 68)
    destello(d, 56, 76)
    destello(d, 28, 27)
    chispas(d, ((49, 32), (15, 56), (57, 46), (24, 78), (42, 76), (52, 62)))


def escena_mago(d):
    """I - El Mago: sombrero picudo, varita e infinito, y caldero de pociones."""
    # infinito junto al sombrero
    d.ellipse([22, 25, 27, 29], outline=ORO)
    d.ellipse([29, 25, 34, 29], outline=ORO)
    d.point((28, 27), fill=ORO_W)
    # tunica estrellada
    d.polygon([(26, 44), (40, 44), (43, 72), (23, 72)], fill=ROPA, outline=ROPA_D)
    d.polygon([(33, 44), (40, 44), (43, 72), (38, 72)], fill=ROPA_D)
    d.line([(25, 71), (41, 71)], fill=ORO_D)
    for rx, ry in ((28, 52), (30, 62), (34, 56), (37, 66), (26, 66)):
        d.point((rx, ry), fill=ORO)
    destello(d, 31, 49, ORO_W)
    # cabeza con barba de mago
    d.ellipse([28, 36, 38, 46], fill=HUESO, outline=HUESO_D)
    d.point((31, 40), fill=OSCURO)
    d.point((35, 40), fill=OSCURO)
    d.polygon([(30, 44), (36, 44), (33, 51)], fill=HUESO, outline=HUESO_D)
    # sombrero picudo con ala ancha y estrella
    d.polygon([(33, 25), (39, 37), (27, 37)], fill=ROPA_D, outline=OSCURO)
    d.line([(24, 37), (42, 37)], fill=ROPA_D)
    d.line([(24, 38), (42, 38)], fill=OSCURO)
    d.point((33, 31), fill=ORO)
    # brazo con la varita sobre el caldero
    d.polygon([(38, 46), (41, 45), (46, 50), (44, 53)], fill=ROPA, outline=ROPA_D)
    d.ellipse([44, 50, 48, 54], fill=HUESO, outline=HUESO_D)
    d.line([(48, 50), (53, 45)], fill=ORO)                            # varita
    d.point((54, 44), fill=ORO_W)
    # caldero de pociones burbujeante
    d.ellipse([44, 62, 60, 74], fill=NEGRO, outline=ORO_D)
    d.ellipse([44, 60, 60, 66], fill=OSCURO, outline=ORO)             # boca
    d.arc([46, 62, 58, 66], 180, 360, fill=ORO_W)                     # pocion
    d.line([(46, 74), (44, 77)], fill=ORO_D)                          # patas
    d.line([(52, 74), (52, 77)], fill=ORO_D)
    d.line([(58, 74), (60, 77)], fill=ORO_D)
    # burbujas subiendo hacia la varita
    d.point((54, 57), fill=ORO_W)
    d.point((50, 54), fill=ORO)
    d.point((56, 51), fill=ORO_W)
    destello(d, 52, 47, ORO_W)
    # estrellas
    destello(d, 15, 32)
    destello(d, 57, 28)
    destello(d, 14, 54)
    destello(d, 18, 74)
    chispas(d, ((20, 42), (58, 38), (16, 64), (36, 77), (61, 55), (12, 26)))


def escena_sacerdotisa(d):
    """II - La Sacerdotisa: mitra, manto y cruz, entre las dos columnas."""
    # pilares (uno oscuro y otro claro)
    d.rectangle([11, 28, 17, 78], fill=PANEL, outline=ORO_D)
    d.rectangle([10, 25, 18, 28], fill=NEGRO, outline=ORO_D)
    d.rectangle([12, 74, 16, 78], fill=NEGRO)
    d.rectangle([55, 28, 61, 78], fill=ROPA_D, outline=ORO_D)
    d.rectangle([54, 25, 62, 28], fill=ROPA, outline=ORO_D)
    d.line([(56, 30), (56, 72)], fill=ROPA)
    # velo tendido entre los pilares
    d.line([(18, 32), (54, 32)], fill=ORO_D)
    for vx in (22, 28, 44, 50):
        d.point((vx, 34), fill=ORO_D)
    # tunica
    d.polygon([(29, 52), (43, 52), (47, 76), (25, 76)], fill=ROPA, outline=ROPA_D)
    d.polygon([(36, 52), (43, 52), (47, 76), (41, 76)], fill=ROPA_D)
    d.line([(27, 75), (45, 75)], fill=ORO_D)
    # manto claro cayendo por los hombros
    d.polygon([(29, 52), (33, 52), (31, 74), (26, 74)], fill=HUESO, outline=HUESO_D)
    d.polygon([(43, 52), (39, 52), (41, 74), (46, 74)], fill=HUESO, outline=HUESO_D)
    # cruz dorada en el pecho
    d.line([(36, 55), (36, 63)], fill=ORO_W)
    d.line([(33, 58), (39, 58)], fill=ORO_W)
    # manos recogidas
    d.ellipse([31, 64, 35, 68], fill=HUESO, outline=HUESO_D)
    d.ellipse([37, 64, 41, 68], fill=HUESO, outline=HUESO_D)
    # cuello y cabeza serena
    d.rectangle([34, 49, 38, 52], fill=HUESO, outline=HUESO_D)
    d.ellipse([31, 40, 41, 50], fill=HUESO, outline=HUESO_D)
    d.point((34, 45), fill=OSCURO)
    d.point((38, 45), fill=OSCURO)
    d.line([(35, 48), (37, 48)], fill=OSCURO)
    # mitra dorada con media luna
    d.polygon([(31, 41), (41, 41), (41, 34), (36, 27), (31, 34)], fill=ORO, outline=ORO_D)
    d.line([(32, 38), (40, 38)], fill=ORO_D)
    d.arc([33, 30, 39, 36], 90, 270, fill=ORO_W)
    # luna creciente a sus pies
    d.arc([32, 74, 40, 80], 200, 340, fill=ORO_W)
    # estrellas
    destello(d, 22, 44)
    destello(d, 50, 42)
    destello(d, 21, 66)
    destello(d, 51, 68)
    chispas(d, ((25, 30), (47, 30), (20, 54), (52, 56), (36, 24)))


def escena_emperatriz(d):
    """III - La Emperatriz: melena, gran corona y cetro; poderosa en su trono."""
    # respaldo del trono
    d.rounded_rectangle([22, 30, 50, 62], radius=4, fill=NEGRO, outline=ORO_D)
    destello(d, 24, 32, ORO)
    destello(d, 48, 32, ORO)
    # vestido amplio con pedreria
    d.polygon([(28, 46), (44, 46), (50, 76), (22, 76)], fill=ROPA, outline=ROPA_D)
    d.polygon([(36, 46), (44, 46), (50, 76), (43, 76)], fill=ROPA_D)
    d.line([(24, 75), (48, 75)], fill=ORO_D)
    for rx, ry in ((30, 56), (28, 68), (36, 62), (40, 55), (34, 70), (44, 68)):
        d.point((rx, ry), fill=ORO)
    # melena larga y dorada cayendo sobre los hombros
    d.polygon([(29, 38), (26, 58), (31, 58), (32, 44)], fill=ORO_D)
    d.polygon([(43, 38), (46, 58), (41, 58), (40, 44)], fill=ORO_D)
    d.point((28, 48), fill=ORO)
    d.point((44, 50), fill=ORO)
    d.point((27, 54), fill=ORO)
    # cabeza femenina con collar
    d.ellipse([31, 36, 41, 46], fill=HUESO, outline=HUESO_D)
    d.point((34, 41), fill=OSCURO)
    d.point((38, 41), fill=OSCURO)
    d.line([(35, 44), (37, 44)], fill=OSCURO)
    d.line([(33, 47), (39, 47)], fill=ORO)
    d.point((36, 48), fill=ORO_W)
    # gran corona asentada sobre la cabeza
    d.rectangle([30, 33, 42, 37], fill=ORO, outline=ORO_D)
    d.polygon([(30, 33), (32, 27), (34, 33)], fill=ORO, outline=ORO_D)
    d.polygon([(34, 33), (36, 25), (38, 33)], fill=ORO, outline=ORO_D)
    d.polygon([(38, 33), (40, 27), (42, 33)], fill=ORO, outline=ORO_D)
    d.point((32, 27), fill=ORO_W)
    d.point((36, 25), fill=ORO_W)
    d.point((40, 27), fill=ORO_W)
    d.point((36, 35), fill=ORO_W)
    # cetro rematado en orbe en su mano derecha
    d.polygon([(41, 47), (44, 46), (49, 43), (47, 40)], fill=ROPA, outline=ROPA_D)
    d.line([(51, 31), (48, 42)], fill=ORO)
    d.ellipse([49, 26, 54, 31], fill=NEGRO, outline=ORO_W)
    d.point((51, 28), fill=ORO)
    d.ellipse([46, 40, 50, 44], fill=HUESO, outline=HUESO_D)
    # espigas de trigo al pie
    for wx in (14, 17, 20):
        d.line([(wx, 78), (wx, 70)], fill=ORO_D)
        d.point((wx - 1, 71), fill=ORO)
        d.point((wx + 1, 72), fill=ORO)
        d.point((wx - 1, 74), fill=ORO)
    # estrellas
    destello(d, 17, 30)
    destello(d, 56, 28)
    destello(d, 15, 50)
    destello(d, 56, 62)
    chispas(d, ((18, 40), (57, 48), (26, 78), (46, 77), (54, 72)))


def escena_diablo(d):
    """XV - El Diablo: calavera cornuda y pentagrama, rehecho en negro/dorado."""
    # pentagrama invertido con anillo, tras la calavera
    pcx, pcy, pr = CX, 39, 11
    d.ellipse([pcx - 13, pcy - 13, pcx + 13, pcy + 13], outline=ORO_D)
    pts = []
    for i in range(5):
        a = math.radians(90 + i * 72)          # punta hacia abajo (invertido)
        pts.append((pcx + pr * math.cos(a), pcy + pr * math.sin(a)))
    for i in range(5):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 2) % 5]
        d.line([(int(round(x0)), int(round(y0))), (int(round(x1)), int(round(y1)))],
               fill=ORO)
    # cuernos
    d.polygon([(30, 42), (25, 39), (22, 34), (21, 29), (22, 26),
               (23, 29), (25, 32), (28, 36), (32, 39)],
              fill=HUESO, outline=HUESO_D)
    d.polygon([(42, 42), (47, 39), (50, 34), (51, 29), (50, 26),
               (49, 29), (47, 32), (44, 36), (40, 39)],
              fill=HUESO, outline=HUESO_D)
    # calavera
    d.ellipse([27, 37, 45, 53], fill=HUESO, outline=HUESO_D)
    d.arc([28, 38, 44, 52], 300, 60, fill=HUESO_D)
    d.line([(40, 39), (42, 42)], fill=HUESO_D)
    # cuencas con ceno maligno
    d.ellipse([30, 43, 35, 48], fill=OSCURO)
    d.ellipse([37, 43, 42, 48], fill=OSCURO)
    d.polygon([(30, 43), (35, 43), (35, 45)], fill=HUESO)
    d.polygon([(42, 43), (37, 43), (37, 45)], fill=HUESO)
    d.point((32, 46), fill=ORO)                                       # brillo maligno
    d.point((39, 46), fill=ORO)
    # fosas nasales
    d.line([(35, 49), (34, 51)], fill=OSCURO)
    d.line([(37, 49), (38, 51)], fill=OSCURO)
    # maxilar y boca abierta con colmillos
    d.polygon([(30, 50), (42, 50), (41, 55), (31, 55)], fill=HUESO, outline=HUESO_D)
    d.rectangle([31, 55, 41, 62], fill=OSCURO)
    d.polygon([(31, 55), (33, 55), (32, 59)], fill=HUESO)
    d.polygon([(35, 55), (37, 55), (36, 58)], fill=HUESO)
    d.polygon([(39, 55), (41, 55), (40, 59)], fill=HUESO)
    # mandibula inferior con dientes
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
    chispas(d, ((21, 40), (52, 34), (15, 48), (57, 55), (32, 76), (48, 74),
                (40, 30), (19, 68), (53, 62)))


def escena_rueda(d):
    """X - La Rueda de la Fortuna: rehecha en negro/dorado."""
    cx, cy = CX, 50
    # rayos exteriores
    for i in range(8):
        a = math.radians(22.5 + i * 45)
        x0 = cx + int(round(19 * math.cos(a)))
        y0 = cy + int(round(19 * math.sin(a)))
        x1 = cx + int(round(22 * math.cos(a)))
        y1 = cy + int(round(22 * math.sin(a)))
        d.line([(x0, y0), (x1, y1)], fill=ORO_D)
    # rueda: doble llanta, radios y buje
    d.ellipse([cx - 17, cy - 17, cx + 17, cy + 17], outline=ORO)
    d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], outline=ORO_D)
    d.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], outline=ORO_D)
    for i in range(8):
        a = math.radians(i * 45)
        x1 = cx + int(round(11 * math.cos(a)))
        y1 = cy + int(round(11 * math.sin(a)))
        d.line([(cx, cy), (x1, y1)], fill=ORO_D)
    # buje con ojo que todo lo ve
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=PANEL, outline=ORO)
    d.line([(cx - 2, cy), (cx + 2, cy)], fill=ORO_D)
    d.point((cx, cy), fill=ORO_W)
    # simbolos arcanos en la corona (triangulo, luna, cruz, estrella)
    d.polygon([(cx, 34), (cx - 2, 38), (cx + 2, 38)], outline=ORO_W)    # fuego
    d.arc([cx + 11, 47, cx + 17, 53], 90, 270, fill=ORO_W)              # luna
    d.point((cx + 13, 50), fill=ORO_W)
    d.line([(cx, 62), (cx, 66)], fill=ORO_W)                            # cruz
    d.line([(cx - 2, 64), (cx + 2, 64)], fill=ORO_W)
    destello(d, cx - 14, 50, ORO_W)                                     # estrella
    # tachuelas diagonales de la corona
    for sx, sy in ((cx + 10, 40), (cx - 10, 40), (cx - 10, 60), (cx + 10, 60)):
        d.point((sx, sy), fill=ORO)
    # serpiente descendiendo (lado izquierdo)
    serp = [(16, 28), (14, 33), (17, 38), (14, 43), (16, 48)]
    d.line(serp, fill=ORO_D, width=1)
    d.polygon([(15, 49), (17, 51), (15, 53), (13, 51)], fill=ORO, outline=ORO_D)
    d.point((15, 51), fill=OSCURO)
    # estrellas y chispas
    destello(d, 54, 28)
    destello(d, 18, 70)
    destello(d, 54, 74)
    destello(d, 24, 30)
    chispas(d, ((50, 34), (57, 50), (15, 60), (31, 76), (48, 76), (40, 28)))


def escena_emperador(d):
    """IV - El Emperador: trono con carneros, cetro con anj y orbe."""
    # respaldo de trono de piedra con cabezas de carnero
    d.rectangle([22, 32, 50, 68], fill=NEGRO, outline=ORO_D)
    d.line([(24, 34), (24, 66)], fill=ROPA_D)
    d.line([(48, 34), (48, 66)], fill=ROPA_D)
    for hx in (22, 50):                                               # cuernos de carnero
        d.arc([hx - 3, 31, hx + 3, 37], 0, 360, fill=ORO)
        d.arc([hx - 1, 33, hx + 1, 35], 0, 360, fill=ORO_D)
    # tunica y peto
    d.polygon([(29, 46), (43, 46), (47, 74), (25, 74)], fill=ROPA, outline=ROPA_D)
    d.polygon([(36, 46), (43, 46), (47, 74), (41, 74)], fill=ROPA_D)
    d.line([(27, 73), (45, 73)], fill=ORO_D)
    d.rectangle([32, 48, 40, 56], fill=ROPA_D, outline=ORO_D)         # peto
    d.point((36, 51), fill=ORO)
    d.point((36, 54), fill=ORO)
    # brazo derecho con cetro dorado rematado en orbe
    d.polygon([(41, 47), (44, 46), (48, 43), (46, 40)], fill=ROPA, outline=ROPA_D)
    d.line([(46, 30), (46, 43)], fill=ORO)
    d.line([(47, 31), (47, 42)], fill=ORO_D)
    d.ellipse([43, 24, 49, 30], fill=NEGRO, outline=ORO_W)
    d.point((46, 27), fill=ORO)
    d.ellipse([44, 40, 48, 44], fill=HUESO, outline=HUESO_D)
    # brazo izquierdo con orbe
    d.polygon([(31, 47), (28, 47), (25, 56), (28, 58)], fill=ROPA_D, outline=ROPA_D)
    d.ellipse([25, 55, 29, 59], fill=HUESO, outline=HUESO_D)
    d.ellipse([23, 50, 27, 54], fill=NEGRO, outline=ORO_W)
    d.point((25, 52), fill=ORO)
    # cabeza con barba blanca y corona
    d.ellipse([31, 35, 41, 45], fill=HUESO, outline=HUESO_D)
    d.point((34, 39), fill=OSCURO)
    d.point((38, 39), fill=OSCURO)
    d.polygon([(31, 42), (41, 42), (39, 48), (33, 48)], fill=HUESO, outline=HUESO_D)
    d.rectangle([31, 32, 41, 36], fill=ORO, outline=ORO_D)
    d.polygon([(31, 32), (33, 27), (35, 32)], fill=ORO, outline=ORO_D)
    d.polygon([(35, 32), (36, 26), (37, 32)], fill=ORO, outline=ORO_D)
    d.polygon([(37, 32), (39, 27), (41, 32)], fill=ORO, outline=ORO_D)
    d.point((36, 34), fill=ORO_W)
    # estrellas
    destello(d, 16, 30)
    destello(d, 56, 44)
    destello(d, 15, 62)
    destello(d, 56, 74)
    chispas(d, ((18, 44), (54, 58), (18, 76), (36, 78), (55, 30)))


def escena_hierofante(d):
    """V - El Hierofante: tiara triple, bendicion y llaves cruzadas."""
    # columnas suaves de fondo
    d.line([(14, 28), (14, 74)], fill=ORO_D)
    d.line([(58, 28), (58, 74)], fill=ORO_D)
    d.point((14, 27), fill=ORO)
    d.point((58, 27), fill=ORO)
    # tunica
    d.polygon([(29, 47), (43, 47), (46, 72), (26, 72)], fill=ROPA, outline=ROPA_D)
    d.polygon([(36, 47), (43, 47), (46, 72), (40, 72)], fill=ROPA_D)
    d.line([(28, 71), (44, 71)], fill=ORO_D)
    d.line([(36, 50), (36, 68)], fill=ORO)                            # estola
    d.point((34, 54), fill=ORO)
    d.point((38, 58), fill=ORO)
    d.point((34, 62), fill=ORO)
    # brazo derecho bendiciendo (dos dedos alzados)
    d.polygon([(41, 48), (44, 47), (48, 43), (46, 40)], fill=ROPA, outline=ROPA_D)
    d.ellipse([45, 39, 49, 43], fill=HUESO, outline=HUESO_D)
    d.line([(46, 38), (46, 35)], fill=HUESO)
    d.line([(48, 38), (48, 35)], fill=HUESO)
    # brazo derecho sujetando el baculo de triple cruz
    d.polygon([(31, 48), (28, 48), (25, 54), (28, 56)], fill=ROPA_D, outline=ROPA_D)
    d.line([(26, 30), (26, 72)], fill=ORO)
    d.line([(23, 35), (29, 35)], fill=ORO)
    d.line([(22, 40), (30, 40)], fill=ORO)
    d.line([(23, 45), (29, 45)], fill=ORO)
    d.ellipse([24, 51, 28, 56], fill=HUESO, outline=HUESO_D)          # mano al baculo
    # cabeza con tiara de tres coronas
    d.ellipse([31, 36, 41, 46], fill=HUESO, outline=HUESO_D)
    d.point((34, 41), fill=OSCURO)
    d.point((38, 41), fill=OSCURO)
    d.line([(35, 44), (37, 44)], fill=OSCURO)
    d.polygon([(32, 36), (40, 36), (39, 27), (33, 27)], fill=ORO, outline=ORO_D)
    d.line([(33, 33), (39, 33)], fill=ORO_D)
    d.line([(33, 30), (39, 30)], fill=ORO_D)
    d.point((36, 26), fill=ORO_W)
    # llaves cruzadas a los pies
    d.line([(30, 79), (40, 73)], fill=ORO)
    d.ellipse([28, 77, 32, 81], outline=ORO)
    d.line([(39, 74), (41, 76)], fill=ORO)
    d.line([(42, 79), (32, 73)], fill=ORO_D)
    d.ellipse([40, 77, 44, 81], outline=ORO_D)
    d.line([(33, 74), (31, 76)], fill=ORO_D)
    # estrellas
    destello(d, 18, 32)
    destello(d, 54, 32)
    destello(d, 17, 68)
    destello(d, 55, 66)
    chispas(d, ((20, 50), (52, 52), (36, 24), (20, 78), (52, 78)))


def escena_enamorados(d):
    """VI - Los Enamorados: sol radiante, pareja y corazon compartido."""
    # sol radiante arriba
    d.ellipse([31, 25, 41, 35], fill=NEGRO, outline=ORO_W)
    d.ellipse([33, 27, 39, 33], outline=ORO)
    for i in range(8):
        a = math.radians(i * 45)
        x0 = 36 + int(round(7 * math.cos(a)))
        y0 = 30 + int(round(7 * math.sin(a)))
        x1 = 36 + int(round(10 * math.cos(a)))
        y1 = 30 + int(round(10 * math.sin(a)))
        d.line([(x0, y0), (x1, y1)], fill=ORO_D)
    # corazon entre ambos
    d.ellipse([32, 44, 36, 48], fill=ORO, outline=ORO_D)
    d.ellipse([36, 44, 40, 48], fill=ORO, outline=ORO_D)
    d.polygon([(32, 47), (40, 47), (36, 53)], fill=ORO)
    d.point((34, 45), fill=ORO_W)
    # figura izquierda (ella): vestido y melena
    d.polygon([(22, 56), (30, 56), (33, 76), (19, 76)], fill=ROPA, outline=ROPA_D)
    d.line([(21, 75), (31, 75)], fill=ORO_D)
    d.ellipse([22, 46, 30, 54], fill=HUESO, outline=HUESO_D)
    d.polygon([(21, 48), (20, 57), (23, 57), (23, 51)], fill=ROPA_D)  # melena
    d.point((24, 50), fill=OSCURO)
    d.point((28, 50), fill=OSCURO)
    d.line([(25, 52), (27, 52)], fill=OSCURO)
    # su brazo hacia el centro
    d.line([(30, 58), (34, 54)], fill=ROPA)
    d.point((35, 53), fill=HUESO)
    # figura derecha (el): tunica corta
    d.polygon([(42, 56), (50, 56), (52, 70), (40, 70)], fill=ROPA_D, outline=ROPA_D)
    d.rectangle([43, 70, 45, 76], fill=ROPA)
    d.rectangle([47, 70, 49, 76], fill=ROPA)
    d.line([(42, 77), (46, 77)], fill=OSCURO)
    d.line([(46, 77), (50, 77)], fill=OSCURO)
    d.ellipse([42, 46, 50, 54], fill=HUESO, outline=HUESO_D)
    d.point((44, 50), fill=OSCURO)
    d.point((48, 50), fill=OSCURO)
    d.line([(45, 52), (47, 52)], fill=OSCURO)
    # su brazo hacia el centro
    d.line([(42, 58), (38, 54)], fill=ROPA_D)
    d.point((37, 53), fill=HUESO)
    # estrellas
    destello(d, 15, 30)
    destello(d, 57, 30)
    destello(d, 14, 62)
    destello(d, 58, 60)
    chispas(d, ((18, 40), (54, 42), (26, 79), (46, 79), (36, 57), (36, 78)))


def escena_carro(d):
    """VII - El Carro: auriga con lanza en un carro tirado por dos corceles."""
    # corcel trasero (en sombra)
    d.polygon([(14, 50), (28, 50), (27, 61), (15, 61)], fill=ROPA_D)
    d.polygon([(14, 50), (11, 42), (15, 41), (18, 50)], fill=ROPA_D)
    d.ellipse([9, 38, 16, 44], fill=ROPA_D)
    d.rectangle([16, 61, 17, 69], fill=ROPA_D)
    d.rectangle([25, 61, 26, 69], fill=ROPA_D)
    # corcel delantero
    d.polygon([(17, 53), (32, 53), (31, 64), (18, 64)], fill=ROPA, outline=ROPA_D)
    d.polygon([(17, 53), (13, 44), (18, 43), (21, 53)], fill=ROPA, outline=ROPA_D)
    d.ellipse([10, 40, 18, 47], fill=ROPA, outline=ROPA_D)
    d.point((13, 43), fill=OSCURO)                                    # ojo
    d.line([(10, 45), (12, 46)], fill=OSCURO)                         # hocico
    d.polygon([(14, 40), (15, 37), (17, 40)], fill=ROPA_D)            # oreja
    d.line([(18, 43), (22, 52)], fill=ORO_D)                          # crin
    d.line([(13, 39), (12, 35)], fill=ORO)                            # penacho
    d.point((12, 34), fill=ORO_W)
    for lx in (19, 24, 29):                                           # patas
        d.rectangle([lx, 64, lx + 1, 72], fill=ROPA)
        d.line([(lx, 73), (lx + 1, 73)], fill=OSCURO)
    # tiro del carro
    d.line([(25, 57), (38, 59)], fill=ORO_D)
    # caja del carro de perfil con emblema alado
    d.rectangle([36, 46, 58, 64], fill=NEGRO, outline=ORO)
    d.rectangle([37, 47, 57, 63], outline=ORO_D)
    destello(d, 47, 55, ORO_W)
    d.arc([41, 49, 53, 61], 200, 340, fill=ORO_D)
    # rueda con radios
    d.ellipse([42, 60, 54, 72], fill=NEGRO, outline=ORO)
    d.line([(48, 61), (48, 71)], fill=ORO_D)
    d.line([(43, 66), (53, 66)], fill=ORO_D)
    d.line([(44, 62), (52, 70)], fill=ORO_D)
    d.line([(52, 62), (44, 70)], fill=ORO_D)
    d.point((48, 66), fill=ORO_W)
    # estandarte en la parte trasera
    d.line([(57, 46), (57, 30)], fill=ORO_D)
    d.polygon([(57, 30), (62, 32), (57, 35)], fill=ORO, outline=ORO_D)
    # auriga con corona, peto y lanza
    d.polygon([(43, 36), (53, 36), (54, 47), (42, 47)], fill=ROPA, outline=ROPA_D)
    d.point((46, 40), fill=ORO)
    d.point((50, 42), fill=ORO)
    d.ellipse([44, 27, 52, 35], fill=HUESO, outline=HUESO_D)
    d.point((46, 30), fill=OSCURO)
    d.point((49, 30), fill=OSCURO)
    d.rectangle([44, 25, 52, 28], fill=ORO, outline=ORO_D)            # corona asentada
    d.point((45, 24), fill=ORO)
    d.point((48, 24), fill=ORO_W)
    d.point((51, 24), fill=ORO)
    # lanza apuntando al frente sobre los corceles
    d.line([(44, 44), (20, 30)], fill=ORO_D)
    d.polygon([(19, 29), (23, 30), (21, 33)], fill=HUESO, outline=HUESO_D)
    d.ellipse([41, 42, 45, 46], fill=HUESO, outline=HUESO_D)          # mano
    # suelo
    d.line([(10, 74), (60, 74)], fill=ORO_D)
    # estrellas
    destello(d, 33, 26)
    destello(d, 14, 30)
    chispas(d, ((12, 56), (34, 34), (59, 68), (16, 73), (36, 72)))


def escena_fuerza(d):
    """VIII - La Fuerza: punio y antebrazo rompiendo la cadena, centrados."""
    # cadena combada: cae desde el borde izquierdo hasta el punio,
    # alternando eslabones horizontales y verticales
    d.ellipse([8, 29, 14, 33], outline=ORO)
    d.ellipse([13, 32, 17, 38], outline=ORO)
    d.ellipse([16, 37, 22, 41], outline=ORO)
    d.ellipse([21, 40, 25, 46], outline=ORO)
    d.ellipse([24, 42, 30, 46], outline=ORO)
    # rotura: estallido junto al punio y el eslabon partido en dos mitades
    for p0, p1 in (((46, 37), (45, 34)), ((49, 38), (52, 35)), ((51, 42), (54, 42)),
                   ((49, 46), (52, 49)), ((46, 47), (45, 50))):
        d.line([p0, p1], fill=ORO_W)                                  # estallido radial
    destello(d, 47, 42, ORO_W)
    d.arc([50, 31, 55, 36], 180, 360, fill=ORO)                       # media anilla volando
    d.line([(56, 30), (58, 27)], fill=ORO_D)                          # estela
    d.arc([52, 47, 57, 52], 0, 180, fill=ORO)                         # la otra mitad
    d.ellipse([57, 37, 61, 43], outline=ORO_D)                        # eslabon despedido
    # el resto de la cadena cae colgando hacia la esquina inferior derecha
    d.ellipse([52, 52, 56, 58], outline=ORO)
    d.ellipse([54, 57, 60, 61], outline=ORO)
    d.ellipse([57, 60, 61, 66], outline=ORO)
    d.ellipse([57, 66, 62, 70], outline=ORO_D)
    d.ellipse([58, 70, 62, 76], outline=ORO_D)
    chispas(d, ((53, 39), (55, 45), (50, 29)))
    # antebrazo vertical con tendones
    d.polygon([(31, 49), (41, 49), (43, 79), (29, 79)], fill=HUESO, outline=HUESO_D)
    d.line([(34, 60), (34, 74)], fill=HUESO_D)                        # tendon
    d.line([(38, 60), (39, 74)], fill=HUESO_D)
    # munequera dorada con gema
    d.rectangle([29, 53, 43, 57], fill=ORO, outline=ORO_D)
    d.point((36, 55), fill=ORO_W)
    # punio cerrado en el centro agarrando la cadena
    d.ellipse([29, 38, 43, 50], fill=HUESO, outline=HUESO_D)
    d.line([(33, 40), (33, 46)], fill=HUESO_D)                        # nudillos
    d.line([(36, 39), (36, 46)], fill=HUESO_D)
    d.line([(40, 40), (40, 46)], fill=HUESO_D)
    d.arc([29, 43, 36, 50], 60, 180, fill=HUESO_D)                    # pulgar
    # estrellas
    destello(d, 18, 26)
    destello(d, 56, 26)
    destello(d, 12, 58)
    destello(d, 18, 72)
    destello(d, 52, 74)
    chispas(d, ((24, 32), (48, 66), (14, 50), (24, 76), (36, 30)))


def escena_ermitano(d):
    """IX - El Ermitanio: alza el farol y agarra su baculo."""
    # capa encapuchada (perfil, mirando a la derecha)
    d.polygon([(30, 40), (42, 40), (46, 76), (26, 76)], fill=ROPA_D, outline=OSCURO)
    d.polygon([(36, 40), (42, 40), (46, 76), (41, 76)], fill=OSCURO)
    d.line([(28, 75), (44, 75)], fill=ORO_D)
    # capucha picuda
    d.polygon([(30, 42), (36, 28), (42, 42)], fill=ROPA_D, outline=OSCURO)
    # rostro anciano en sombra
    d.ellipse([33, 36, 40, 43], fill=HUESO, outline=HUESO_D)
    d.point((37, 39), fill=OSCURO)                                    # ojo (perfil)
    d.polygon([(35, 42), (40, 42), (38, 47), (36, 47)], fill=HUESO)   # barba
    # brazo alzado: el farol cuelga por debajo de la mano
    d.polygon([(41, 44), (44, 42), (49, 37), (47, 34)], fill=ROPA_D, outline=OSCURO)
    d.ellipse([46, 33, 50, 37], fill=HUESO, outline=HUESO_D)          # mano en alto
    d.line([(50, 37), (51, 39)], fill=ORO_D)                          # asa
    d.rectangle([47, 40, 55, 50], fill=NEGRO, outline=ORO)            # farol
    d.line([(48, 41), (54, 41)], fill=ORO_D)
    destello(d, 51, 45, ORO_W)
    # halo de luz del farol
    for px, py in ((45, 38), (57, 38), (45, 52), (57, 52), (51, 54), (59, 45)):
        d.point((px, py), fill=ORO_D)
    # baculo agarrado con la otra mano
    d.line([(25, 40), (25, 77)], fill=ORO_D)
    d.point((25, 39), fill=ORO)
    d.polygon([(31, 46), (28, 46), (26, 52), (29, 54)], fill=ROPA_D, outline=OSCURO)
    d.ellipse([23, 51, 27, 55], fill=HUESO, outline=HUESO_D)          # mano al baculo
    # suelo nevado de la cima
    d.line([(12, 78), (60, 78)], fill=ORO_D)
    d.point((16, 77), fill=ORO)
    d.point((50, 77), fill=ORO)
    # estrellas
    destello(d, 16, 28)
    destello(d, 15, 48)
    destello(d, 58, 62)
    destello(d, 18, 66)
    chispas(d, ((20, 38), (56, 56), (30, 25), (55, 25), (14, 72)))


def escena_justicia(d):
    """XI - La Justicia: espada en alto y balanza."""
    # tunica sedente
    d.polygon([(29, 47), (43, 47), (46, 74), (26, 74)], fill=ROPA, outline=ROPA_D)
    d.polygon([(36, 47), (43, 47), (46, 74), (40, 74)], fill=ROPA_D)
    d.line([(28, 73), (44, 73)], fill=ORO_D)
    d.line([(36, 50), (36, 70)], fill=ORO_D)                          # banda
    # brazo derecho con la espada en alto
    d.polygon([(41, 48), (44, 47), (48, 44), (46, 41)], fill=ROPA, outline=ROPA_D)
    d.ellipse([45, 40, 49, 44], fill=HUESO, outline=HUESO_D)
    d.line([(47, 39), (47, 26)], fill=HUESO)                          # hoja
    d.point((47, 26), fill=ORO_W)
    d.line([(45, 39), (49, 39)], fill=ORO)                            # guarda
    # brazo izquierdo sosteniendo la balanza en alto
    d.polygon([(31, 48), (28, 48), (24, 44), (26, 41)], fill=ROPA_D, outline=ROPA_D)
    d.ellipse([21, 38, 25, 42], fill=HUESO, outline=HUESO_D)          # mano en alto
    d.line([(23, 43), (23, 46)], fill=ORO)                            # fiel
    d.line([(15, 47), (31, 47)], fill=ORO)                            # astil
    d.point((23, 46), fill=ORO_W)
    d.line([(15, 48), (15, 54)], fill=ORO_D)                          # cadenas
    d.line([(31, 48), (31, 54)], fill=ORO_D)
    d.arc([11, 54, 19, 61], 0, 180, fill=ORO)                         # platillos grandes
    d.arc([27, 54, 35, 61], 0, 180, fill=ORO)
    d.point((15, 55), fill=ORO_W)
    d.point((31, 55), fill=ORO_W)
    # cabeza con corona almenada
    d.ellipse([31, 36, 41, 46], fill=HUESO, outline=HUESO_D)
    d.point((34, 41), fill=OSCURO)
    d.point((38, 41), fill=OSCURO)
    d.line([(35, 44), (37, 44)], fill=OSCURO)
    d.rectangle([31, 32, 41, 37], fill=ORO, outline=ORO_D)
    d.line([(33, 31), (33, 29)], fill=ORO)
    d.line([(36, 31), (36, 28)], fill=ORO)
    d.line([(39, 31), (39, 29)], fill=ORO)
    d.point((36, 34), fill=ORO_W)
    # cortina de fondo
    d.line([(14, 28), (14, 74)], fill=ORO_D)
    d.line([(58, 28), (58, 74)], fill=ORO_D)
    # estrellas
    destello(d, 18, 34)
    destello(d, 55, 32)
    destello(d, 17, 64)
    destello(d, 55, 60)
    chispas(d, ((21, 46), (53, 48), (36, 24), (20, 77), (52, 76)))


def escena_colgado(d):
    """XII - El Colgado: cuelga del pie de una viga, con halo sereno."""
    # horca en T
    d.rectangle([18, 26, 54, 29], fill=ROPA, outline=ROPA_D)
    d.rectangle([18, 29, 21, 78], fill=ROPA, outline=ROPA_D)
    d.rectangle([51, 29, 54, 78], fill=ROPA, outline=ROPA_D)
    d.line([(19, 30), (19, 77)], fill=ORO_D)
    d.line([(52, 30), (52, 77)], fill=ORO_D)
    # cuerda al tobillo
    d.line([(36, 30), (36, 34)], fill=ORO_D)
    # pierna recta (de la que cuelga) y pierna doblada en 4
    d.rectangle([34, 34, 38, 46], fill=ROPA_D, outline=OSCURO)
    d.polygon([(34, 40), (28, 44), (30, 47), (35, 45)], fill=ROPA_D, outline=OSCURO)
    # torso invertido
    d.polygon([(32, 46), (40, 46), (41, 60), (31, 60)], fill=ROPA, outline=ROPA_D)
    d.point((35, 50), fill=ORO)
    d.point((37, 55), fill=ORO)
    # brazos plegados a la espalda (triangulo)
    d.line([(32, 48), (27, 56)], fill=ROPA_D)
    d.line([(40, 48), (45, 56)], fill=ROPA_D)
    d.line([(27, 56), (32, 59)], fill=ROPA_D)
    d.line([(45, 56), (40, 59)], fill=ROPA_D)
    # cabeza boca abajo con halo radiante
    d.ellipse([32, 60, 40, 68], fill=HUESO, outline=HUESO_D)
    d.point((34, 63), fill=OSCURO)
    d.point((38, 63), fill=OSCURO)
    d.line([(35, 61), (37, 61)], fill=OSCURO)                         # boca serena
    for i in range(8):
        a = math.radians(i * 45)
        x0 = 36 + int(round(6 * math.cos(a)))
        y0 = 64 + int(round(6 * math.sin(a)))
        x1 = 36 + int(round(9 * math.cos(a)))
        y1 = 64 + int(round(9 * math.sin(a)))
        d.line([(x0, y0), (x1, y1)], fill=ORO)
    # monedas cayendo de los bolsillos
    d.point((28, 62), fill=ORO_W)
    d.point((45, 65), fill=ORO_W)
    d.point((26, 70), fill=ORO)
    d.point((47, 72), fill=ORO)
    # estrellas
    destello(d, 25, 36)
    destello(d, 47, 34)
    chispas(d, ((24, 50), (48, 46), (30, 76), (44, 77)))


def escena_muerte(d):
    """XIII - La Muerte: esqueleto encapuchado, calavera clara y guadania corta."""
    # guadania: mango y hoja curva, todo dentro del panel
    d.line([(24, 72), (30, 32)], fill=ROPA, width=2)
    d.arc([28, 26, 50, 40], 190, 320, fill=HUESO)
    d.arc([28, 27, 50, 41], 195, 315, fill=HUESO)
    d.arc([29, 29, 49, 41], 200, 310, fill=HUESO_D)
    # tunica negra
    d.polygon([(30, 46), (44, 46), (48, 76), (26, 76)], fill=OSCURO, outline=ROPA_D)
    d.line([(28, 75), (46, 75)], fill=ORO_D)
    # capucha
    d.polygon([(29, 48), (37, 34), (45, 48)], fill=OSCURO, outline=ROPA_D)
    # calavera grande y clara
    d.ellipse([32, 38, 42, 48], fill=HUESO, outline=HUESO_D)
    d.rectangle([34, 46, 40, 49], fill=HUESO)                          # maxilar
    d.ellipse([34, 41, 36, 44], fill=OSCURO)                           # cuencas
    d.ellipse([38, 41, 40, 44], fill=OSCURO)
    d.point((37, 45), fill=OSCURO)                                     # nariz
    d.line([(35, 48), (39, 48)], fill=OSCURO)                          # boca
    d.line([(36, 47), (36, 49)], fill=OSCURO)                          # dientes
    d.line([(38, 47), (38, 49)], fill=OSCURO)
    # manos huesudas agarrando el mango
    d.ellipse([27, 48, 31, 52], fill=HUESO, outline=HUESO_D)
    d.line([(27, 50), (25, 50)], fill=HUESO)                           # dedos
    d.ellipse([25, 60, 29, 64], fill=HUESO, outline=HUESO_D)
    d.line([(25, 62), (23, 62)], fill=HUESO)
    # rosa blanca a sus pies
    d.line([(53, 76), (53, 71)], fill=ORO_D)
    destello(d, 53, 69, HUESO)
    # horizonte
    d.line([(12, 78), (60, 78)], fill=ORO_D)
    # estrellas
    destello(d, 16, 30)
    destello(d, 57, 46)
    destello(d, 15, 56)
    destello(d, 56, 30)
    chispas(d, ((18, 44), (54, 58), (16, 70), (44, 77), (58, 72)))


def escena_templanza(d):
    """XIV - La Templanza: angel vertiendo agua entre dos copas."""
    # alas majestuosas: borde inferior festoneado en plumas
    d.polygon([(30, 46), (26, 37), (20, 30), (14, 28), (15, 33), (18, 33),
               (19, 38), (22, 37), (23, 42), (26, 41), (27, 46), (30, 48)],
              fill=HUESO, outline=HUESO_D)
    d.polygon([(42, 46), (46, 37), (52, 30), (58, 28), (57, 33), (54, 33),
               (53, 38), (50, 37), (49, 42), (46, 41), (45, 46), (42, 48)],
              fill=HUESO, outline=HUESO_D)
    # textura de plumas siguiendo la curva del ala
    d.arc([14, 28, 26, 40], 20, 110, fill=HUESO_D)
    d.arc([18, 32, 28, 44], 20, 110, fill=HUESO_D)
    d.arc([46, 28, 58, 40], 70, 160, fill=HUESO_D)
    d.arc([44, 32, 54, 44], 70, 160, fill=HUESO_D)
    d.point((14, 28), fill=ORO)
    d.point((58, 28), fill=ORO)
    # tunica clara
    d.polygon([(30, 46), (42, 46), (45, 74), (27, 74)], fill=HUESO, outline=HUESO_D)
    d.line([(29, 73), (43, 73)], fill=ORO_D)
    # triangulo en el pecho
    d.polygon([(36, 50), (33, 56), (39, 56)], outline=ORO)
    # cuello y cabeza con halo dorado
    d.rectangle([34, 43, 38, 47], fill=HUESO, outline=HUESO_D)
    d.ellipse([31, 34, 41, 44], fill=HUESO, outline=HUESO_D)
    d.point((34, 39), fill=OSCURO)
    d.point((38, 39), fill=OSCURO)
    d.line([(35, 42), (37, 42)], fill=OSCURO)
    d.ellipse([31, 27, 41, 31], outline=ORO_W)
    # brazos con las dos copas y el chorro imposible
    d.line([(30, 48), (24, 54)], fill=HUESO)
    d.line([(42, 48), (49, 58)], fill=HUESO)
    d.arc([20, 54, 26, 59], 180, 360, fill=ORO)                       # copa alta
    d.line([(20, 54), (26, 54)], fill=ORO_W)
    d.arc([46, 60, 52, 65], 180, 360, fill=ORO)                       # copa baja
    d.line([(46, 60), (52, 60)], fill=ORO_W)
    d.line([(25, 55), (47, 61)], fill=ORO_W)                          # chorro diagonal
    d.point((32, 57), fill=HUESO)
    d.point((40, 59), fill=HUESO)
    # un pie en el agua
    d.ellipse([26, 74, 46, 80], outline=ORO_D)
    d.line([(30, 77), (42, 77)], fill=ORO)
    # estrellas
    destello(d, 15, 26)
    destello(d, 57, 26)
    destello(d, 14, 62)
    destello(d, 58, 70)
    chispas(d, ((22, 28), (50, 28), (17, 50), (55, 50), (20, 76), (52, 76)))


def escena_torre(d):
    """XVI - La Torre: risco, sillares, puerta, ventanas en llamas y rayo."""
    # risco sobre el que se alza
    d.polygon([(24, 76), (48, 76), (46, 70), (38, 68), (30, 70), (26, 73)],
              fill=ROPA_D, outline=OSCURO)
    d.line([(28, 73), (33, 71)], fill=OSCURO)
    d.line([(40, 72), (44, 74)], fill=OSCURO)
    # cuerpo de la torre con sillares
    d.rectangle([28, 38, 44, 70], fill=ROPA_D, outline=OSCURO)
    d.line([(30, 40), (30, 68)], fill=ROPA)                            # luz lateral
    for by in range(43, 68, 5):
        d.line([(29, by), (43, by)], fill=OSCURO)
        off = 34 if (by // 5) % 2 == 0 else 38
        d.line([(off, by - 5), (off, by)], fill=OSCURO)
    # cornisa y almenas
    d.rectangle([26, 34, 46, 38], fill=ROPA_D, outline=OSCURO)
    for ax in (26, 31, 36, 41):
        d.rectangle([ax, 30, ax + 2, 34], fill=ROPA_D, outline=OSCURO)
    # puerta arqueada
    d.rectangle([33, 62, 39, 70], fill=OSCURO, outline=ORO_D)
    d.arc([33, 59, 39, 65], 180, 360, fill=ORO_D)
    # ventanas en llamas
    for fx, fy in ((31, 46), (41, 52)):
        d.rectangle([fx - 1, fy, fx + 1, fy + 3], fill=OSCURO)
        d.polygon([(fx - 2, fy + 1), (fx + 2, fy + 1), (fx, fy - 4)], fill=ORO)
        d.point((fx, fy - 1), fill=ORO_W)
    # gran llamarada en la cima
    d.polygon([(28, 30), (34, 30), (31, 24)], fill=ORO)
    d.polygon([(33, 30), (39, 30), (36, 25)], fill=ORO_W)
    d.polygon([(38, 30), (44, 30), (41, 26)], fill=ORO)
    # rayo en zigzag golpeando la cima
    d.line([(58, 24), (48, 28)], fill=ORO_W, width=2)
    d.line([(48, 28), (52, 31)], fill=ORO_W, width=2)
    d.line([(52, 31), (44, 35)], fill=ORO_W, width=2)
    destello(d, 45, 34, ORO_W)                                         # impacto
    # corona derribada saltando por los aires
    d.polygon([(18, 30), (26, 30), (25, 26), (23, 29), (22, 25), (21, 29), (19, 26)],
              fill=ORO, outline=ORO_D)
    # figuras cayendo (cabeza abajo)
    for px, py, lado in ((21, 54, -1), (51, 58, 1)):
        d.ellipse([px - 1, py + 3, px + 2, py + 6], fill=HUESO)
        d.line([(px, py), (px, py + 3)], fill=ROPA)
        d.line([(px, py), (px + 2 * lado, py - 3)], fill=ROPA)
        d.line([(px, py + 1), (px - 2 * lado, py - 1)], fill=ROPA)
    # escombros y chispas de fuego
    chispas(d, ((25, 40), (47, 44), (23, 48), (49, 52), (25, 62), (47, 66),
                (18, 74), (54, 74)))
    d.point((26, 28), fill=ORO_W)
    d.point((46, 30), fill=ORO_W)
    # suelo
    d.line([(12, 78), (60, 78)], fill=ORO_D)
    destello(d, 15, 66)
    destello(d, 57, 70)


def escena_estrella(d):
    """XVII - La Estrella: la gran estrella de ocho puntas sobre el agua."""
    scx, scy = 36, 42
    # halo exterior
    d.ellipse([scx - 15, scy - 15, scx + 15, scy + 15], outline=ORO_D)
    # gran estrella de 8 puntas
    for i in range(8):
        a = math.radians(i * 45)
        r = 13 if i % 2 == 0 else 8
        x1 = scx + int(round(r * math.cos(a)))
        y1 = scy + int(round(r * math.sin(a)))
        d.line([(scx, scy), (x1, y1)], fill=ORO if i % 2 == 0 else ORO_D,
               width=2 if i % 2 == 0 else 1)
    d.ellipse([scx - 3, scy - 3, scx + 3, scy + 3], fill=ORO_W, outline=ORO)
    # siete estrellas menores en corona
    destello(d, 16, 30)
    destello(d, 56, 30)
    destello(d, 12, 46)
    destello(d, 60, 46)
    destello(d, 20, 60)
    destello(d, 52, 60)
    destello(d, 36, 24)
    # laguna que refleja la estrella
    d.ellipse([22, 68, 50, 78], outline=ORO_D)
    d.line([(26, 72), (46, 72)], fill=ORO_D)
    d.line([(28, 75), (44, 75)], fill=ORO)
    destello(d, 36, 73, ORO)
    d.line([(12, 78), (20, 78)], fill=ORO_D)                          # orillas
    d.line([(52, 78), (60, 78)], fill=ORO_D)
    chispas(d, ((24, 36), (48, 36), (16, 68), (56, 68), (30, 28), (42, 28)))


def escena_luna(d):
    """XVIII - La Luna: luna con rostro, dos torres, perro, lobo y cangrejo."""
    # luna llena con creciente y rostro
    d.ellipse([28, 26, 44, 42], fill=NEGRO, outline=ORO_W)
    d.ellipse([30, 28, 42, 40], fill=ORO_D)
    d.ellipse([33, 27, 46, 40], fill=NEGRO)                            # sombra creciente
    d.point((33, 32), fill=OSCURO)                                     # ojo
    d.arc([31, 33, 37, 38], 20, 160, fill=OSCURO)                      # boca
    # rayos
    for i in range(8):
        a = math.radians(i * 45)
        x0 = 36 + int(round(10 * math.cos(a)))
        y0 = 34 + int(round(10 * math.sin(a)))
        x1 = 36 + int(round(13 * math.cos(a)))
        y1 = 34 + int(round(13 * math.sin(a)))
        d.line([(x0, y0), (x1, y1)], fill=ORO_D)
    # gotas de rocio cayendo
    for gx, gy in ((26, 46), (36, 49), (46, 46)):
        d.line([(gx, gy), (gx, gy + 1)], fill=ORO)
        d.point((gx, gy + 2), fill=ORO_W)
    # torres a los lados
    for tx in (10, 54):
        d.rectangle([tx, 46, tx + 8, 70], fill=ROPA_D, outline=OSCURO)
        d.rectangle([tx, 42, tx + 2, 46], fill=ROPA_D, outline=OSCURO)
        d.rectangle([tx + 6, 42, tx + 8, 46], fill=ROPA_D, outline=OSCURO)
        d.point((tx + 4, 54), fill=OSCURO)                             # ventana
    # perro y lobo aullando a la luna
    for bx, cuerpo in ((20, ROPA), (42, ROPA_D)):                      # perro / lobo
        # cuerpo con pecho
        d.polygon([(bx + 1, 61), (bx + 8, 61), (bx + 9, 64), (bx + 8, 67),
                   (bx + 1, 67)], fill=cuerpo)
        # cuello y cabeza alzada hacia la luna
        d.polygon([(bx + 6, 62), (bx + 8, 56), (bx + 10, 54), (bx + 11, 56),
                   (bx + 9, 58), (bx + 8, 62)], fill=cuerpo)
        d.line([(bx + 10, 54), (bx + 12, 52)], fill=cuerpo)            # hocico
        d.point((bx + 9, 55), fill=OSCURO)                             # ojo
        d.polygon([(bx + 7, 56), (bx + 6, 53), (bx + 8, 55)], fill=cuerpo)  # oreja
        # cuatro patas
        d.rectangle([bx + 1, 67, bx + 2, 71], fill=cuerpo)
        d.rectangle([bx + 3, 67, bx + 4, 71], fill=cuerpo)
        d.rectangle([bx + 6, 67, bx + 7, 71], fill=cuerpo)
        d.rectangle([bx + 8, 67, bx + 9, 70], fill=cuerpo)
        # cola
        d.line([(bx + 1, 62), (bx - 2, 58)], fill=cuerpo)
        d.point((bx - 2, 57), fill=cuerpo)
    # senda serpenteante
    d.line([(36, 70), (30, 73)], fill=ORO_D)
    d.line([(30, 73), (40, 76)], fill=ORO_D)
    d.line([(40, 76), (34, 79)], fill=ORO_D)
    # charca con cangrejo
    d.ellipse([26, 72, 46, 79], outline=ORO_D)
    d.ellipse([33, 74, 39, 78], fill=ORO_D, outline=ORO)
    d.line([(32, 73), (33, 74)], fill=ORO)                             # pinzas
    d.line([(40, 73), (39, 74)], fill=ORO)
    # estrellas
    destello(d, 16, 30)
    destello(d, 56, 32)
    chispas(d, ((20, 38), (52, 38), (14, 76), (58, 76), (36, 22)))


def escena_sol(d):
    """XIX - El Sol: sol radiante (sin rostro) sobre girasoles con petalos."""
    # gran sol con rayos largos y cortos alternos
    scx, scy = 36, 38
    for i in range(16):
        a = math.radians(i * 22.5)
        r = 16 if i % 2 == 0 else 13
        x0 = scx + int(round(10 * math.cos(a)))
        y0 = scy + int(round(10 * math.sin(a)))
        x1 = scx + int(round(r * math.cos(a)))
        y1 = scy + int(round(r * math.sin(a)))
        d.line([(x0, y0), (x1, y1)], fill=ORO if i % 2 == 0 else ORO_D)
    d.ellipse([scx - 10, scy - 10, scx + 10, scy + 10], fill=ORO, outline=ORO_D)
    d.ellipse([scx - 7, scy - 7, scx + 7, scy + 7], fill=ORO_W, outline=ORO)
    d.ellipse([scx - 3, scy - 3, scx + 3, scy + 3], fill=ORO)          # nucleo
    # muro de ladrillo
    d.rectangle([10, 64, 62, 70], fill=ROPA_D, outline=OSCURO)
    d.line([(11, 67), (61, 67)], fill=OSCURO)
    for wx in (16, 26, 36, 46, 56):
        d.line([(wx, 64), (wx, 67)], fill=OSCURO)
    for wx in (21, 31, 41, 51):
        d.line([(wx, 67), (wx, 70)], fill=OSCURO)
    # girasoles con corona de petalos sobre el muro
    for gx, gy in ((16, 57), (30, 55), (44, 57), (56, 54)):
        d.line([(gx, 64), (gx, gy + 4)], fill=ROPA)                    # tallo
        d.point((gx - 1, gy + 6), fill=ROPA)                           # hoja
        for j in range(8):                                             # petalos
            a = math.radians(j * 45)
            px0 = gx + int(round(2 * math.cos(a)))
            py0 = gy + int(round(2 * math.sin(a)))
            px1 = gx + int(round(4 * math.cos(a)))
            py1 = gy + int(round(4 * math.sin(a)))
            d.line([(px0, py0), (px1, py1)], fill=ORO_W)
        d.ellipse([gx - 2, gy - 2, gx + 2, gy + 2], fill=ROPA_D, outline=OSCURO)
    # destellos calidos
    destello(d, 14, 28)
    destello(d, 58, 28)
    destello(d, 12, 46)
    destello(d, 60, 44)
    chispas(d, ((22, 24), (50, 24), (18, 75), (36, 75), (54, 75), (23, 60)))


def escena_juicio(d):
    """XX - El Juicio: angel entre nubes, rayos de luz divina y almas alzandose."""
    # nubes celestiales
    d.arc([14, 24, 34, 38], 0, 180, fill=ORO_D)
    d.arc([38, 24, 58, 38], 0, 180, fill=ORO_D)
    d.line([(16, 31), (56, 31)], fill=ORO_D)
    # resplandor tras el angel (solo hacia abajo, dentro del panel)
    for i in range(7):
        a = math.radians(i * 30)
        x0 = 36 + int(round(9 * math.cos(a)))
        y0 = 31 + int(round(9 * math.sin(a)))
        x1 = 36 + int(round(13 * math.cos(a)))
        y1 = 31 + int(round(13 * math.sin(a)))
        d.line([(x0, y0), (x1, y1)], fill=ORO_D)
    # angel con grandes alas blancas
    d.polygon([(31, 34), (18, 26), (14, 34), (24, 40), (31, 40)],
              fill=HUESO, outline=HUESO_D)
    d.polygon([(41, 34), (54, 26), (58, 34), (48, 40), (41, 40)],
              fill=HUESO, outline=HUESO_D)
    d.line([(20, 30), (28, 37)], fill=HUESO_D)                         # plumas
    d.line([(52, 30), (44, 37)], fill=HUESO_D)
    d.ellipse([32, 26, 40, 34], fill=HUESO, outline=HUESO_D)           # cabeza
    d.point((34, 30), fill=OSCURO)
    d.point((38, 30), fill=OSCURO)
    d.line([(32, 25), (40, 25)], fill=ORO)                             # halo
    d.polygon([(31, 34), (41, 34), (42, 44), (30, 44)], fill=ROPA, outline=ROPA_D)
    d.line([(36, 36), (36, 42)], fill=ORO)                             # estola
    # trompeta con banderola de la cruz
    d.line([(40, 33), (51, 41)], fill=ORO, width=2)
    d.polygon([(50, 38), (56, 42), (51, 46)], fill=ORO, outline=ORO_D) # pabellon
    d.rectangle([43, 38, 48, 44], fill=HUESO, outline=HUESO_D)         # banderola
    d.line([(45, 39), (45, 43)], fill=ORO_D)
    d.line([(44, 41), (47, 41)], fill=ORO_D)
    # rayos de luz divina descendiendo sobre las almas
    d.line([(30, 44), (21, 56)], fill=ORO_D)
    d.line([(36, 46), (36, 56)], fill=ORO_D)
    d.line([(42, 44), (51, 56)], fill=ORO_D)
    destello(d, 20, 55, ORO_W)
    destello(d, 36, 54, ORO_W)
    destello(d, 52, 55, ORO_W)
    # tres almas alzandose de las tumbas, banadas por la luz
    for px, alto in ((20, 0), (36, 2), (52, 0)):
        base = 76 - alto
        d.rectangle([px - 6, base - 2, px + 6, base + 2], fill=ROPA_D, outline=OSCURO)
        d.rectangle([px - 2, base - 11, px + 2, base - 2], fill=HUESO, outline=HUESO_D)
        d.ellipse([px - 3, base - 17, px + 3, base - 11], fill=HUESO, outline=HUESO_D)
        d.point((px - 1, base - 14), fill=OSCURO)
        d.point((px + 1, base - 14), fill=OSCURO)
        d.line([(px - 2, base - 10), (px - 5, base - 15)], fill=HUESO)
        d.line([(px + 2, base - 10), (px + 5, base - 15)], fill=HUESO)
    # estrellas
    destello(d, 12, 44)
    destello(d, 60, 44)
    chispas(d, ((26, 50), (46, 50), (13, 62), (59, 62), (12, 74), (60, 74)))


def escena_mundo(d):
    """XXI - El Mundo: bailarina dentro de la corona de laurel."""
    # corona de laurel ovalada
    d.ellipse([20, 28, 52, 74], outline=ORO)
    d.ellipse([21, 29, 51, 73], outline=ORO_D)
    # hojas de laurel alrededor del ovalo
    for i in range(12):
        a = math.radians(i * 30)
        x0 = 36 + int(round(16 * math.cos(a)))
        y0 = 51 + int(round(23 * math.sin(a)))
        x1 = 36 + int(round(19 * math.cos(a)))
        y1 = 51 + int(round(26 * math.sin(a)))
        d.line([(x0, y0), (x1, y1)], fill=ORO_D)
        d.point((x1, y1), fill=ORO)
    # lazos arriba y abajo
    d.polygon([(34, 27), (38, 27), (36, 30)], fill=ORO, outline=ORO_D)
    d.polygon([(34, 75), (38, 75), (36, 72)], fill=ORO, outline=ORO_D)
    # bailarina con banda al vuelo y dos varitas
    d.ellipse([33, 36, 40, 43], fill=HUESO, outline=HUESO_D)           # cabeza
    d.point((35, 39), fill=OSCURO)
    d.point((38, 39), fill=OSCURO)
    d.polygon([(33, 44), (40, 44), (39, 56), (34, 56)], fill=HUESO, outline=HUESO_D)  # torso
    # banda dorada que la envuelve
    d.arc([28, 42, 44, 58], 100, 260, fill=ORO)
    d.arc([30, 46, 46, 62], 280, 80, fill=ORO)
    # piernas danzantes (una cruzada)
    d.line([(35, 56), (33, 66)], fill=HUESO, width=2)
    d.line([(38, 56), (42, 62)], fill=HUESO, width=2)
    d.line([(42, 62), (40, 66)], fill=HUESO, width=2)
    # brazos con varitas
    d.line([(34, 45), (28, 40)], fill=HUESO)
    d.line([(28, 40), (27, 36)], fill=ORO_D)                           # varita
    d.line([(39, 45), (45, 42)], fill=HUESO)
    d.line([(45, 42), (47, 38)], fill=ORO_D)                           # varita
    # los cuatro fijos en las esquinas del panel (estrellas)
    destello(d, 13, 28)
    destello(d, 59, 28)
    destello(d, 13, 76)
    destello(d, 59, 76)
    chispas(d, ((16, 52), (56, 52), (36, 24), (26, 78), (46, 78)))


# ============================================================
#  Generacion
# ============================================================
# (slug, numeral, lineas del nombre, funcion de escena)
CARTAS = [
    ("loco",        "O",    ["THE FOOL"], escena_loco),
    ("mago",        "I",    ["THE", "MAGICIAN"], escena_mago),
    ("sacerdotisa", "II",   ["THE HIGH", "PRIESTESS"], escena_sacerdotisa),
    ("emperatriz",  "III",  ["THE EMPRESS"], escena_emperatriz),
    ("emperador",   "IV",   ["THE EMPEROR"], escena_emperador),
    ("hierofante",  "V",    ["THE", "HIEROPHANT"], escena_hierofante),
    ("enamorados",  "VI",   ["THE LOVERS"], escena_enamorados),
    ("carro",       "VII",  ["THE CHARIOT"], escena_carro),
    ("fuerza",      "VIII", ["STRENGTH"], escena_fuerza),
    ("ermitano",    "IX",   ["THE HERMIT"], escena_ermitano),
    ("rueda",       "X",    ["WHEEL OF", "FORTUNE"], escena_rueda),
    ("justicia",    "XI",   ["JUSTICE"], escena_justicia),
    ("colgado",     "XII",  ["THE HANGED", "MAN"], escena_colgado),
    ("muerte",      "XIII", ["DEATH"], escena_muerte),
    ("templanza",   "XIV",  ["TEMPERANCE"], escena_templanza),
    ("diablo",      "XV",   ["THE DEVIL"], escena_diablo),
    ("torre",       "XVI",  ["THE TOWER"], escena_torre),
    ("estrella",    "XVII", ["THE STAR"], escena_estrella),
    ("luna",        "XVIII", ["THE MOON"], escena_luna),
    ("sol",         "XIX",  ["THE SUN"], escena_sol),
    ("juicio",      "XX",   ["JUDGEMENT"], escena_juicio),
    ("mundo",       "XXI",  ["THE WORLD"], escena_mundo),
]


def main():
    finales = {}
    for nombre, numeral, lineas, escena in CARTAS:
        img, d = base_carta(numeral)
        escena(d)
        rotular(d, lineas)
        grande = img.resize((W * SCALE, H * SCALE), Image.NEAREST)
        grande.save(os.path.join(SALIDA, f"tarot-bj-{nombre}.png"))
        grande.rotate(180).save(os.path.join(SALIDA, f"tarot-bj-{nombre}-invertida.png"))
        finales[nombre] = grande

    # hoja de contacto (solo derechas)
    mini_w, mini_h = W * 3, H * 3
    gap = 8
    cols = 6
    filas = (len(CARTAS) + cols - 1) // cols
    hoja = Image.new("RGB", (cols * (mini_w + gap) + gap, filas * (mini_h + gap) + gap),
                     (25, 25, 30))
    for i, (nombre, _, _, _) in enumerate(CARTAS):
        mini = finales[nombre].resize((mini_w, mini_h), Image.NEAREST)
        hoja.paste(mini, (gap + (i % cols) * (mini_w + gap),
                          gap + (i // cols) * (mini_h + gap)), mini)
    hoja.save(os.path.join(SALIDA, "_contacto_tarot_bj.png"))
    print(f"Generadas {len(CARTAS)} cartas de tarot (+ invertidas) en {SALIDA}")


if __name__ == "__main__":
    main()
