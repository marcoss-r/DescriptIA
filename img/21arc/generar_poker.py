"""Genera en pixel art la baraja de poker de «21 Arcanos»: 52 frentes + reverso.

Frentes clasicos (crema con marco dorado, picas/treboles en negro y
corazones/diamantes en rojo) y reverso propio del juego: negro con motivo
dorado, para diferenciarse del azul de Cartas de la Fortuna y ser coherente
con su tarot.

La base es 72x100 (mismo ratio 0,72 que la baraja espanola de 54x75) y se
amplia x6 con vecino mas cercano (NEAREST).

Uso:  python img/21arc/generar_poker.py
Salida:  img/21arc/poker-<palo>-<valor>.png , poker-reverso.png
         y _contacto_poker.png (revision)
"""

import os
from PIL import Image, ImageDraw

SALIDA = os.path.dirname(os.path.abspath(__file__))

W, H = 72, 100
SCALE = 6  # 432 x 600
CX = W // 2

# --- Paleta ---
CREMA    = (242, 238, 226)
NEGRO    = (38, 36, 44)      # palos negros
NEGRO_O  = (14, 13, 18)
NEGRO_L  = (108, 104, 124)
ROJO     = (192, 44, 52)     # palos rojos
ROJO_D   = (130, 26, 32)
ROJO_L   = (235, 116, 116)
ORO      = (212, 175, 55)    # identidad 21 Arcanos
ORO_D    = (140, 110, 40)
ORO_W    = (250, 230, 160)
CARBON   = (12, 10, 8)       # reverso
CARBON_2 = (6, 5, 4)
SKIN     = (240, 205, 160)
SKIN_D   = (200, 150, 110)
PELO     = (150, 120, 88)
BARBA    = (232, 232, 232)
BLANCO   = (255, 255, 255)
OSCURO   = (30, 24, 20)

# (base, sombra, brillo) por palo
COLORES = {
    "picas":     (NEGRO, NEGRO_O, NEGRO_L),
    "treboles":  (NEGRO, NEGRO_O, NEGRO_L),
    "corazones": (ROJO, ROJO_D, ROJO_L),
    "diamantes": (ROJO, ROJO_D, ROJO_L),
}
# ropa de las figuras: palos rojos visten rojo, negros visten azul acero oscuro
TRAJE = {
    "picas":     ((70, 68, 92), (42, 40, 58), (116, 112, 148)),
    "treboles":  ((70, 68, 92), (42, 40, 58), (116, 112, 148)),
    "corazones": (ROJO, ROJO_D, ROJO_L),
    "diamantes": (ROJO, ROJO_D, ROJO_L),
}


# ============================================================
#  Fuente 3x5 para los indices de las esquinas
# ============================================================
FUENTE = {
    "A": [".#.", "#.#", "###", "#.#", "#.#"],
    "2": ["###", "..#", "###", "#..", "###"],
    "3": ["###", "..#", "###", "..#", "###"],
    "4": ["#.#", "#.#", "###", "..#", "..#"],
    "5": ["###", "#..", "###", "..#", "###"],
    "6": ["###", "#..", "###", "#.#", "###"],
    "7": ["###", "..#", "..#", ".#.", ".#."],
    "8": ["###", "#.#", "###", "#.#", "###"],
    "9": ["###", "#.#", "###", "..#", "###"],
    "1": [".#.", "##.", ".#.", ".#.", "###"],
    "0": ["###", "#.#", "#.#", "#.#", "###"],
    "J": ["###", "..#", "..#", "#.#", ".#."],
    "Q": ["###", "#.#", "#.#", "###", "..#"],
    "K": ["#.#", "#.#", "##.", "#.#", "#.#"],
}


def caracter(d, ch, x, y, color, girado=False):
    filas = FUENTE[ch]
    if girado:
        filas = [f[::-1] for f in filas[::-1]]
    for gy, fila in enumerate(filas):
        for gx, c in enumerate(fila):
            if c == "#":
                d.point((x + gx, y + gy), fill=color)


# ============================================================
#  Simbolos de palo (dibujados en torno a cx,cy con "radio" r)
# ============================================================
def sb_corazon(d, cx, cy, r, cols):
    base, dark, light = cols
    top = cy - r
    d.polygon([(cx - r, top + r - r // 3), (cx + r, top + r - r // 3),
               (cx, cy + r)], fill=base)
    d.ellipse([cx - r, top, cx, top + r], fill=base)
    d.ellipse([cx, top, cx + r, top + r], fill=base)
    d.point((cx - r // 2, top + r // 3), fill=light)


def sb_diamante(d, cx, cy, r, cols):
    base, dark, light = cols
    w = max(2, int(r * 0.75))
    d.polygon([(cx, cy - r - 1), (cx + w, cy), (cx, cy + r + 1), (cx - w, cy)],
              fill=base, outline=dark)
    d.line([(cx - w + 2, cy), (cx - 1, cy - r + 1)], fill=light)


def sb_pica(d, cx, cy, r, cols):
    base, dark, light = cols
    mid = cy + r // 4
    tallo = max(2, r // 2)
    d.polygon([(cx - 1, mid), (cx + 1, mid), (cx + tallo, cy + r),
               (cx - tallo, cy + r)], fill=base)
    lob = max(2, r // 2)
    d.polygon([(cx, cy - r), (cx + r, mid), (cx - r, mid)], fill=base)
    d.ellipse([cx - r, mid - lob, cx, mid + lob], fill=base)
    d.ellipse([cx, mid - lob, cx + r, mid + lob], fill=base)
    d.point((cx - r // 3, cy), fill=light)


def sb_trebol(d, cx, cy, r, cols):
    base, dark, light = cols
    tallo = max(2, r // 2)
    d.polygon([(cx - 1, cy), (cx + 1, cy), (cx + tallo, cy + r),
               (cx - tallo, cy + r)], fill=base)
    rc = max(2, int(r * 0.55))
    centros = [(cx, cy - r + rc), (cx - r + rc, cy + rc // 2),
               (cx + r - rc, cy + rc // 2)]
    for ax, ay in centros:
        d.ellipse([ax - rc, ay - rc, ax + rc, ay + rc], fill=base)
    d.rectangle([cx - 1, cy - rc, cx + 1, cy + rc // 2], fill=base)
    d.point((cx - r // 3, cy - r // 3), fill=light)


SIMBOLO = {"corazones": sb_corazon, "diamantes": sb_diamante,
           "picas": sb_pica, "treboles": sb_trebol}


def pip_tile(palo, r):
    """Dibuja el simbolo del palo en su propia lamina transparente
    (para poder pegarlo girado 180 en la mitad inferior de la carta)."""
    lado = 2 * r + 5
    tile = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    SIMBOLO[palo](d, lado // 2, lado // 2, r, COLORES[palo])
    return tile


def poner_pip(img, palo, x, y, r, flip=False):
    tile = pip_tile(palo, r)
    if flip:
        tile = tile.rotate(180)
    img.paste(tile, (x - tile.width // 2, y - tile.height // 2), tile)


# Centros de los pips (r=6 -> cajas de ~15px). Columnas x=23/49, centro 36.
DISPOSICION = {
    2:  [(36, 26), (36, 74)],
    3:  [(36, 24), (36, 50), (36, 76)],
    4:  [(23, 26), (49, 26), (23, 74), (49, 74)],
    5:  [(23, 26), (49, 26), (36, 50), (23, 74), (49, 74)],
    6:  [(23, 26), (49, 26), (23, 50), (49, 50), (23, 74), (49, 74)],
    7:  [(23, 26), (49, 26), (36, 38), (23, 50), (49, 50), (23, 74), (49, 74)],
    8:  [(23, 26), (49, 26), (36, 38), (23, 50), (49, 50), (36, 62), (23, 74), (49, 74)],
    9:  [(23, 24), (49, 24), (23, 41), (49, 41), (36, 50), (23, 59), (49, 59), (23, 76), (49, 76)],
    10: [(23, 24), (49, 24), (36, 32), (23, 41), (49, 41), (23, 59), (49, 59), (36, 68), (23, 76), (49, 76)],
}


# ============================================================
#  Composicion de una carta
# ============================================================
def carta_base():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=7, fill=CREMA, outline=ORO_D)
    d.rounded_rectangle([2, 2, W - 3, H - 3], radius=6, outline=ORO)
    return img, d


def indices(img, d, etiqueta, palo):
    color = COLORES[palo][0]
    # arriba-izquierda: valor + pip pequeno debajo
    tx = 5
    for ch in etiqueta:
        caracter(d, ch, tx, 5, color)
        tx += 4
    poner_pip(img, palo, 7 + (2 if len(etiqueta) > 1 else 0), 17, 3)
    # abajo-derecha, girado 180
    ancho = 4 * len(etiqueta) - 1
    bx = W - 5 - ancho
    for i, ch in enumerate(reversed(etiqueta)):
        caracter(d, ch, bx + i * 4, H - 10, color, girado=True)
    poner_pip(img, palo, W - 8 - (2 if len(etiqueta) > 1 else 0), H - 18, 3, flip=True)


def destello(d, x, y, c=ORO, cd=ORO_D):
    d.point((x, y), fill=c)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        d.point((x + dx, y + dy), fill=cd)


# ============================================================
#  Figuras (J / Q / K) con la ropa del color del palo
# ============================================================
def cara(d, cx, top):
    """Cabeza con cuello y ojos. top = y de la barbilla aprox."""
    d.rectangle([cx - 2, top - 2, cx + 2, top + 1], fill=SKIN, outline=SKIN_D)
    d.ellipse([cx - 5, top - 10, cx + 5, top], fill=SKIN, outline=SKIN_D)
    d.point((cx - 2, top - 5), fill=OSCURO)
    d.point((cx + 2, top - 5), fill=OSCURO)
    return top - 10  # y de la coronilla


def dibujar_rey(img, d, palo):
    robe, robe_d, robe_l = TRAJE[palo]
    # manto con sombra a la derecha y brillo a la izquierda
    d.polygon([(24, 43), (48, 43), (53, 74), (19, 74)], fill=robe, outline=robe_d)
    d.polygon([(36, 43), (48, 43), (53, 74), (45, 74)], fill=robe_d)
    d.line([(24, 44), (20, 73)], fill=robe_l)
    for mx, my in ((26, 50), (28, 60), (24, 68), (44, 52), (42, 62)):
        d.point((mx, my), fill=robe_l)
    # orla dorada inferior
    d.rectangle([19, 71, 53, 74], fill=ORO, outline=ORO_D)
    d.line([(21, 72), (51, 72)], fill=ORO_W)
    # banda central de armino con motas
    d.rectangle([33, 45, 39, 70], fill=BLANCO, outline=(202, 200, 190))
    for my in range(48, 69, 6):
        d.point((35, my), fill=OSCURO)
        d.point((37, my + 3), fill=OSCURO)
    # brazo izquierdo: empunia el simbolo del palo
    d.polygon([(24, 44), (29, 44), (26, 57), (20, 55)], fill=robe, outline=robe_d)
    d.line([(20, 54), (25, 56)], fill=ORO)
    poner_pip(img, palo, 20, 47, 4)
    d.ellipse([18, 52, 23, 57], fill=SKIN, outline=SKIN_D)
    # brazo derecho con cetro dorado
    d.polygon([(43, 44), (48, 44), (52, 55), (46, 57)], fill=robe, outline=robe_d)
    d.line([(50, 42), (50, 55)], fill=ORO, width=2)
    d.ellipse([48, 38, 53, 43], fill=ORO, outline=ORO_D)
    d.point((50, 39), fill=ORO_W)
    d.ellipse([47, 52, 52, 57], fill=SKIN, outline=SKIN_D)
    # cabeza con barba y corona
    coronilla = cara(d, 36, 40)
    d.polygon([(31, 37), (41, 37), (39, 44), (33, 44)], fill=BARBA, outline=SKIN_D)
    d.rectangle([30, coronilla - 3, 42, coronilla + 1], fill=ORO, outline=ORO_D)
    d.point((32, coronilla - 1), fill=ROJO)
    d.point((36, coronilla - 1), fill=(80, 140, 220))
    d.point((40, coronilla - 1), fill=ROJO)
    d.polygon([(30, coronilla - 3), (32, coronilla - 8), (34, coronilla - 3)], fill=ORO, outline=ORO_D)
    d.polygon([(34, coronilla - 3), (36, coronilla - 10), (38, coronilla - 3)], fill=ORO, outline=ORO_D)
    d.polygon([(38, coronilla - 3), (40, coronilla - 8), (42, coronilla - 3)], fill=ORO, outline=ORO_D)
    d.point((32, coronilla - 8), fill=ORO_W)
    d.point((36, coronilla - 10), fill=ORO_W)
    d.point((40, coronilla - 8), fill=ORO_W)


def dibujar_reina(img, d, palo):
    robe, robe_d, robe_l = TRAJE[palo]
    # vestido acampanado
    d.polygon([(28, 45), (44, 45), (51, 76), (21, 76)], fill=robe, outline=robe_d)
    d.polygon([(36, 45), (44, 45), (51, 76), (44, 76)], fill=robe_d)
    d.line([(28, 46), (23, 75)], fill=robe_l)
    for mx, my in ((30, 56), (27, 66), (36, 60), (41, 68), (34, 70)):
        d.point((mx, my), fill=robe_l)
    d.rectangle([21, 73, 51, 76], fill=ORO, outline=ORO_D)
    d.line([(23, 74), (49, 74)], fill=ORO_W)
    # corpino con lazada dorada
    d.polygon([(30, 45), (42, 45), (41, 56), (31, 56)], fill=robe_d, outline=robe_d)
    d.line([(36, 46), (36, 55)], fill=ORO_D)
    d.point((36, 48), fill=ORO)
    d.point((36, 51), fill=ORO)
    d.point((36, 54), fill=ORO)
    # brazo izquierdo con flor
    d.polygon([(29, 46), (33, 46), (28, 57), (23, 55)], fill=robe, outline=robe_d)
    d.line([(22, 52), (24, 55)], fill=(80, 120, 60))
    destello(d, 21, 50, ORO_W, ORO)
    d.ellipse([22, 53, 26, 57], fill=SKIN, outline=SKIN_D)
    # brazo derecho: sostiene el simbolo del palo en alto
    d.polygon([(39, 46), (43, 46), (48, 42), (45, 39)], fill=robe, outline=robe_d)
    poner_pip(img, palo, 49, 34, 4)
    d.ellipse([46, 38, 50, 42], fill=SKIN, outline=SKIN_D)
    # melena, cara y corona
    coronilla = cara(d, 36, 41)
    d.polygon([(30, 34), (28, 46), (31, 46), (32, 38)], fill=PELO)
    d.polygon([(42, 34), (44, 46), (41, 46), (40, 38)], fill=PELO)
    d.line([(33, 43), (39, 43)], fill=ORO)  # collar
    d.rectangle([31, coronilla - 2, 41, coronilla + 1], fill=ORO, outline=ORO_D)
    d.polygon([(31, coronilla - 2), (33, coronilla - 6), (35, coronilla - 2)], fill=ORO, outline=ORO_D)
    d.polygon([(37, coronilla - 2), (39, coronilla - 6), (41, coronilla - 2)], fill=ORO, outline=ORO_D)
    d.point((33, coronilla - 6), fill=ORO_W)
    d.point((39, coronilla - 6), fill=ORO_W)
    d.point((36, coronilla), fill=ROJO)


def dibujar_jota(img, d, palo):
    robe, robe_d, robe_l = TRAJE[palo]
    # piernas con calzas bicolor y zapatos
    d.rectangle([30, 62, 33, 74], fill=robe_l, outline=robe_d)
    d.rectangle([38, 62, 41, 74], fill=robe_d)
    d.polygon([(26, 75), (33, 75), (33, 78), (26, 78)], fill=OSCURO)
    d.polygon([(38, 75), (45, 75), (45, 78), (38, 78)], fill=OSCURO)
    # tunica con orla y cinturon dorado
    d.polygon([(28, 42), (44, 42), (46, 63), (26, 63)], fill=robe, outline=robe_d)
    d.polygon([(36, 42), (44, 42), (46, 63), (41, 63)], fill=robe_d)
    d.line([(27, 62), (45, 62)], fill=ORO)
    for mx, my in ((31, 47), (33, 55), (38, 50)):
        d.point((mx, my), fill=robe_l)
    d.rectangle([26, 57, 46, 59], fill=ORO, outline=ORO_D)
    d.rectangle([35, 57, 37, 59], fill=ORO_D)
    d.point((36, 58), fill=ORO_W)
    # brazo izquierdo en jarras
    d.polygon([(28, 43), (32, 43), (30, 54), (25, 52)], fill=robe, outline=robe_d)
    d.ellipse([25, 51, 29, 55], fill=SKIN, outline=SKIN_D)
    # brazo derecho en alto con el simbolo del palo
    d.polygon([(40, 43), (44, 44), (48, 37), (45, 35)], fill=robe, outline=robe_d)
    d.line([(44, 43), (47, 38)], fill=ORO)
    poner_pip(img, palo, 49, 30, 4)
    d.ellipse([46, 34, 50, 38], fill=SKIN, outline=SKIN_D)
    # gorguera blanca
    d.polygon([(30, 43), (32, 40), (34, 43), (36, 40), (38, 43), (40, 40),
               (42, 43), (41, 44), (31, 44)], fill=BLANCO, outline=(202, 200, 190))
    # cara y gorra con pluma roja
    coronilla = cara(d, 36, 40)
    d.polygon([(30, coronilla + 1), (42, coronilla + 1), (41, coronilla - 4),
               (31, coronilla - 4)], fill=robe, outline=robe_d)
    d.line([(31, coronilla - 1), (41, coronilla - 1)], fill=robe_l)
    d.line([(41, coronilla - 3), (46, coronilla - 8)], fill=ROJO, width=2)
    d.point((46, coronilla - 8), fill=ROJO_L)


FIGURA = {"J": dibujar_jota, "Q": dibujar_reina, "K": dibujar_rey}


def crear_carta(palo, valor):
    img, d = carta_base()
    if valor == "A":
        # as: simbolo grande con destellos dorados (identidad 21 Arcanos)
        poner_pip(img, palo, CX, 50, 16)
        destello(d, CX, 24)
        destello(d, CX, 76)
        destello(d, 16, 50)
        destello(d, 56, 50)
        etiqueta = "A"
    elif isinstance(valor, int):
        for x, y in DISPOSICION[valor]:
            poner_pip(img, palo, x, y, 6, flip=(y > 50))
        etiqueta = str(valor)
    else:
        FIGURA[valor](img, d, palo)
        etiqueta = valor
    indices(img, d, etiqueta, palo)
    return img


def crear_reverso():
    """Reverso propio de 21 Arcanos: negro con motivo dorado."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=7, fill=CARBON, outline=ORO_D)
    d.rounded_rectangle([2, 2, W - 3, H - 3], radius=6, outline=ORO)
    d.rectangle([6, 6, W - 7, H - 7], fill=CARBON_2, outline=ORO_D)
    # celosia de rombos dorados
    for gy in range(12, H - 8, 12):
        desfase = 6 if (gy // 12) % 2 == 0 else 0
        for gx in range(12 + desfase, W - 8, 12):
            d.polygon([(gx, gy - 3), (gx + 3, gy), (gx, gy + 3), (gx - 3, gy)],
                      outline=ORO_D)
            d.point((gx, gy), fill=ORO)
    # medallon central: sol/estrella de la fortuna
    d.ellipse([CX - 13, 37, CX + 13, 63], fill=CARBON, outline=ORO)
    d.ellipse([CX - 11, 39, CX + 11, 61], outline=ORO_D)
    d.line([(CX, 43), (CX, 57)], fill=ORO)
    d.line([(CX - 7, 50), (CX + 7, 50)], fill=ORO)
    d.line([(CX - 5, 45), (CX + 5, 55)], fill=ORO_D)
    d.line([(CX + 5, 45), (CX - 5, 55)], fill=ORO_D)
    d.point((CX, 50), fill=ORO_W)
    # esquinas: abanicos dorados
    for cx_, cy_, a0, a1 in ((6, 6, 0, 90), (65, 6, 90, 180),
                             (65, 93, 180, 270), (6, 93, 270, 360)):
        d.arc([cx_ - 7, cy_ - 7, cx_ + 7, cy_ + 7], a0, a1, fill=ORO_D)
        d.arc([cx_ - 4, cy_ - 4, cx_ + 4, cy_ + 4], a0, a1, fill=ORO)
    return img


# ============================================================
#  Generacion
# ============================================================
def escalar(img):
    return img.resize((W * SCALE, H * SCALE), Image.NEAREST)


def main():
    palos = ["picas", "corazones", "diamantes", "treboles"]
    valores = ["A", 2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K"]
    generadas = {}

    reverso = escalar(crear_reverso())
    reverso.save(os.path.join(SALIDA, "poker-reverso.png"))

    for palo in palos:
        for valor in valores:
            img = escalar(crear_carta(palo, valor))
            img.save(os.path.join(SALIDA, f"poker-{palo}-{valor}.png"))
            generadas[f"{palo}-{valor}"] = img

    # hoja de contacto: 13 columnas x 4 filas + reverso
    mini_w, mini_h = W * 2, H * 2
    gap = 6
    hoja = Image.new("RGB", (13 * (mini_w + gap) + gap, 5 * (mini_h + gap) + gap),
                     (25, 25, 30))
    for r, palo in enumerate(palos):
        for c, valor in enumerate(valores):
            mini = generadas[f"{palo}-{valor}"].resize((mini_w, mini_h), Image.NEAREST)
            hoja.paste(mini, (gap + c * (mini_w + gap), gap + r * (mini_h + gap)), mini)
    mini = reverso.resize((mini_w, mini_h), Image.NEAREST)
    hoja.paste(mini, (gap, gap + 4 * (mini_h + gap)), mini)
    hoja.save(os.path.join(SALIDA, "_contacto_poker.png"))

    print(f"Generadas {len(generadas)} cartas + reverso en {SALIDA}")


if __name__ == "__main__":
    main()
