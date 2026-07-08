"""Genera las cartas pixel art de «Zona Tensionada» (13 roles + reverso).

Estilo coherente con img/cartas/generar_tarot.py: base 72x100 (mismo ratio que
la baraja española), fondo oscuro, marco triple y nombre dentro de la carta.
Todas las escenas comparten un fondo de ciudad dormida (skyline con ventanas
encendidas, luna y estrellas). El color del marco indica el bando:
verde = vecinos, rojo = fondos buitre, morado = independiente.
El medallón superior lleva el icono del bando (casita / € / estrella).

Cartas: buitre, plataforma, hacienda, sindicato, okupa, tasador,
inmobiliaria, influencer, vecino-1..vecino-5 y reverso.

Uso:  python img/zona/generar_cartas.py
Salida:  img/zona/<rol>.png , reverso.png y _contacto.png (revisión)
"""

import os
from PIL import Image, ImageDraw

SALIDA = os.path.dirname(os.path.abspath(__file__))

W, H = 72, 100
SCALE = 6  # 432 x 600
CX = W // 2

# --- Paleta base ---
AZUL     = (15, 23, 46)      # fondo de la carta
NOCHE    = (10, 15, 34)      # cielo del panel
EDIF     = (30, 38, 74)      # siluetas de edificios
EDIF_D   = (20, 26, 52)
ACERA    = (26, 32, 60)
VENTANA  = (247, 208, 108)   # ventanas encendidas
LUNA     = (232, 228, 205)
ESTRELLA = (220, 228, 245)
ESTR_D   = (120, 135, 170)
OSCURO   = (8, 10, 22)
BLANCO   = (255, 255, 255)

# bandos: (color, oscuro, claro)
BANDO = {
    "vecinos":       ((98, 176, 122), (48, 96, 66), (196, 240, 205)),
    "buitres":       ((204, 84, 74), (122, 40, 40), (250, 180, 160)),
    "independiente": ((162, 108, 212), (94, 56, 132), (226, 198, 250)),
}

ORO    = (238, 192, 66);  ORO_D = (166, 118, 24);  ORO_W = (255, 240, 180)
SKIN   = (240, 205, 160); SKIN_D = (198, 150, 108)
HUESO  = (232, 226, 210); HUESO_D = (160, 152, 132)
GRIS   = (150, 155, 170); GRIS_D = (90, 95, 112)
ACERO  = (168, 184, 210); ACERO_D = (92, 108, 140); ACERO_W = (235, 242, 252)
MADERA = (150, 102, 54);  MADERA_D = (96, 62, 30);  MADERA_W = (196, 150, 96)
PAPEL  = (236, 232, 220); PAPEL_D = (170, 164, 148); PAPEL_W = (252, 250, 244)
ROSA   = (250, 96, 130)
CIAN   = (80, 225, 230)
VERDEC = (60, 180, 90)    # corbata de la inmobiliaria


# ============================================================
#  Fuente 3x5 (A-Z) para los nombres
# ============================================================
FUENTE = {
    "A": [".#.", "#.#", "###", "#.#", "#.#"],
    "B": ["##.", "#.#", "##.", "#.#", "##."],
    "C": ["###", "#..", "#..", "#..", "###"],
    "D": ["##.", "#.#", "#.#", "#.#", "##."],
    "E": ["###", "#..", "###", "#..", "###"],
    "F": ["###", "#..", "###", "#..", "#.."],
    "G": ["###", "#..", "#.#", "#.#", "###"],
    "H": ["#.#", "#.#", "###", "#.#", "#.#"],
    "I": ["###", ".#.", ".#.", ".#.", "###"],
    "J": ["..#", "..#", "..#", "#.#", "###"],
    "K": ["#.#", "#.#", "##.", "#.#", "#.#"],
    "L": ["#..", "#..", "#..", "#..", "###"],
    "M": ["#.#", "###", "#.#", "#.#", "#.#"],
    "N": ["##.", "#.#", "#.#", "#.#", "#.#"],
    "O": ["###", "#.#", "#.#", "#.#", "###"],
    "P": ["###", "#.#", "###", "#..", "#.."],
    "Q": ["###", "#.#", "#.#", "###", "..#"],
    "R": ["##.", "#.#", "##.", "#.#", "#.#"],
    "S": ["###", "#..", "###", "..#", "###"],
    "T": ["###", ".#.", ".#.", ".#.", ".#."],
    "U": ["#.#", "#.#", "#.#", "#.#", "###"],
    "V": ["#.#", "#.#", "#.#", "#.#", ".#."],
    "W": ["#.#", "#.#", "#.#", "###", "#.#"],
    "X": ["#.#", "#.#", ".#.", "#.#", "#.#"],
    "Y": ["#.#", "#.#", ".#.", ".#.", ".#."],
    "Z": ["###", "..#", ".#.", "#..", "###"],
}


def ancho_texto(s):
    return sum(3 if ch == " " else 4 for ch in s) - 1


def texto(d, s, y, color, cx=None):
    """Texto 3x5 centrado en la carta, o en torno a cx si se indica."""
    x = (W - ancho_texto(s)) // 2 if cx is None else cx - ancho_texto(s) // 2
    for ch in s:
        if ch == " ":
            x += 3
            continue
        for gy, fila in enumerate(FUENTE[ch]):
            for gx, c in enumerate(fila):
                if c == "#":
                    d.point((x + gx, y + gy), fill=color)
        x += 4


def destello(d, x, y, c=ESTRELLA):
    """Estrella de 4 puntas (rombo de 5 píxeles)."""
    d.point((x, y), fill=c)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        d.point((x + dx, y + dy), fill=ESTR_D)


def corazon(d, x, y, c=ROSA):
    """Corazón de 3x3 píxeles centrado en (x, y)."""
    for px, py in ((x - 1, y - 1), (x + 1, y - 1),
                   (x - 1, y), (x, y), (x + 1, y), (x, y + 1)):
        d.point((px, py), fill=c)


# ============================================================
#  Marco común, medallón del bando y rótulo
# ============================================================
def icono_bando(d, bando):
    c = BANDO[bando][2]
    if bando == "vecinos":                      # casita
        d.polygon([(CX - 4, 13), (CX + 4, 13), (CX, 9)], fill=c)
        d.rectangle([CX - 3, 13, CX + 3, 17], fill=c)
        d.point((CX, 16), fill=AZUL)            # puerta
        d.point((CX, 17), fill=AZUL)
    elif bando == "buitres":                    # símbolo €
        d.arc([CX - 3, 9, CX + 3, 17], 60, 300, fill=c)
        d.line([(CX - 4, 12), (CX + 1, 12)], fill=c)
        d.line([(CX - 4, 14), (CX + 1, 14)], fill=c)
    else:                                       # estrella
        d.line([(CX - 3, 13), (CX + 3, 13)], fill=c)
        d.line([(CX, 10), (CX, 16)], fill=c)
        for dx, dy in ((-2, -2), (2, -2), (-2, 2), (2, 2)):
            d.point((CX + dx, 13 + dy), fill=c)


def base_carta(bando):
    col, col_d, _ = BANDO[bando]
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # triple marco en el color del bando
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=7, fill=AZUL, outline=col_d)
    d.rounded_rectangle([2, 2, W - 3, H - 3], radius=6, outline=col)
    d.rounded_rectangle([4, 4, W - 5, H - 5], radius=5, outline=col_d)
    # panel interior (la ciudad de noche)
    d.rectangle([7, 23, 64, 81], fill=NOCHE, outline=col)
    d.rectangle([8, 24, 63, 80], outline=col_d)
    # abanicos en las 4 esquinas del panel
    for cx_, cy_, a0, a1 in ((7, 23, 0, 90), (64, 23, 90, 180),
                             (64, 81, 180, 270), (7, 81, 270, 360)):
        d.arc([cx_ - 8, cy_ - 8, cx_ + 8, cy_ + 8], a0, a1, fill=col_d)
        d.arc([cx_ - 5, cy_ - 5, cx_ + 5, cy_ + 5], a0, a1, fill=col)
    # ramas de laurel a los lados del medallón
    for lado in (-1, 1):
        x0 = CX + lado * 9
        x1 = CX + lado * 26
        d.line([(x0, 13), (x1, 13)], fill=col_d)
        paso = 3 * lado
        for i, lx in enumerate(range(x0 + paso, x1, paso)):
            dy = -2 if i % 2 == 0 else 2
            d.line([(lx, 13), (lx - 2 * lado, 13 + dy)], fill=col)
    # medallón del bando (interrumpe el marco superior)
    d.ellipse([CX - 7, 6, CX + 7, 20], fill=AZUL, outline=col)
    d.ellipse([CX - 5, 8, CX + 5, 18], outline=col_d)
    icono_bando(d, bando)
    return img, d


def rotular(d, lineas, bando):
    """Nombre del rol bajo el panel, con hojitas si el texto deja hueco."""
    col, col_d, col_w = BANDO[bando]
    if len(lineas) == 1:
        texto(d, lineas[0], 86, col_w)
    else:
        texto(d, lineas[0], 83, col_w)
        texto(d, lineas[1], 89, col_w)
    if max(ancho_texto(s) for s in lineas) <= 36:
        ys = 86
        for lado, x0 in ((-1, 14), (1, 58)):
            d.line([(x0, ys + 2), (x0 + lado * 4, ys - 1)], fill=col_d)
            d.point((x0 + lado * 1, ys), fill=col)
            d.point((x0 + lado * 3, ys - 1), fill=col)


# ============================================================
#  Fondo común: la ciudad duerme
# ============================================================
EDIFICIOS = [(9, 46, 15), (16, 38, 22), (23, 50, 29), (30, 42, 37),
             (38, 52, 44), (45, 36, 52), (53, 47, 61)]


def fondo_ciudad(d, luna=(15, 30)):
    # estrellas
    for px, py in ((11, 26), (20, 27), (28, 25), (35, 28), (43, 26),
                   (50, 28), (58, 26), (61, 33), (9, 33)):
        d.point((px, py), fill=ESTR_D)
    d.point((47, 31), fill=ESTRELLA)
    d.point((25, 31), fill=ESTRELLA)
    if luna:
        lx, ly = luna
        d.ellipse([lx - 3, ly - 3, lx + 3, ly + 3], fill=LUNA)
        d.point((lx - 1, ly + 1), fill=(205, 200, 175))   # cráteres
        d.point((lx + 1, ly - 1), fill=(205, 200, 175))
    # skyline con alguna ventana encendida (patrón determinista)
    for x0, y0, x1 in EDIFICIOS:
        d.rectangle([x0, y0, x1, 74], fill=EDIF, outline=EDIF_D)
        for vx in range(x0 + 2, x1 - 1, 3):
            for vy in range(y0 + 3, 72, 4):
                h = (vx * 7 + vy * 13) % 7
                if h == 0:
                    d.point((vx, vy), fill=VENTANA)
                elif h in (2, 4):
                    d.point((vx, vy), fill=(45, 56, 100))
    # antena con lucecita
    d.line([(19, 38), (19, 34)], fill=EDIF_D)
    d.point((19, 33), fill=(200, 80, 80))
    # acera
    d.rectangle([9, 75, 62, 79], fill=ACERA)
    d.line([(9, 75), (62, 75)], fill=(40, 50, 88))


# ============================================================
#  Escenas de los roles
# ============================================================
def escena_buitre(d):
    """Buitre calvo con monóculo, corbata y maletín rebosante de billetes."""
    fondo_ciudad(d, luna=(14, 31))
    PLUMA, PLUMA_D = (64, 58, 74), (38, 34, 48)
    CABEZA, CABEZA_D = (238, 160, 140), (190, 110, 95)
    PICO, PICO_D = (240, 186, 70), (176, 126, 30)
    # patas amarillas con garras
    for px in (30, 38):
        d.line([(px, 66), (px, 75)], fill=PICO_D, width=2)
        d.line([(px - 2, 76), (px + 2, 76)], fill=PICO_D)
    # cola de plumas
    d.polygon([(22, 58), (14, 70), (18, 71), (22, 66), (24, 70), (27, 64)],
              fill=PLUMA_D)
    # cuerpo emplumado con textura
    d.ellipse([22, 42, 48, 70], fill=PLUMA, outline=PLUMA_D)
    d.arc([24, 50, 40, 66], 20, 160, fill=PLUMA_D)
    d.arc([27, 55, 43, 70], 20, 160, fill=PLUMA_D)
    d.arc([25, 45, 37, 57], 200, 300, fill=(84, 78, 96))    # brillo del lomo
    # maletín (antes que el ala, para que el ala lo agarre)
    MALETA, MALETA_D = (140, 92, 50), (88, 56, 28)
    d.rectangle([48, 53, 52, 56], fill=(120, 190, 120), outline=(60, 120, 70))
    d.rectangle([53, 52, 57, 56], fill=(120, 190, 120), outline=(60, 120, 70))
    d.point((50, 54), fill=(60, 120, 70))                   # billetes asomando
    d.point((55, 54), fill=(60, 120, 70))
    d.arc([51, 53, 56, 60], 180, 360, fill=MALETA_D)        # asa
    d.rounded_rectangle([46, 57, 61, 70], radius=1, fill=MALETA, outline=MALETA_D)
    d.line([(46, 59), (61, 59)], fill=MALETA_D)             # cierre superior
    d.point((49, 58), fill=ORO)                             # cierres dorados
    d.point((58, 58), fill=ORO)
    d.line([(47, 60), (47, 68)], fill=(180, 128, 74))       # brillo del canto
    # ala derecha bajando hacia el asa
    d.polygon([(42, 46), (48, 48), (52, 57), (46, 60)], fill=PLUMA, outline=PLUMA_D)
    # gorguera blanca y corbata
    d.ellipse([28, 36, 44, 47], fill=HUESO, outline=HUESO_D)
    d.polygon([(34, 45), (38, 45), (37, 49), (35, 49)], fill=(180, 40, 50))
    d.polygon([(34, 49), (38, 49), (39, 57), (36, 60), (33, 56)],
              fill=(210, 60, 66), outline=(150, 30, 40))
    # cabeza calva rosa con arrugas
    d.ellipse([30, 25, 44, 38], fill=CABEZA, outline=CABEZA_D)
    d.arc([31, 26, 43, 37], 300, 40, fill=CABEZA_D)
    d.line([(33, 27), (36, 26)], fill=CABEZA_D)
    d.line([(32, 29), (35, 28)], fill=CABEZA_D)
    # ceja torva, ojo y monóculo dorado con cadenita
    d.line([(37, 29), (41, 28)], fill=OSCURO)
    d.ellipse([37, 29, 41, 33], outline=ORO)
    d.point((39, 31), fill=OSCURO)
    d.point((38, 30), fill=BLANCO)
    d.line([(41, 33), (43, 38)], fill=ORO_D)
    # pico ganchudo
    d.polygon([(43, 29), (50, 31), (50, 34), (47, 36), (44, 34)],
              fill=PICO, outline=PICO_D)
    d.point((45, 31), fill=PICO_D)
    d.line([(48, 35), (47, 37)], fill=PICO_D)
    # monedas por el suelo
    for mx, my in ((18, 76), (24, 77), (57, 76)):
        d.ellipse([mx - 2, my - 1, mx + 2, my + 2], fill=ORO, outline=ORO_D)
        d.point((mx, my), fill=ORO_W)


def escena_hacienda(d):
    """Lupa gigante sobre una pila de facturas, sello rojo y calculadora."""
    fondo_ciudad(d, luna=(14, 29))
    # pila de facturas (tres hojas con desfase)
    d.rectangle([16, 52, 44, 76], fill=PAPEL_D, outline=(120, 115, 102))
    d.rectangle([14, 50, 42, 74], fill=PAPEL, outline=PAPEL_D)
    d.rectangle([12, 48, 40, 72], fill=PAPEL_W, outline=PAPEL_D)
    # cabecera y líneas de texto
    d.rectangle([14, 50, 26, 53], fill=(90, 110, 150))
    for ty in range(56, 70, 3):
        d.line([(14, ty), (32, ty)], fill=(150, 148, 138))
        d.line([(35, ty), (38, ty)], fill=(110, 108, 100))  # columna de cifras
    # sello rojo de inspección
    SELLO = (200, 60, 55)
    d.ellipse([15, 62, 25, 72], outline=SELLO)
    d.line([(17, 66), (23, 67)], fill=SELLO)
    d.line([(17, 68), (22, 69)], fill=SELLO)
    # calculadora (debajo de la lupa)
    d.rectangle([44, 66, 58, 77], fill=(52, 56, 66), outline=(30, 32, 40))
    d.rectangle([46, 68, 56, 71], fill=(120, 200, 150))
    for px in (54, 52, 50):
        d.point((px, 69), fill=(30, 60, 40))                # dígitos
    for i, bx in enumerate((47, 51, 55)):
        for j, by in enumerate((73, 75)):
            c = (200, 90, 70) if (i, j) == (2, 1) else (168, 172, 184)
            d.rectangle([bx, by, bx + 1, by + 1], fill=c)
    # mango de madera con virola dorada
    d.line([(54, 54), (61, 63)], fill=MADERA, width=4)
    d.line([(55, 56), (60, 62)], fill=MADERA_W)
    d.line([(53, 53), (56, 56)], fill=ORO)
    # lupa grande ampliando la factura
    d.ellipse([34, 35, 56, 57], fill=(168, 196, 230), outline=ACERO_D, width=2)
    d.ellipse([36, 37, 54, 55], outline=ACERO)
    # cifras rojas ampliadas bajo el cristal
    d.line([(40, 42), (48, 42)], fill=(205, 60, 50), width=2)
    d.line([(40, 46), (51, 46)], fill=(205, 60, 50), width=2)
    d.line([(40, 50), (46, 50)], fill=(205, 60, 50), width=2)
    d.point((49, 50), fill=(205, 60, 50))
    # brillo y sombra del cristal
    d.arc([37, 38, 53, 54], 200, 250, fill=BLANCO, width=2)
    d.point((41, 39), fill=BLANCO)
    d.arc([37, 38, 53, 54], 20, 70, fill=ACERO_D)


def escena_sindicato(d):
    """Comiendo gambas con babero, mantel de cuadros y el puño en alto."""
    fondo_ciudad(d, luna=(56, 29))
    CAMISA, CAMISA_D = (196, 60, 56), (134, 36, 36)
    GAMBA, GAMBA_D = (240, 130, 120), (190, 80, 80)
    # torso con camiseta roja
    d.polygon([(22, 42), (40, 42), (42, 62), (20, 62)], fill=CAMISA, outline=CAMISA_D)
    # babero blanco con crustáceo rojo
    d.polygon([(26, 43), (36, 43), (31, 54)], fill=PAPEL_W, outline=HUESO_D)
    d.point((31, 46), fill=(200, 60, 55))
    d.point((30, 47), fill=(200, 60, 55))
    d.point((32, 47), fill=(200, 60, 55))
    # brazo izquierdo en alto con el puño cerrado
    d.polygon([(19, 43), (26, 43), (23, 35), (18, 36)], fill=CAMISA, outline=CAMISA_D)
    d.rectangle([19, 31, 23, 37], fill=SKIN, outline=SKIN_D)
    d.ellipse([16, 25, 24, 33], fill=SKIN, outline=SKIN_D)
    d.line([(18, 28), (22, 28)], fill=SKIN_D)               # nudillos
    d.point((13, 27), fill=ORO_W)                           # chispas de fuerza
    d.point((26, 25), fill=ORO_W)
    d.point((12, 33), fill=ORO_W)
    # cabeza sonriente
    d.ellipse([24, 28, 36, 41], fill=SKIN, outline=SKIN_D)
    d.arc([24, 26, 36, 34], 180, 360, fill=(96, 62, 30))    # pelo
    d.point((28, 33), fill=OSCURO)
    d.point((33, 33), fill=OSCURO)
    d.ellipse([29, 36, 33, 40], fill=(120, 40, 40), outline=SKIN_D)  # boca abierta
    d.point((26, 36), fill=(230, 150, 140))                 # colorete
    # brazo derecho llevándose una gamba a la boca
    d.polygon([(37, 43), (41, 43), (43, 48), (39, 49)], fill=CAMISA, outline=CAMISA_D)
    d.line([(40, 46), (38, 42)], fill=SKIN, width=2)
    d.ellipse([36, 39, 40, 43], fill=SKIN, outline=SKIN_D)
    d.arc([33, 34, 39, 40], 300, 160, fill=GAMBA, width=2)  # gamba en mano
    d.point((33, 36), fill=GAMBA_D)
    d.line([(34, 33), (32, 31)], fill=GAMBA_D)              # antenas
    d.line([(36, 33), (35, 31)], fill=GAMBA_D)
    # mesa con mantel de cuadros
    d.rectangle([12, 58, 50, 78], fill=(238, 236, 230), outline=(170, 80, 80))
    CUADRO = (214, 110, 105)
    for x in range(14, 50, 4):
        d.line([(x, 58), (x, 78)], fill=CUADRO)
    for y in range(61, 78, 4):
        d.line([(12, y), (50, y)], fill=CUADRO)
    # plato de mariscada
    d.ellipse([16, 54, 38, 62], fill=BLANCO, outline=HUESO_D)
    d.ellipse([18, 55, 36, 61], outline=(210, 210, 215))
    for gx, gy in ((21, 56), (27, 55), (31, 57)):
        d.arc([gx - 3, gy - 1, gx + 3, gy + 5], 300, 160, fill=GAMBA, width=2)
        d.point((gx - 3, gy), fill=GAMBA_D)
    d.pieslice([32, 56, 37, 61], 180, 360, fill=(240, 220, 110),
               outline=(190, 170, 60))                      # limón
    # caña bien fría
    d.rectangle([42, 49, 47, 59], fill=(230, 170, 80), outline=(180, 120, 40))
    d.rectangle([42, 46, 47, 49], fill=PAPEL_W, outline=HUESO_D)


def escena_plataforma(d):
    """Turista de camisa hawaiana con maleta de pegatinas y llave gigante."""
    fondo_ciudad(d, luna=(14, 29))
    MALETA, MALETA_D = (60, 170, 180), (34, 110, 120)
    HAW, HAW_D = (210, 72, 84), (140, 40, 52)
    PAJA, PAJA_D = (228, 200, 120), (170, 146, 70)
    # maleta con ruedas y asa telescópica
    d.line([(14, 50), (14, 42)], fill=GRIS)
    d.line([(22, 50), (22, 42)], fill=GRIS)
    d.line([(14, 42), (22, 42)], fill=GRIS)
    d.rounded_rectangle([11, 50, 26, 74], radius=2, fill=MALETA, outline=MALETA_D)
    d.line([(11, 58), (26, 58)], fill=MALETA_D)
    d.line([(11, 66), (26, 66)], fill=MALETA_D)
    destello(d, 16, 54, ORO)                                # pegatinas
    d.ellipse([19, 61, 22, 64], fill=(204, 84, 74))
    d.point((20, 62), fill=BLANCO)
    corazon(d, 16, 70, ROSA)
    d.ellipse([12, 74, 16, 78], fill=OSCURO, outline=GRIS_D)
    d.ellipse([21, 74, 25, 78], fill=OSCURO, outline=GRIS_D)
    # piernas con sandalias
    d.line([(34, 66), (34, 73)], fill=SKIN, width=2)
    d.line([(43, 66), (43, 73)], fill=SKIN, width=2)
    d.rectangle([31, 73, 38, 76], fill=(140, 92, 50), outline=(88, 56, 28))
    d.rectangle([40, 73, 47, 76], fill=(140, 92, 50), outline=(88, 56, 28))
    d.point((34, 73), fill=(88, 56, 28))                    # tiras
    d.point((43, 73), fill=(88, 56, 28))
    # bermudas
    d.polygon([(31, 58), (46, 58), (47, 66), (30, 66)], fill=(200, 170, 110),
              outline=(150, 120, 70))
    d.line([(38, 60), (38, 66)], fill=(150, 120, 70))
    # camisa hawaiana de flores
    d.polygon([(30, 44), (48, 44), (49, 60), (29, 60)], fill=HAW, outline=HAW_D)
    for fx, fy in ((33, 48), (43, 47), (36, 55), (45, 53), (32, 57)):
        d.point((fx, fy), fill=BLANCO)
        d.point((fx + 1, fy), fill=BLANCO)
        d.point((fx, fy + 1), fill=BLANCO)
        d.point((fx + 1, fy + 1), fill=(255, 210, 160))
    # brazo izquierdo hacia el asa de la maleta
    d.line([(31, 47), (24, 43)], fill=SKIN, width=2)
    d.ellipse([20, 40, 25, 45], fill=SKIN, outline=SKIN_D)
    # brazo derecho en alto con la llave dorada del piso turístico
    d.line([(46, 46), (52, 36)], fill=SKIN, width=2)
    d.ellipse([52, 25, 58, 31], outline=ORO)                # anilla de la llave
    d.point((55, 26), fill=ORO_W)
    d.line([(55, 31), (55, 42)], fill=ORO, width=2)
    d.line([(55, 40), (58, 40)], fill=ORO)                  # dientes
    d.line([(55, 42), (57, 42)], fill=ORO)
    d.ellipse([50, 32, 55, 37], fill=SKIN, outline=SKIN_D)  # mano
    # cámara de fotos colgada
    d.line([(35, 44), (34, 50)], fill=(40, 42, 50))
    d.line([(43, 44), (42, 50)], fill=(40, 42, 50))
    d.rectangle([34, 50, 42, 56], fill=(40, 42, 50), outline=OSCURO)
    d.ellipse([36, 51, 40, 55], outline=GRIS)
    d.point((38, 53), fill=CIAN)
    d.point((41, 51), fill=ORO)
    # cabeza con gafas de sol y sombrero de paja
    d.ellipse([32, 30, 44, 43], fill=SKIN, outline=SKIN_D)
    d.rectangle([34, 34, 42, 37], fill=OSCURO)              # gafas de sol
    d.point((36, 35), fill=BLANCO)
    d.point((41, 35), fill=BLANCO)
    d.line([(36, 40), (40, 40)], fill=OSCURO)               # sonrisa
    d.point((37, 41), fill=BLANCO)
    d.ellipse([29, 28, 47, 33], fill=PAJA, outline=PAJA_D)  # ala del sombrero
    d.pieslice([33, 25, 43, 33], 180, 360, fill=PAJA, outline=PAJA_D)
    d.line([(34, 30), (42, 30)], fill=(204, 84, 74))        # cinta


def escena_okupa(d):
    """Andrajoso con barba, jersey de parches, candado al cinto y su hacha."""
    fondo_ciudad(d, luna=(14, 30))
    JERSEY, JERSEY_D = (110, 116, 60), (70, 74, 36)
    BARBA, BARBA_D = (120, 90, 60), (84, 60, 38)
    # piernas remendadas
    d.rectangle([26, 60, 32, 74], fill=(96, 78, 58), outline=(60, 48, 34))
    d.rectangle([34, 60, 40, 74], fill=(96, 78, 58), outline=(60, 48, 34))
    d.point((29, 67), fill=SKIN)                            # rodilla al aire
    d.point((28, 68), fill=SKIN)
    # zapatos rotos con el dedo fuera
    d.rectangle([24, 74, 32, 78], fill=(56, 44, 34), outline=OSCURO)
    d.rectangle([34, 74, 42, 78], fill=(56, 44, 34), outline=OSCURO)
    d.point((24, 76), fill=SKIN)
    # hacha (antes que el brazo, para que la mano la agarre)
    d.line([(41, 60), (51, 30)], fill=MADERA, width=2)
    d.line([(44, 52), (48, 40)], fill=MADERA_W)
    d.polygon([(43, 27), (50, 26), (52, 33), (45, 34)], fill=ACERO, outline=ACERO_D)
    d.polygon([(50, 26), (53, 27), (54, 31), (52, 33)], fill=ACERO_D)  # culata
    d.line([(44, 28), (43, 31)], fill=ACERO_W)              # filo
    d.point((44, 33), fill=ACERO_W)
    # jersey con parches y bajo deshilachado
    d.polygon([(23, 42), (43, 42), (45, 62), (21, 62)], fill=JERSEY, outline=JERSEY_D)
    for zx in range(23, 44, 3):
        d.point((zx, 62), fill=JERSEY_D)
        d.point((zx + 1, 63), fill=OSCURO)
    d.rectangle([26, 50, 30, 54], fill=(190, 70, 66), outline=(130, 42, 40))
    d.point((26, 50), fill=PAPEL_W)                         # puntadas
    d.point((30, 54), fill=PAPEL_W)
    d.rectangle([36, 46, 40, 50], fill=(70, 110, 170), outline=(44, 72, 118))
    d.point((36, 50), fill=PAPEL_W)
    d.point((40, 46), fill=PAPEL_W)
    # cinturón con candado colgado
    d.line([(22, 61), (44, 61)], fill=(60, 48, 34))
    d.arc([31, 59, 35, 63], 180, 360, fill=ACERO_D)
    d.rectangle([31, 62, 35, 66], fill=ORO, outline=ORO_D)
    d.point((33, 64), fill=OSCURO)
    # brazo izquierdo caído
    d.polygon([(22, 43), (26, 44), (24, 58), (20, 57)], fill=JERSEY, outline=JERSEY_D)
    d.ellipse([20, 56, 24, 61], fill=SKIN, outline=SKIN_D)
    # brazo derecho agarrando el hacha
    d.polygon([(40, 44), (44, 45), (48, 50), (44, 53)], fill=JERSEY, outline=JERSEY_D)
    d.point((44, 46), fill=SKIN)                            # codo por el roto
    d.ellipse([44, 46, 49, 51], fill=SKIN, outline=SKIN_D)
    # cabeza greñuda con barba
    d.pieslice([26, 25, 42, 39], 180, 360, fill=BARBA_D)
    d.polygon([(26, 31), (23, 27), (27, 29)], fill=BARBA_D)  # greñas sueltas
    d.polygon([(41, 30), (44, 26), (43, 31)], fill=BARBA_D)
    d.polygon([(28, 27), (27, 25), (30, 26)], fill=BARBA_D)
    d.polygon([(36, 26), (38, 25), (38, 27)], fill=BARBA_D)
    d.ellipse([28, 28, 40, 41], fill=SKIN, outline=SKIN_D)
    d.arc([28, 28, 40, 36], 210, 330, fill=BARBA_D, width=2)  # flequillo
    d.point((32, 38), fill=(150, 130, 100))                 # tizne
    d.rectangle([29, 31, 32, 33], fill=BLANCO)              # ojo desorbitado
    d.point((31, 32), fill=OSCURO)
    d.line([(35, 32), (38, 32)], fill=OSCURO)               # ojo entornado
    d.line([(35, 30), (38, 31)], fill=BARBA_D)              # ceja
    d.ellipse([27, 34, 41, 45], fill=BARBA, outline=BARBA_D)
    d.point((33, 37), fill=BARBA_D)
    d.point((36, 40), fill=BARBA_D)
    d.ellipse([32, 37, 36, 40], fill=(120, 60, 50))         # boca abierta


def escena_tasador(d):
    """Casco, chaleco reflectante, planos enrollados y metro plegable."""
    fondo_ciudad(d, luna=(14, 29))
    CASCO, CASCO_D = (245, 200, 50), (190, 140, 20)
    CAMISAZ, CAMISAZ_D = (70, 110, 170), (44, 72, 118)
    CHALECO, CHALECO_D = (240, 130, 40), (180, 88, 20)
    REFLEC = (250, 220, 90)
    PLANO, PLANO_D, PLANO_W = (96, 142, 205), (58, 92, 150), (210, 228, 248)
    # piernas y botas
    d.rectangle([27, 62, 33, 75], fill=(108, 112, 124), outline=(70, 72, 82))
    d.rectangle([35, 62, 41, 75], fill=(108, 112, 124), outline=(70, 72, 82))
    d.rectangle([25, 75, 34, 78], fill=(140, 92, 50), outline=(88, 56, 28))
    d.rectangle([34, 75, 43, 78], fill=(140, 92, 50), outline=(88, 56, 28))
    # torso: camisa azul + chaleco naranja con bandas reflectantes
    d.polygon([(24, 42), (44, 42), (46, 63), (22, 63)], fill=CAMISAZ,
              outline=CAMISAZ_D)
    d.rectangle([26, 42, 42, 63], fill=CHALECO, outline=CHALECO_D)
    d.line([(29, 43), (29, 62)], fill=REFLEC, width=2)
    d.line([(39, 43), (39, 62)], fill=REFLEC, width=2)
    d.line([(34, 44), (34, 62)], fill=CHALECO_D)            # cremallera
    d.line([(22, 63), (46, 63)], fill=(70, 72, 82))         # cinturón
    d.point((34, 63), fill=ORO)
    # planos enrollados bajo el brazo izquierdo
    d.line([(12, 60), (26, 56)], fill=PAPEL, width=3)       # rollo blanco detrás
    d.ellipse([10, 57, 15, 62], fill=PAPEL_W, outline=PAPEL_D)
    d.line([(10, 53), (27, 48)], fill=PLANO_D, width=7)     # tubo azul con borde
    d.line([(11, 53), (26, 48)], fill=PLANO, width=5)
    d.line([(12, 51), (25, 47)], fill=PLANO_W)
    d.ellipse([8, 50, 15, 57], fill=PLANO_W, outline=PLANO_D)
    d.ellipse([10, 52, 13, 55], outline=PLANO_D)            # espiral del rollo
    d.polygon([(23, 43), (27, 44), (25, 56), (20, 55)], fill=CAMISAZ,
              outline=CAMISAZ_D)
    d.ellipse([19, 49, 24, 54], fill=SKIN, outline=SKIN_D)
    # brazo derecho en alto con el metro plegable amarillo
    d.polygon([(41, 43), (45, 44), (49, 38), (46, 35)], fill=CAMISAZ,
              outline=CAMISAZ_D)
    d.line([(48, 33), (53, 27)], fill=(240, 205, 70), width=2)
    d.line([(53, 27), (58, 33)], fill=(240, 205, 70), width=2)
    d.line([(58, 33), (60, 27)], fill=(240, 205, 70), width=2)
    d.point((53, 27), fill=(150, 110, 20))                  # bisagras
    d.point((58, 33), fill=(150, 110, 20))
    d.ellipse([46, 33, 51, 38], fill=SKIN, outline=SKIN_D)
    # cabeza: cara, bigote, lápiz en la oreja y casco
    d.ellipse([28, 33, 42, 46], fill=SKIN, outline=SKIN_D)
    d.point((32, 39), fill=OSCURO)
    d.point((38, 39), fill=OSCURO)
    d.line([(33, 42), (37, 42)], fill=(96, 62, 30))         # bigote
    d.point((35, 44), fill=SKIN_D)
    d.line([(42, 38), (45, 37)], fill=(235, 130, 60))       # lápiz
    d.point((46, 37), fill=OSCURO)
    d.pieslice([27, 25, 43, 37], 180, 360, fill=CASCO, outline=CASCO_D)
    d.rectangle([25, 33, 45, 35], fill=CASCO, outline=CASCO_D)
    d.line([(35, 26), (35, 32)], fill=CASCO_D)              # nervio central
    d.point((31, 28), fill=ORO_W)


def escena_inmobiliaria(d):
    """Comercial de traje con corbata verde, llavero en alto y casita."""
    fondo_ciudad(d, luna=(14, 28))
    TRAJE, TRAJE_D = (140, 145, 158), (88, 92, 104)
    PELO_N = (40, 38, 44)
    # piernas y zapatos lustrosos
    d.rectangle([28, 64, 34, 76], fill=TRAJE_D, outline=(60, 62, 72))
    d.rectangle([36, 64, 42, 76], fill=TRAJE_D, outline=(60, 62, 72))
    d.rectangle([26, 76, 35, 78], fill=OSCURO)
    d.rectangle([35, 76, 44, 78], fill=OSCURO)
    d.point((28, 77), fill=GRIS)
    d.point((42, 77), fill=GRIS)
    # americana con camisa y corbata VERDE
    d.polygon([(24, 44), (46, 44), (47, 65), (23, 65)], fill=TRAJE, outline=TRAJE_D)
    d.polygon([(31, 44), (39, 44), (35, 54)], fill=BLANCO)  # camisa
    d.polygon([(28, 44), (33, 44), (31, 51), (26, 49)], fill=TRAJE_D)  # solapas
    d.polygon([(42, 44), (37, 44), (39, 51), (44, 49)], fill=TRAJE_D)
    d.rectangle([33, 46, 37, 48], fill=VERDEC, outline=(30, 120, 55))  # nudo
    d.polygon([(33, 48), (37, 48), (38, 57), (35, 61), (32, 57)],
              fill=VERDEC, outline=(30, 120, 55))
    d.point((35, 51), fill=(140, 230, 160))                 # brillo de la corbata
    d.point((43, 51), fill=VERDEC)                          # pañuelo del bolsillo
    d.point((44, 51), fill=VERDEC)
    d.point((35, 63), fill=TRAJE_D)                         # botón
    # casita bajo el brazo izquierdo
    d.polygon([(11, 55), (27, 55), (19, 48)], fill=(198, 80, 60),
              outline=(140, 50, 38))
    d.rectangle([13, 55, 25, 66], fill=(238, 222, 180), outline=(170, 150, 110))
    d.rectangle([17, 60, 21, 66], fill=(120, 80, 45))
    d.point((15, 58), fill=VENTANA)
    d.point((23, 58), fill=VENTANA)
    d.polygon([(25, 45), (29, 46), (27, 57), (22, 56)], fill=TRAJE, outline=TRAJE_D)
    d.ellipse([21, 52, 26, 57], fill=SKIN, outline=SKIN_D)
    # brazo derecho en alto con el llavero
    d.polygon([(44, 45), (48, 46), (53, 36), (49, 34)], fill=TRAJE, outline=TRAJE_D)
    d.line([(48, 36), (49, 34)], fill=BLANCO)               # puño de la camisa
    d.ellipse([54, 26, 60, 32], outline=ORO)                # anilla
    d.point((57, 27), fill=ORO_W)
    d.line([(55, 32), (54, 38)], fill=ORO)                  # tres llaves
    d.point((53, 37), fill=ORO_D)
    d.line([(57, 32), (57, 39)], fill=ORO)
    d.point((58, 38), fill=ORO_D)
    d.line([(59, 32), (60, 37)], fill=ORO)
    d.point((61, 36), fill=ORO_D)
    d.ellipse([50, 31, 55, 36], fill=SKIN, outline=SKIN_D)  # mano
    # cabeza: sonrisa de anuncio y pelo engominado
    d.ellipse([28, 28, 42, 42], fill=SKIN, outline=SKIN_D)
    d.point((32, 34), fill=OSCURO)
    d.point((38, 34), fill=OSCURO)
    d.line([(31, 32), (33, 32)], fill=PELO_N)               # cejas
    d.line([(37, 32), (39, 32)], fill=PELO_N)
    d.polygon([(32, 37), (38, 37), (35, 40)], fill=(120, 40, 40))
    d.line([(33, 37), (37, 37)], fill=BLANCO)               # dientes
    d.pieslice([28, 26, 42, 36], 180, 360, fill=PELO_N)     # pelo engominado
    d.line([(31, 29), (34, 28)], fill=GRIS)                 # brillo de gomina
    destello(d, 41, 39, BLANCO)                             # destello del anuncio


def escena_influencer(d):
    """Móvil gigante con directo estilo TikTok, corazones y notas."""
    fondo_ciudad(d, luna=(13, 28))
    MOVIL = (34, 36, 46)
    PANT = (24, 20, 38)
    # decoración flotante alrededor
    corazon(d, 17, 34, ROSA)
    corazon(d, 55, 44, ROSA)
    d.line([(17, 49), (17, 53)], fill=ESTRELLA)             # notas musicales
    d.point((16, 54), fill=ESTRELLA)
    d.point((18, 49), fill=ESTRELLA)
    d.line([(55, 57), (55, 61)], fill=ESTRELLA)
    d.point((54, 62), fill=ESTRELLA)
    d.point((56, 57), fill=ESTRELLA)
    destello(d, 54, 29)
    # cuerpo del móvil
    d.rounded_rectangle([22, 26, 50, 75], radius=3, fill=MOVIL, outline=(16, 17, 24))
    d.rectangle([24, 29, 48, 71], fill=PANT)
    d.line([(32, 27), (40, 27)], fill=(16, 17, 24))         # altavoz
    d.line([(33, 73), (39, 73)], fill=GRIS_D)               # barra de inicio
    # suelo del escenario en pantalla
    d.rectangle([24, 62, 48, 71], fill=(34, 28, 52))
    # bailarina con luz dividida cian/rosa (guiño al logo)
    d.line([(32, 43), (33, 52)], fill=CIAN)
    d.line([(40, 44), (39, 52)], fill=ROSA)
    d.ellipse([33, 36, 39, 42], fill=SKIN, outline=SKIN_D)
    d.point((35, 35), fill=OSCURO)                          # moño
    d.point((36, 35), fill=OSCURO)
    d.polygon([(33, 43), (39, 43), (38, 52), (34, 52)], fill=(226, 80, 140))
    d.line([(38, 44), (43, 37)], fill=SKIN, width=2)        # brazo arriba
    d.line([(34, 44), (29, 49)], fill=SKIN, width=2)        # brazo abajo
    d.line([(35, 52), (33, 62)], fill=(70, 90, 180), width=2)
    d.line([(37, 52), (40, 61)], fill=(70, 90, 180), width=2)
    d.point((33, 63), fill=BLANCO)                          # zapatillas
    d.point((40, 62), fill=BLANCO)
    # insignia de directo
    d.rectangle([26, 31, 34, 35], fill=(226, 50, 60))
    d.point((28, 33), fill=BLANCO)
    d.point((30, 33), fill=BLANCO)
    d.point((32, 33), fill=BLANCO)
    # columna de iconos (like, comentario, compartir)
    corazon(d, 45, 45, (250, 60, 80))
    d.point((45, 48), fill=GRIS)                            # contador
    d.rectangle([44, 51, 47, 53], fill=BLANCO)
    d.point((44, 54), fill=BLANCO)
    d.point((45, 56), fill=GRIS)
    d.line([(44, 60), (47, 58)], fill=BLANCO)
    d.point((46, 60), fill=BLANCO)
    # corazones subiendo por el directo
    corazon(d, 42, 38, ROSA)
    d.point((44, 33), fill=ROSA)
    d.point((41, 31), fill=(226, 80, 140))
    # barra de progreso y nota musical
    d.line([(26, 69), (46, 69)], fill=(90, 90, 110))
    d.line([(26, 69), (38, 69)], fill=BLANCO)
    d.line([(28, 63), (28, 66)], fill=BLANCO)
    d.point((27, 67), fill=BLANCO)
    d.point((29, 63), fill=BLANCO)
    # mano que sujeta el móvil
    d.polygon([(47, 79), (47, 71), (51, 67), (56, 73), (56, 79)],
              fill=SKIN, outline=SKIN_D)
    d.ellipse([43, 68, 49, 73], fill=SKIN, outline=SKIN_D)  # pulgar


def escena_vecino1(d):
    """Abuela con gafas, rebeca lila y carrito de la compra a cuadros."""
    fondo_ciudad(d, luna=(14, 28))
    REBECA, REBECA_D = (178, 130, 200), (120, 80, 140)
    FALDA, FALDA_D = (70, 84, 150), (44, 54, 100)
    CARRO, CARRO_D = (190, 70, 66), (130, 42, 40)
    PELO_G = (200, 200, 205)
    # falda, piernas y zapatos
    d.polygon([(25, 56), (39, 56), (41, 66), (23, 66)], fill=FALDA, outline=FALDA_D)
    d.line([(28, 66), (28, 73)], fill=SKIN, width=2)
    d.line([(35, 66), (35, 73)], fill=SKIN, width=2)
    d.rectangle([25, 73, 31, 77], fill=(96, 62, 30), outline=(60, 40, 20))
    d.rectangle([33, 73, 39, 77], fill=(96, 62, 30), outline=(60, 40, 20))
    # carrito de la compra a cuadros
    d.line([(46, 49), (46, 44)], fill=GRIS)
    d.line([(43, 44), (49, 44)], fill=GRIS_D)
    d.line([(56, 44), (59, 49)], fill=(222, 176, 110), width=2)   # barra de pan
    d.point((56, 43), fill=(240, 200, 140))
    d.line([(52, 43), (54, 49)], fill=(84, 160, 80), width=2)     # puerro
    d.point((52, 42), fill=(120, 200, 110))
    d.point((51, 41), fill=(120, 200, 110))
    d.rectangle([46, 48, 60, 70], fill=CARRO, outline=CARRO_D)
    for x in (49, 53, 57):
        d.line([(x, 48), (x, 70)], fill=CARRO_D)
    for y in (53, 58, 63, 68):
        d.line([(46, y), (60, y)], fill=(214, 120, 110))
    d.ellipse([48, 71, 54, 77], fill=OSCURO, outline=GRIS_D)
    d.point((51, 74), fill=GRIS)
    # rebeca con botones
    d.polygon([(24, 42), (40, 42), (41, 58), (23, 58)], fill=REBECA, outline=REBECA_D)
    d.point((32, 46), fill=HUESO)
    d.point((32, 50), fill=HUESO)
    d.point((32, 54), fill=HUESO)
    # brazo derecho con bolso
    d.polygon([(24, 44), (27, 45), (24, 53), (21, 52)], fill=REBECA, outline=REBECA_D)
    d.arc([16, 52, 23, 59], 180, 360, fill=(88, 56, 28))
    d.rectangle([15, 56, 24, 63], fill=(140, 92, 50), outline=(88, 56, 28))
    d.point((19, 59), fill=ORO)
    d.ellipse([21, 51, 25, 55], fill=SKIN, outline=SKIN_D)
    # brazo izquierdo hacia el carrito
    d.polygon([(38, 44), (42, 45), (46, 50), (43, 53)], fill=REBECA, outline=REBECA_D)
    d.ellipse([44, 48, 48, 52], fill=SKIN, outline=SKIN_D)
    # cabeza con moño y gafas
    d.ellipse([26, 29, 38, 42], fill=SKIN, outline=SKIN_D)
    d.pieslice([26, 27, 38, 38], 180, 360, fill=PELO_G, outline=GRIS_D)
    d.ellipse([29, 25, 35, 30], fill=PELO_G, outline=GRIS_D)  # moño
    d.ellipse([28, 33, 32, 37], outline=OSCURO)               # gafas
    d.ellipse([34, 33, 38, 37], outline=OSCURO)
    d.line([(32, 35), (34, 35)], fill=OSCURO)
    d.point((30, 35), fill=OSCURO)
    d.point((36, 35), fill=OSCURO)
    d.line([(31, 39), (34, 39)], fill=SKIN_D)                 # sonrisa
    d.point((28, 38), fill=(230, 150, 140))
    d.point((37, 38), fill=(230, 150, 140))


def escena_vecino2(d):
    """Joven con gorro, auriculares naranjas, sudadera y monopatín."""
    fondo_ciudad(d, luna=(14, 28))
    SUDA, SUDA_D = (232, 190, 60), (170, 134, 30)
    GORRO, GORRO_D = (200, 70, 70), (140, 44, 44)
    NARANJA = (240, 140, 50)
    VAQUERO, VAQUERO_D = (80, 110, 170), (52, 72, 118)
    # vaqueros con bajos vueltos y zapatillas
    d.rectangle([27, 58, 33, 73], fill=VAQUERO, outline=VAQUERO_D)
    d.rectangle([35, 58, 41, 73], fill=VAQUERO, outline=VAQUERO_D)
    d.line([(28, 71), (32, 71)], fill=(140, 170, 220))
    d.line([(36, 71), (40, 71)], fill=(140, 170, 220))
    d.rectangle([24, 73, 33, 77], fill=BLANCO, outline=GRIS_D)
    d.rectangle([35, 73, 44, 77], fill=BLANCO, outline=GRIS_D)
    d.point((26, 74), fill=(200, 60, 55))                   # detalle de la marca
    d.point((42, 74), fill=(200, 60, 55))
    # monopatín en vertical (antes que el brazo)
    d.rounded_rectangle([48, 40, 53, 72], radius=2, fill=MADERA, outline=MADERA_D)
    d.line([(50, 43), (50, 69)], fill=MADERA_D)             # lija
    d.ellipse([45, 45, 48, 48], fill=NARANJA, outline=(150, 70, 20))
    d.ellipse([45, 63, 48, 66], fill=NARANJA, outline=(150, 70, 20))
    # sudadera con capucha, cordones y bolsillo
    d.ellipse([27, 40, 41, 46], fill=SUDA_D)                # capucha recogida
    d.polygon([(24, 42), (44, 42), (45, 60), (23, 60)], fill=SUDA, outline=SUDA_D)
    d.rectangle([30, 53, 38, 58], outline=SUDA_D)           # bolsillo canguro
    d.line([(32, 44), (32, 48)], fill=BLANCO)               # cordones
    d.line([(36, 44), (36, 48)], fill=BLANCO)
    d.point((32, 49), fill=BLANCO)
    d.point((36, 49), fill=BLANCO)
    # brazo izquierdo caído
    d.polygon([(24, 43), (27, 44), (24, 54), (20, 53)], fill=SUDA, outline=SUDA_D)
    d.ellipse([20, 53, 24, 57], fill=SKIN, outline=SKIN_D)
    # brazo derecho sujetando la tabla
    d.polygon([(42, 44), (46, 45), (48, 52), (44, 54)], fill=SUDA, outline=SUDA_D)
    d.ellipse([44, 52, 48, 56], fill=SKIN, outline=SKIN_D)
    # cabeza: gorro + auriculares por encima
    d.ellipse([28, 30, 40, 42], fill=SKIN, outline=SKIN_D)
    d.pieslice([27, 26, 41, 36], 180, 360, fill=GORRO, outline=GORRO_D)
    d.rectangle([27, 31, 41, 33], fill=GORRO_D)             # vuelta del gorro
    d.arc([27, 25, 41, 39], 180, 360, fill=NARANJA, width=2)
    d.rectangle([26, 33, 29, 38], fill=NARANJA, outline=(150, 70, 20))
    d.rectangle([39, 33, 42, 38], fill=NARANJA, outline=(150, 70, 20))
    d.point((31, 36), fill=OSCURO)
    d.point((37, 36), fill=OSCURO)
    d.line([(33, 39), (35, 39)], fill=SKIN_D)               # media sonrisa
    d.point((36, 39), fill=SKIN_D)


def escena_vecino3(d):
    """Vecina regando la maceta del balcón con su regadera verde."""
    fondo_ciudad(d, luna=(52, 27))
    CAMIT, CAMIT_D = (80, 170, 160), (46, 110, 104)
    MOSTAZA, MOSTAZA_D = (210, 160, 60), (150, 110, 30)
    CASTANO, CASTANO_D = (130, 88, 50), (90, 58, 30)
    REGA, REGA_D = (90, 160, 90), (50, 105, 55)
    # falda, piernas y bailarinas rojas
    d.polygon([(19, 54), (33, 54), (35, 64), (17, 64)], fill=MOSTAZA,
              outline=MOSTAZA_D)
    d.line([(24, 64), (24, 72)], fill=SKIN, width=2)
    d.line([(29, 64), (29, 72)], fill=SKIN, width=2)
    d.rectangle([21, 72, 27, 76], fill=(200, 70, 70), outline=(140, 44, 44))
    d.rectangle([28, 72, 34, 76], fill=(200, 70, 70), outline=(140, 44, 44))
    # camiseta
    d.polygon([(20, 42), (32, 42), (33, 55), (19, 55)], fill=CAMIT, outline=CAMIT_D)
    d.point((26, 47), fill=(140, 230, 210))                 # dibujito
    d.point((25, 48), fill=(140, 230, 210))
    d.point((27, 48), fill=(140, 230, 210))
    # brazo izquierdo en la cadera
    d.polygon([(20, 44), (23, 45), (20, 52), (17, 51)], fill=CAMIT, outline=CAMIT_D)
    d.ellipse([17, 50, 21, 54], fill=SKIN, outline=SKIN_D)
    # brazo derecho extendido con la regadera
    d.polygon([(31, 44), (35, 45), (39, 47), (36, 51)], fill=CAMIT, outline=CAMIT_D)
    d.arc([42, 41, 50, 49], 180, 360, fill=REGA_D)          # asa superior
    d.rounded_rectangle([40, 44, 52, 54], radius=2, fill=REGA, outline=REGA_D)
    d.line([(42, 46), (46, 46)], fill=(140, 220, 140))      # brillo
    d.line([(51, 47), (57, 52)], fill=REGA, width=2)        # pitorro
    d.ellipse([55, 50, 59, 54], fill=REGA_D)                # alcachofa
    d.point((58, 56), fill=CIAN)                            # gotas
    d.point((56, 58), fill=CIAN)
    d.point((59, 59), fill=CIAN)
    d.ellipse([37, 46, 41, 50], fill=SKIN, outline=SKIN_D)  # mano
    # maceta con flores
    d.ellipse([50, 58, 62, 68], fill=(84, 160, 80), outline=(50, 105, 55))
    d.point((52, 60), fill=(120, 200, 110))
    d.point((59, 61), fill=(120, 200, 110))
    for fx, fy in ((53, 59), (58, 62), (55, 57)):
        d.point((fx, fy), fill=ROSA)
        d.point((fx + 1, fy), fill=(255, 210, 160))
    d.rectangle([49, 66, 63, 68], fill=(190, 105, 60), outline=(130, 66, 34))
    d.polygon([(50, 69), (62, 69), (60, 76), (52, 76)], fill=(190, 105, 60),
              outline=(130, 66, 34))
    # cabeza con melena y flor
    d.ellipse([19, 26, 33, 40], fill=CASTANO, outline=CASTANO_D)
    d.polygon([(19, 34), (23, 34), (21, 44)], fill=CASTANO, outline=CASTANO_D)
    d.polygon([(33, 34), (29, 34), (31, 44)], fill=CASTANO, outline=CASTANO_D)
    d.ellipse([21, 29, 31, 41], fill=SKIN, outline=SKIN_D)
    d.arc([21, 27, 31, 35], 200, 340, fill=CASTANO)         # flequillo
    d.point((24, 34), fill=OSCURO)
    d.point((28, 34), fill=OSCURO)
    d.line([(25, 38), (27, 38)], fill=SKIN_D)
    d.point((21, 28), fill=ROSA)                            # flor en el pelo
    d.point((20, 27), fill=ROSA)
    d.point((22, 27), fill=ORO_W)


def escena_vecino4(d):
    """Vecino paseando a su perrillo marrón antes de dormir."""
    fondo_ciudad(d, luna=(14, 28))
    CAZA, CAZA_D = (190, 66, 60), (128, 40, 36)
    PERRO, PERRO_D = (170, 120, 70), (115, 78, 42)
    # piernas y zapatos
    d.rectangle([27, 60, 33, 74], fill=(110, 116, 128), outline=(72, 76, 86))
    d.rectangle([35, 60, 41, 74], fill=(110, 116, 128), outline=(72, 76, 86))
    d.rectangle([25, 74, 33, 78], fill=(56, 44, 34), outline=OSCURO)
    d.rectangle([35, 74, 43, 78], fill=(56, 44, 34), outline=OSCURO)
    # chaqueta con cremallera
    d.polygon([(24, 42), (44, 42), (45, 61), (23, 61)], fill=CAZA, outline=CAZA_D)
    d.line([(34, 43), (34, 60)], fill=(230, 180, 170))
    d.point((30, 44), fill=CAZA_D)                          # cuello
    d.point((38, 44), fill=CAZA_D)
    # brazo derecho en el bolsillo
    d.polygon([(24, 44), (27, 45), (25, 55), (21, 54)], fill=CAZA, outline=CAZA_D)
    d.line([(22, 54), (26, 55)], fill=CAZA_D)               # bolsillo
    # brazo izquierdo con la correa
    d.polygon([(41, 44), (45, 45), (46, 54), (42, 55)], fill=CAZA, outline=CAZA_D)
    d.ellipse([43, 53, 47, 57], fill=SKIN, outline=SKIN_D)
    d.line([(45, 57), (50, 61)], fill=(60, 48, 34))         # correa
    d.line([(50, 61), (53, 64)], fill=(60, 48, 34))
    # perrillo
    d.line([(43, 67), (40, 62)], fill=PERRO, width=2)       # rabo alegre
    d.point((40, 61), fill=PERRO_D)
    d.ellipse([43, 66, 57, 74], fill=PERRO, outline=PERRO_D)
    d.ellipse([52, 60, 60, 68], fill=PERRO, outline=PERRO_D)
    d.polygon([(53, 59), (57, 60), (55, 64)], fill=PERRO_D) # oreja
    d.rectangle([58, 63, 61, 66], fill=PERRO_D)             # hocico
    d.point((61, 64), fill=OSCURO)
    d.point((56, 62), fill=OSCURO)                          # ojo
    d.point((60, 67), fill=ROSA)                            # lengüilla
    d.line([(53, 66), (56, 67)], fill=(200, 60, 55))        # collar
    for lx in (46, 49, 52, 55):
        d.line([(lx, 74), (lx, 77)], fill=PERRO_D)          # patas
    # cabeza del vecino
    d.ellipse([28, 28, 40, 41], fill=SKIN, outline=SKIN_D)
    d.pieslice([28, 26, 40, 34], 180, 360, fill=CASTANO_COMUN, outline=(90, 58, 30))
    d.point((31, 33), fill=OSCURO)
    d.point((37, 33), fill=OSCURO)
    d.line([(32, 37), (36, 37)], fill=SKIN_D)
    d.point((28, 34), fill=SKIN_D)                          # oreja
    d.point((40, 34), fill=SKIN_D)


def escena_vecino5(d):
    """Abuelo de boina con bastón y el periódico bajo el brazo."""
    fondo_ciudad(d, luna=(52, 27))
    CHAQ5, CHAQ5_D = (150, 116, 78), (100, 74, 46)
    BOINA, BOINA_D = (90, 64, 44), (60, 40, 26)
    # piernas y zapatos
    d.rectangle([27, 60, 33, 74], fill=(120, 104, 84), outline=(80, 68, 52))
    d.rectangle([35, 60, 41, 74], fill=(120, 104, 84), outline=(80, 68, 52))
    d.rectangle([25, 74, 33, 78], fill=OSCURO)
    d.rectangle([35, 74, 43, 78], fill=OSCURO)
    # chaqueta de pana con botones
    d.polygon([(24, 42), (44, 42), (45, 61), (23, 61)], fill=CHAQ5, outline=CHAQ5_D)
    d.point((34, 47), fill=CHAQ5_D)
    d.point((34, 52), fill=CHAQ5_D)
    d.point((34, 57), fill=CHAQ5_D)
    d.line([(29, 42), (31, 45)], fill=(70, 110, 170))       # camisa de cuadros
    d.line([(39, 42), (37, 45)], fill=(70, 110, 170))
    # periódico doblado bajo el brazo izquierdo
    d.rectangle([14, 49, 25, 56], fill=PAPEL, outline=PAPEL_D)
    d.line([(14, 52), (25, 52)], fill=PAPEL_D)
    d.line([(16, 50), (23, 50)], fill=(150, 148, 138))
    d.line([(16, 54), (21, 54)], fill=(150, 148, 138))
    d.polygon([(24, 44), (28, 45), (26, 57), (21, 56)], fill=CHAQ5, outline=CHAQ5_D)
    d.ellipse([21, 55, 25, 59], fill=SKIN, outline=SKIN_D)
    # bastón (antes que la mano)
    d.line([(45, 57), (45, 76)], fill=MADERA, width=2)
    d.arc([41, 53, 49, 60], 180, 20, fill=MADERA_D, width=2)
    d.point((45, 77), fill=OSCURO)                          # contera
    d.polygon([(41, 44), (45, 45), (46, 55), (42, 56)], fill=CHAQ5, outline=CHAQ5_D)
    d.ellipse([42, 54, 47, 59], fill=SKIN, outline=SKIN_D)
    # cabeza: nariz grande, mostacho blanco y boina
    d.ellipse([28, 28, 40, 42], fill=SKIN, outline=SKIN_D)
    d.line([(31, 34), (33, 34)], fill=GRIS)                 # cejas canosas
    d.line([(37, 34), (39, 34)], fill=GRIS)
    d.point((32, 35), fill=OSCURO)
    d.point((38, 35), fill=OSCURO)
    d.point((34, 36), fill=SKIN_D)                          # narizota
    d.point((35, 37), fill=SKIN_D)
    d.rectangle([31, 38, 38, 40], fill=HUESO, outline=HUESO_D)  # mostacho
    d.ellipse([26, 26, 42, 33], fill=BOINA, outline=BOINA_D)
    d.point((34, 25), fill=BOINA_D)                         # rabito
    d.line([(28, 31), (40, 31)], fill=BOINA_D)


CASTANO_COMUN = (130, 88, 50)


# ============================================================
#  Reverso
# ============================================================
def crear_reverso():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=7, fill=AZUL, outline=ORO_D)
    d.rounded_rectangle([2, 2, W - 3, H - 3], radius=6, outline=ORO)
    d.rounded_rectangle([4, 4, W - 5, H - 5], radius=5, outline=ORO_D)
    # patrón de ventanitas al tresbolillo
    for gy in range(9, 92, 6):
        off = 3 if (gy // 6) % 2 else 0
        for gx in range(9 + off, 63, 6):
            d.point((gx, gy), fill=(52, 66, 110))
    # abanicos de las esquinas
    for cx_, cy_, a0, a1 in ((4, 4, 0, 90), (67, 4, 90, 180),
                             (67, 95, 180, 270), (4, 95, 270, 360)):
        d.arc([cx_ - 7, cy_ - 7, cx_ + 7, cy_ + 7], a0, a1, fill=ORO_D)
        d.arc([cx_ - 4, cy_ - 4, cx_ + 4, cy_ + 4], a0, a1, fill=ORO)
    # medallón central: la ciudad duerme bajo la luna
    d.ellipse([CX - 16, 34, CX + 16, 66], fill=NOCHE, outline=ORO)
    d.ellipse([CX - 14, 36, CX + 14, 64], outline=ORO_D)
    d.ellipse([CX + 2, 39, CX + 10, 47], fill=LUNA)         # luna creciente
    d.ellipse([CX - 1, 38, CX + 6, 45], fill=NOCHE)
    d.point((CX - 8, 42), fill=ESTRELLA)
    d.point((CX - 4, 40), fill=ESTR_D)
    d.point((CX - 10, 47), fill=ESTR_D)
    d.rectangle([CX - 10, 52, CX - 6, 62], fill=EDIF, outline=EDIF_D)
    d.rectangle([CX - 5, 48, CX + 1, 62], fill=EDIF, outline=EDIF_D)
    d.rectangle([CX + 2, 54, CX + 8, 62], fill=EDIF, outline=EDIF_D)
    for vx, vy in ((CX - 8, 55), (CX - 3, 51), (CX - 3, 58), (CX + 4, 57),
                   (CX - 8, 59), (CX + 6, 60)):
        d.point((vx, vy), fill=VENTANA)
    d.line([(CX - 12, 62), (CX + 12, 62)], fill=ORO_D)
    # destellos fuera del medallón
    destello(d, 14, 20, ORO_W)
    destello(d, 57, 20, ORO_W)
    destello(d, 14, 80, ORO_W)
    destello(d, 57, 80, ORO_W)
    return img


# ============================================================
#  Generación
# ============================================================
CARTAS = [
    ("buitre",       "buitres",       ["FONDO BUITRE"],              escena_buitre),
    ("plataforma",   "buitres",       ["PLATAFORMA", "VACACIONAL"],  escena_plataforma),
    ("hacienda",     "vecinos",       ["HACIENDA"],                  escena_hacienda),
    ("sindicato",    "vecinos",       ["SINDICATO", "DE VIVIENDA"],  escena_sindicato),
    ("okupa",        "vecinos",       ["EL OKUPA"],                  escena_okupa),
    ("tasador",      "vecinos",       ["EL TASADOR"],                escena_tasador),
    ("inmobiliaria", "vecinos",       ["INMOBILIARIA"],              escena_inmobiliaria),
    ("influencer",   "independiente", ["INFLUENCER"],                escena_influencer),
    ("vecino-1",     "vecinos",       ["VECINA"],                    escena_vecino1),
    ("vecino-2",     "vecinos",       ["VECINO"],                    escena_vecino2),
    ("vecino-3",     "vecinos",       ["VECINA"],                    escena_vecino3),
    ("vecino-4",     "vecinos",       ["VECINO"],                    escena_vecino4),
    ("vecino-5",     "vecinos",       ["VECINO"],                    escena_vecino5),
]


def main():
    finales = {}
    for nombre, bando, lineas, escena in CARTAS:
        img, d = base_carta(bando)
        escena(d)
        rotular(d, lineas, bando)
        grande = img.resize((W * SCALE, H * SCALE), Image.NEAREST)
        grande.save(os.path.join(SALIDA, f"{nombre}.png"))
        finales[nombre] = grande

    reverso = crear_reverso().resize((W * SCALE, H * SCALE), Image.NEAREST)
    reverso.save(os.path.join(SALIDA, "reverso.png"))
    finales["reverso"] = reverso

    # hoja de contacto para revisión
    mini_w, mini_h = W * 2, H * 2
    gap = 6
    cols = 7
    filas = 2
    hoja = Image.new("RGB", (cols * (mini_w + gap) + gap,
                             filas * (mini_h + gap) + gap), (25, 25, 30))
    for i, nombre in enumerate(list(finales.keys())):
        mini = finales[nombre].resize((mini_w, mini_h), Image.NEAREST)
        c, f = i % cols, i // cols
        hoja.paste(mini, (gap + c * (mini_w + gap), gap + f * (mini_h + gap)), mini)
    hoja.save(os.path.join(SALIDA, "_contacto.png"))
    print(f"Generadas {len(CARTAS)} cartas + reverso en {SALIDA}")


if __name__ == "__main__":
    main()
