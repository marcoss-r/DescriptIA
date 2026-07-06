"""Genera en pixel art el reverso y las 40 cartas de la baraja española.

Basado en la baraja de Fournier (oros, copas, espadas, bastos; As-7 + Sota,
Caballo, Rey). Ases grandes y macizos pero sencillos; figuras cargadas y con
degradado de color; símbolos con sombreado. Las figuras se etiquetan J/Q/K.

Técnica pixel art: se dibuja en una rejilla pequeña (BASE_W x BASE_H) con
primitivas de Pillow y se amplía con vecino más cercano (NEAREST).

Uso:  python img/cartas/generar_cartas.py
Salida:  img/cartas/<palo>-<valor>.png , reverso.png y _contacto.png (revisión)
"""

import os
from PIL import Image, ImageDraw

SALIDA = os.path.dirname(os.path.abspath(__file__))

BASE_W, BASE_H = 54, 75
SCALE = 6  # 324 x 450

# --- Paleta ---
CREMA   = (240, 230, 200)
GOLD    = (238, 192, 66);  GOLD_D = (170, 120, 20);  GOLD_W = (255, 240, 180)
RED     = (196, 58, 58);   RED_D  = (140, 34, 34);   RED_L  = (226, 112, 112)
STEEL   = (150, 170, 205); STEEL_D = (70, 92, 135);  STEEL_L = (208, 224, 246)
WOOD    = (158, 110, 58);  WOOD_D = (104, 68, 30);   WOOD_L = (192, 150, 94)
CUERO   = (112, 74, 42)
SKIN    = (240, 205, 160); SKIN_D = (200, 150, 110)
PELO    = (150, 120, 88)
BLANCO  = (255, 255, 255)
AZUL    = (33, 54, 110)
OSCURO  = (45, 35, 30)
BARBA   = (232, 232, 232)

MARCO = {
    "oros":    (200, 150, 30),
    "copas":   (185, 55, 55),
    "espadas": (70, 100, 160),
    "bastos":  (95, 140, 70),
}


def oscurecer(c, f=0.7):
    return tuple(int(v * f) for v in c)


def aclarar(c, f=0.35):
    return tuple(int(v + (255 - v) * f) for v in c)


# ============================================================
#  Fuente 3x5 para los índices de las esquinas
# ============================================================
FUENTE = {
    "1": ["..#", ".##", "..#", "..#", ".##"],
    "2": ["###", "..#", "###", "#..", "###"],
    "3": ["###", "..#", "###", "..#", "###"],
    "4": ["#.#", "#.#", "###", "..#", "..#"],
    "5": ["###", "#..", "###", "..#", "###"],
    "6": ["###", "#..", "###", "#.#", "###"],
    "7": ["###", "..#", "..#", ".#.", ".#."],
    "J": ["###", "..#", "..#", "#.#", ".#."],
    "Q": ["###", "#.#", "#.#", "###", "..#"],
    "K": ["#.#", "#.#", "##.", "#.#", "#.#"],
}


def indice(d, ch, x, y, color, girado=False):
    filas = FUENTE[ch]
    if girado:
        filas = [f[::-1] for f in filas[::-1]]
    for gy, fila in enumerate(filas):
        for gx, c in enumerate(fila):
            if c == "#":
                d.point((x + gx, y + gy), fill=color)


# ============================================================
#  Símbolos de palo (grosor proporcional a r; con sombreado)
# ============================================================
def sb_oros(d, cx, cy, r):
    """Moneda de oro: disco con canto fino, grabado central y destello."""
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD, outline=GOLD_D, width=1)
    # sombra curva abajo-derecha (le da volumen de moneda)
    d.arc([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 15, 125,
          fill=GOLD_D, width=max(1, r // 5))
    # grabado central: rombo
    rr = max(1, int(r * 0.4))
    d.polygon([(cx, cy - rr), (cx + rr, cy), (cx, cy + rr), (cx - rr, cy)],
              outline=GOLD_D)
    if r >= 10:
        # en el as: anillo interior y gema en el rombo
        ir = int(r * 0.7)
        d.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], outline=GOLD_D)
        d.point((cx, cy), fill=GOLD_W)
    # destello arriba-izquierda
    d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 195, 250,
          fill=GOLD_W, width=max(1, r // 6))
    d.point((cx - r // 2, cy - r // 2), fill=BLANCO)


def sb_copas(d, cx, cy, r):
    w = max(1, r // 5)
    rim = max(2, r // 2)
    pie = max(2, r // 3)
    d.ellipse([cx - r, cy - r, cx + r, cy - r + rim], fill=RED, outline=RED_D, width=w)
    d.polygon([(cx - r, cy - r + rim // 2), (cx + r, cy - r + rim // 2),
               (cx + pie, cy + 2), (cx - pie, cy + 2)], fill=RED, outline=RED_D)
    d.line([(cx - r + 2, cy - r + rim), (cx - pie + 1, cy + 1)], fill=RED_L, width=max(1, w))  # brillo
    st = max(1, r // 4)
    d.rectangle([cx - st, cy + 2, cx + st, cy + r - pie], fill=RED_D)
    d.rectangle([cx - r + 2, cy + r - pie, cx + r - 2, cy + r], fill=RED, outline=RED_D)


def espada_as(d, cx, cy, r):
    """Espada vertical grande, solo para el as (diseño original)."""
    bw = max(1, r // 6)                 # media anchura de hoja (fina)
    gl = max(2, int(r * 0.34))          # empuñadura (ni corta ni larga)
    pomo = cy + r
    grip_top = pomo - gl
    gh = max(1, r // 8)                 # guarda fina de alto
    guarda_y = grip_top - gh
    gw = max(3, int(r * 0.4))           # guarda más ancha que la hoja, sin pasarse
    # hoja larga con punta
    d.polygon([(cx, cy - r), (cx + bw + 1, cy - r + 5), (cx + bw + 1, guarda_y),
               (cx - bw - 1, guarda_y), (cx - bw - 1, cy - r + 5)], fill=STEEL, outline=STEEL_D)
    d.line([(cx, cy - r + 4), (cx, guarda_y - 1)], fill=STEEL_L, width=max(1, bw))  # brillo/gradiente
    d.rectangle([cx - gw, guarda_y, cx + gw, grip_top - 1], fill=GOLD, outline=GOLD_D)  # guarda
    d.rectangle([cx - bw, grip_top, cx + bw, pomo - 2], fill=CUERO, outline=OSCURO)     # mango
    d.ellipse([cx - bw - 1, pomo - 3, cx + bw + 2, pomo], fill=GOLD, outline=GOLD_D)    # pomo


def sb_espadas(d, cx, cy, r, flip=False):
    """Espada en diagonal con punta arriba y mango proporcionado.

    flip=True la inclina hacia el otro lado (para espejar por columnas).
    Los extremos quedan 1px dentro de la caja para no rozar pips vecinos.
    """
    s = -1 if flip else 1
    px_, py_ = cx - s * (r - 1), cy + r - 1     # pomo (abajo)
    tx_, ty_ = cx + s * r, cy - r               # punta (hasta la esquina)
    g = max(3, int(r * 0.5))                    # largo del mango
    gx_, gy_ = px_ + s * g, py_ - g             # cruce de la guarda
    bw = max(2, r // 3)                         # grosor de hoja
    # hoja: borde oscuro debajo, acero encima y filo brillante
    d.line([(gx_ + s, gy_ - 1), (tx_, ty_)], fill=STEEL_D, width=bw + 1)
    d.line([(gx_ + s, gy_ - 1), (tx_, ty_)], fill=STEEL, width=bw)
    d.line([(gx_, gy_ - 2), (tx_ - s, ty_ + 1)], fill=STEEL_L, width=1)
    d.point((tx_, ty_), fill=STEEL_L)
    # guarda dorada perpendicular a la hoja
    k = max(2, r // 3)
    d.line([(gx_ - k, gy_ - s * k), (gx_ + k, gy_ + s * k)], fill=GOLD, width=2)
    # mango de cuero y pomo dorado
    d.line([(px_, py_), (gx_ - s, gy_ + 1)], fill=CUERO, width=max(2, bw))
    d.ellipse([px_ - 1, py_ - 1, px_ + 1, py_ + 1], fill=GOLD, outline=GOLD_D)


def sb_bastos(d, cx, cy, r):
    """Basto clásico (tipo Fournier): garrote de madera grueso arriba que
    afina hacia abajo, con nudos laterales. Sin pinchos."""
    tw = max(2, int(r * 0.5))                # media anchura de la cabeza
    bw = max(1, r // 5)                      # media anchura del puño
    top = cy - r + tw                        # centro de la cabeza redondeada
    fondo = cy + r - 1
    # cuerpo que se estrecha
    d.polygon([(cx - tw, top), (cx + tw, top), (cx + bw, fondo), (cx - bw, fondo)],
              fill=WOOD, outline=WOOD_D)
    # cabeza redondeada
    d.ellipse([cx - tw, cy - r, cx + tw, top + tw], fill=WOOD, outline=WOOD_D)
    # brillo y sombra solo si hay sitio (a tamaño pip meten ruido)
    if r >= 8:
        d.line([(cx - tw + 1, top), (cx - bw, fondo - 1)], fill=WOOD_L)
        d.line([(cx + tw - 1, top + 1), (cx + bw, fondo - 1)], fill=WOOD_D)
    d.point((cx - 1, cy - r + 1), fill=WOOD_L)
    # puño marcado abajo
    d.line([(cx - bw, fondo - 1), (cx + bw, fondo - 1)], fill=WOOD_D)


def basto_as(d, cx, cy, r):
    """As de bastos: garrote nudoso clásico, panzudo arriba y con puño fino."""
    hb = max(2, r // 6)                       # media anchura del puño
    # silueta: puño fino abajo, panza arriba, punta redondeada
    contorno = [
        (cx - hb, cy + r),                    # puño izq
        (cx - hb, cy + int(r * 0.45)),
        (cx - int(r * 0.38), cy),             # panza izq
        (cx - int(r * 0.45), cy - int(r * 0.5)),
        (cx - int(r * 0.28), cy - r + 2),     # hombro izq
        (cx, cy - r),                         # punta
        (cx + int(r * 0.28), cy - r + 2),     # hombro der
        (cx + int(r * 0.45), cy - int(r * 0.5)),
        (cx + int(r * 0.38), cy),             # panza der
        (cx + hb, cy + int(r * 0.45)),
        (cx + hb, cy + r),                    # puño der
    ]
    d.polygon(contorno, fill=WOOD, outline=WOOD_D)
    # sombra del lado derecho (volumen)
    d.polygon([(cx + 1, cy - r + 2), (cx + int(r * 0.28), cy - r + 2),
               (cx + int(r * 0.45), cy - int(r * 0.5)), (cx + int(r * 0.38), cy),
               (cx + hb, cy + int(r * 0.45)), (cx + hb, cy + r - 1),
               (cx + 1, cy + r - 1)], fill=WOOD_D)
    d.polygon([(cx + 1, cy - r + 3), (cx + int(r * 0.2), cy - r + 3),
               (cx + int(r * 0.3), cy - int(r * 0.5)), (cx + int(r * 0.24), cy),
               (cx + 1, cy + int(r * 0.4))], fill=WOOD)
    # brillo del lado izquierdo
    d.line([(cx - int(r * 0.3), cy - int(r * 0.55)), (cx - int(r * 0.25), cy - 1)],
           fill=WOOD_L, width=max(1, r // 8))
    d.line([(cx - hb + 1, cy + int(r * 0.5)), (cx - hb + 1, cy + r - 2)], fill=WOOD_L)
    # nudos redondos que sobresalen del contorno
    nr = max(1, r // 8)
    nudos = [(-int(r * 0.45), -int(r * 0.5)), (int(r * 0.45), -int(r * 0.5)),
             (-int(r * 0.4), int(r * 0.05)), (int(r * 0.4), int(r * 0.05)),
             (-int(r * 0.36), -int(r * 0.78)), (int(r * 0.36), -int(r * 0.78))]
    for nx_, ny_ in nudos:
        d.ellipse([cx + nx_ - nr, cy + ny_ - nr, cx + nx_ + nr, cy + ny_ + nr],
                  fill=WOOD, outline=WOOD_D)
        d.point((cx + nx_, cy + ny_ - 1), fill=WOOD_L)
        d.point((cx + nx_, cy + ny_), fill=WOOD_D)
    # veta corta de la madera
    d.line([(cx - int(r * 0.15), cy - int(r * 0.45)), (cx - int(r * 0.15), cy - int(r * 0.15))], fill=WOOD_D)
    # remate del puño
    d.rectangle([cx - hb - 1, cy + r - 2, cx + hb + 1, cy + r], fill=WOOD, outline=WOOD_D)


def copa_as(d, cx, cy, r):
    """As de copas: cáliz ROJO con incrustaciones doradas y buenos reflejos."""
    rim = max(3, int(r * 0.38))              # alto de la boca elíptica
    boca_t = cy - r
    mitad = boca_t + rim // 2                # altura máxima de anchura del cuenco
    cuenco_f = cy + r // 5                   # fin del cuenco
    # cuenco rojo redondeado (media elipse)
    caja = [cx - r, 2 * mitad - cuenco_f, cx + r, cuenco_f]
    d.pieslice(caja, 0, 180, fill=RED, outline=RED_D)
    # sombra curva a la derecha y reflejo alargado a la izquierda
    d.arc([caja[0] + 2, caja[1] + 2, caja[2] - 2, caja[3] - 2], 15, 80,
          fill=RED_D, width=max(2, r // 4))
    d.arc([caja[0] + 3, caja[1] + 3, caja[2] - 3, caja[3] - 3], 110, 155,
          fill=RED_L, width=max(1, r // 6))
    d.line([(cx - int(r * 0.55), boca_t + rim + 1),
            (cx - int(r * 0.45), boca_t + rim + r // 4)], fill=BLANCO)  # destello
    # boca: interior rojo oscuro con doble labio dorado
    d.ellipse([cx - r, boca_t, cx + r, boca_t + rim], fill=RED_D, outline=GOLD_D)
    d.ellipse([cx - r + 1, boca_t + 1, cx + r - 1, boca_t + rim - 1], outline=GOLD)
    d.point((cx - r // 2, boca_t + 1), fill=GOLD_W)  # brillo del labio
    # banda dorada con gemas incrustadas siguiendo la curva del cuenco
    by = mitad + (cuenco_f - mitad) // 3
    t_ = (by - mitad) / max(1, cuenco_f - mitad)
    hb = int(r * (1 - t_ * t_) ** 0.5) - 1
    d.line([(cx - hb, by), (cx + hb, by)], fill=GOLD, width=2)
    d.line([(cx - hb, by + 1), (cx + hb, by + 1)], fill=GOLD_D)
    for gx_, gema in ((-hb // 2, GOLD_W), (0, (80, 140, 220)), (hb // 2, GOLD_W)):
        d.point((cx + gx_, by), fill=gema)
    # incrustación: rombo dorado bajo la banda
    ry = by + max(2, r // 5)
    d.polygon([(cx, ry - 2), (cx + 2, ry), (cx, ry + 2), (cx - 2, ry)],
              fill=GOLD, outline=GOLD_D)
    d.point((cx, ry), fill=GOLD_W)
    # nudo dorado con gema roja
    ny = cuenco_f + max(2, r // 6)
    d.ellipse([cx - r // 4, ny - r // 5, cx + r // 4, ny + r // 5],
              fill=GOLD, outline=GOLD_D)
    d.point((cx, ny), fill=RED)
    # vástago rojo con anillo dorado
    st = max(1, r // 8)
    base_t = cy + r - max(2, r // 4)
    d.rectangle([cx - st, ny + r // 5, cx + st, base_t], fill=RED, outline=RED_D)
    d.line([(cx - st, (ny + base_t) // 2), (cx + st, (ny + base_t) // 2)], fill=GOLD)
    # base roja con filo dorado y reflejo
    d.polygon([(cx - r + 1, cy + r), (cx + r - 1, cy + r),
               (cx + r // 2, base_t), (cx - r // 2, base_t)], fill=RED, outline=RED_D)
    d.polygon([(cx + r // 4, base_t + 1), (cx + r // 2 - 1, base_t + 1),
               (cx + r - 2, cy + r - 1), (cx + r // 2, cy + r - 1)], fill=RED_D)
    d.line([(cx - r // 2 + 1, base_t + 1), (cx - r + 3, cy + r - 1)], fill=RED_L)
    d.line([(cx - r + 2, cy + r), (cx + r - 2, cy + r)], fill=GOLD)
    d.point((cx - r + 2, cy + r), fill=GOLD_D)
    d.point((cx + r - 2, cy + r), fill=GOLD_D)


SIMBOLO = {"oros": sb_oros, "copas": sb_copas, "espadas": sb_espadas, "bastos": sb_bastos}

# Centros de los pips (radio 5 → cajas de 11px). Columnas en x=16/38 y filas
# separadas para que ningún símbolo toque a otro (huecos >= 1px entre cajas).
DISPOSICION = {
    2: [(27, 22), (27, 54)],
    3: [(27, 17), (27, 38), (27, 59)],
    4: [(16, 22), (38, 22), (16, 54), (38, 54)],
    5: [(16, 20), (38, 20), (27, 38), (16, 56), (38, 56)],
    6: [(16, 18), (38, 18), (16, 38), (38, 38), (16, 58), (38, 58)],
    7: [(16, 18), (38, 18), (27, 28), (16, 38), (38, 38), (16, 58), (38, 58)],
}


# ============================================================
#  Figuras (Sota=J, Caballo=Q, Rey=K) — cargadas y con degradado
# ============================================================
def manto(d, pts, robe):
    """Trapecio de manto con sombra a la derecha y brillo a la izquierda."""
    robe_d = oscurecer(robe)
    robe_l = aclarar(robe)
    (x0, y0), (x1, _), (x2, y2), (x3, _) = pts
    d.polygon(pts, fill=robe, outline=robe_d)
    cxm = (x0 + x1) // 2
    d.polygon([(cxm, y0), (x1, y0), (x2, y2), ((x2 + x3) // 2, y2)], fill=robe_d)   # sombra
    d.polygon([(x0, y0), (x0 + 2, y0), (x3 + 2, y2), (x3, y2)], fill=robe_l)        # brillo


def cara(d, cx, top):
    """Cabeza con cuello, pelo y ojos. Devuelve y de la coronilla."""
    d.rectangle([cx - 2, top - 2, cx + 2, top + 1], fill=SKIN, outline=SKIN_D)      # cuello
    d.ellipse([cx - 5, top - 10, cx + 5, top], fill=SKIN, outline=SKIN_D)           # cabeza
    d.polygon([(cx - 5, top - 6), (cx - 6, top - 1), (cx - 3, top - 2)], fill=PELO) # patilla izq
    d.polygon([(cx + 5, top - 6), (cx + 6, top - 1), (cx + 3, top - 2)], fill=PELO) # patilla der
    d.point((cx - 2, top - 5), fill=OSCURO)
    d.point((cx + 2, top - 5), fill=OSCURO)
    return top - 10


def simbolo_en_mano(d, palo, hx, hy):
    """Dibuja el símbolo del palo (versión de as, pequeña) sujeto por una mano
    en (hx, hy). Llamar ANTES de dibujar la mano para que esta lo agarre."""
    if palo == "espadas":
        espada_as(d, hx, hy - 6, 8)       # el puño queda dentro de la mano
    elif palo == "bastos":
        basto_as(d, hx, hy - 6, 8)
    elif palo == "copas":
        copa_as(d, hx, hy - 5, 6)         # se sujeta por el pie
    else:
        sb_oros(d, hx, hy - 7, 5)         # moneda en alto sobre la palma


def dibujar_rey(d, palo):
    robe = MARCO[palo]
    robe_d = oscurecer(robe)
    robe_l = aclarar(robe)
    manto(d, [(16, 27), (38, 27), (42, 64), (12, 64)], robe)
    # motas decorativas del manto
    for mx, my in ((19, 34), (21, 44), (18, 54), (35, 34), (33, 44), (36, 54)):
        d.point((mx, my), fill=robe_l)
        d.point((mx + 1, my + 1), fill=robe_l)
    # orla inferior dorada con brillo
    d.rectangle([12, 61, 42, 64], fill=GOLD, outline=GOLD_D)
    d.line([(14, 62), (40, 62)], fill=GOLD_W)
    # banda central de armiño con motas negras y broche
    d.rectangle([24, 30, 30, 60], fill=BLANCO, outline=(200, 200, 190))
    for my in range(33, 59, 6):
        d.point((26, my), fill=OSCURO)
        d.point((28, my + 3), fill=OSCURO)
    d.ellipse([25, 28, 29, 32], fill=GOLD, outline=GOLD_D)
    d.point((27, 30), fill=RED)
    # brazos con puños dorados
    d.polygon([(16, 28), (22, 28), (20, 47), (14, 45)], fill=robe, outline=robe_d)
    d.polygon([(32, 28), (38, 28), (41, 45), (35, 47)], fill=robe, outline=robe_d)
    d.line([(14, 44), (19, 46)], fill=GOLD, width=2)
    d.line([(35, 46), (40, 44)], fill=GOLD, width=2)
    # el rey empuña el símbolo de su palo (mano izquierda)
    simbolo_en_mano(d, palo, 14, 45)
    d.ellipse([12, 43, 17, 48], fill=SKIN, outline=SKIN_D)
    # cetro dorado con remate en la derecha
    d.line([(38, 31), (38, 46)], fill=GOLD, width=2)
    d.ellipse([36, 26, 41, 31], fill=GOLD, outline=GOLD_D)
    d.point((38, 27), fill=GOLD_W)
    d.ellipse([35, 43, 40, 48], fill=SKIN, outline=SKIN_D)
    coronilla = cara(d, 27, 25)
    d.polygon([(23, 22), (31, 22), (29, 30), (25, 30)], fill=BARBA, outline=SKIN_D)  # barba
    # corona: aro con gemas y tres puntas rematadas en perlas
    d.rectangle([21, coronilla - 3, 33, coronilla + 2], fill=GOLD, outline=GOLD_D)
    d.point((23, coronilla), fill=RED)
    d.point((27, coronilla), fill=(80, 140, 220))
    d.point((31, coronilla), fill=RED)
    d.polygon([(21, coronilla - 2), (23, coronilla - 8), (25, coronilla - 2)], fill=GOLD, outline=GOLD_D)
    d.polygon([(25, coronilla - 2), (27, coronilla - 10), (29, coronilla - 2)], fill=GOLD, outline=GOLD_D)
    d.polygon([(29, coronilla - 2), (31, coronilla - 8), (33, coronilla - 2)], fill=GOLD, outline=GOLD_D)
    d.point((23, coronilla - 8), fill=GOLD_W)
    d.point((27, coronilla - 10), fill=GOLD_W)
    d.point((31, coronilla - 8), fill=GOLD_W)


def dibujar_sota(d, palo):
    robe = MARCO[palo]
    robe_d = oscurecer(robe)
    robe_l = aclarar(robe)
    # piernas con calzas bicolor (moda medieval) + zapatos puntiagudos
    d.rectangle([21, 50, 25, 62], fill=robe_l, outline=robe_d)
    d.rectangle([29, 50, 33, 62], fill=robe_d)
    d.polygon([(17, 63), (25, 63), (25, 66), (17, 66)], fill=OSCURO)
    d.polygon([(29, 63), (37, 63), (37, 66), (29, 66)], fill=OSCURO)
    # túnica con vuelo y orla dorada en el bajo
    manto(d, [(19, 29), (35, 29), (38, 52), (16, 52)], robe)
    d.line([(17, 51), (37, 51)], fill=GOLD)
    # motas decorativas
    for mx, my in ((22, 34), (30, 36), (25, 41), (33, 43), (20, 44)):
        d.point((mx, my), fill=robe_l)
    # cinturón con hebilla
    d.rectangle([16, 46, 38, 49], fill=GOLD, outline=GOLD_D)
    d.rectangle([26, 46, 28, 49], fill=GOLD_D)
    d.point((27, 47), fill=GOLD_W)
    # hombreras
    d.ellipse([17, 27, 23, 32], fill=robe_d)
    d.ellipse([31, 27, 37, 32], fill=robe_d)
    # cordón del pecho
    d.line([(26, 31), (26, 40)], fill=GOLD_D)
    d.point((26, 33), fill=GOLD)
    d.point((26, 36), fill=GOLD)
    d.point((26, 39), fill=GOLD)
    # brazo izquierdo en jarras y derecho en alto
    d.polygon([(19, 30), (23, 30), (21, 43), (17, 41)], fill=robe, outline=robe_d)
    d.ellipse([16, 40, 20, 44], fill=SKIN, outline=SKIN_D)     # mano en la cadera
    d.polygon([(32, 30), (36, 31), (40, 24), (37, 22)], fill=robe, outline=robe_d)
    d.line([(36, 30), (39, 25)], fill=GOLD)                    # puño dorado
    # la sota empuña el símbolo de su palo en alto
    simbolo_en_mano(d, palo, 40, 21)
    d.ellipse([38, 19, 42, 23], fill=SKIN, outline=SKIN_D)     # mano
    coronilla = cara(d, 27, 27)
    d.polygon([(22, 30), (32, 30), (30, 27), (24, 27)], fill=BARBA)  # gorguera
    # gorra con pluma roja
    d.polygon([(21, coronilla + 1), (31, coronilla + 1), (30, coronilla - 5), (22, coronilla - 4)],
              fill=robe, outline=robe_d)
    d.line([(22, coronilla - 1), (30, coronilla - 2)], fill=robe_l)
    d.line([(30, coronilla - 4), (36, coronilla - 9)], fill=RED, width=2)
    d.point((36, coronilla - 9), fill=RED_L)


def dibujar_caballo(d, palo):
    robe = MARCO[palo]
    robe_d = oscurecer(robe)
    crin = oscurecer(WOOD, 0.5)
    # ---- Caballo de perfil, mirando a la derecha ----
    # cola con mechones
    d.polygon([(12, 44), (8, 48), (7, 58), (10, 57), (13, 50)], fill=WOOD_D)
    d.line([(10, 49), (9, 56)], fill=WOOD)
    # patas lejanas (en sombra)
    d.polygon([(15, 52), (18, 52), (17, 63), (14, 63)], fill=WOOD_D)
    d.polygon([(30, 52), (33, 52), (32, 63), (29, 63)], fill=WOOD_D)
    d.rectangle([14, 61, 17, 63], fill=OSCURO)
    d.rectangle([29, 61, 32, 63], fill=OSCURO)
    # cuerpo
    d.ellipse([11, 41, 37, 56], fill=WOOD, outline=WOOD_D)
    d.arc([13, 43, 33, 54], 160, 250, fill=WOOD_L, width=2)     # brillo del lomo
    # patas cercanas con pezuñas
    d.polygon([(17, 53), (21, 53), (20, 64), (16, 64)], fill=WOOD, outline=WOOD_D)
    d.polygon([(31, 53), (35, 53), (36, 64), (32, 64)], fill=WOOD, outline=WOOD_D)
    d.rectangle([16, 62, 20, 64], fill=OSCURO)
    d.rectangle([32, 62, 36, 64], fill=OSCURO)
    # cuello arqueado y cabeza
    d.polygon([(30, 46), (34, 32), (41, 34), (37, 48)], fill=WOOD, outline=WOOD_D)
    d.polygon([(35, 30), (44, 33), (46, 38), (40, 39), (35, 35)], fill=WOOD, outline=WOOD_D)
    # orejas
    d.polygon([(36, 30), (37, 26), (39, 30)], fill=WOOD, outline=WOOD_D)
    d.polygon([(40, 30), (41, 27), (42, 31)], fill=WOOD_D)
    # crin a mechones por el borde del cuello
    d.polygon([(34, 30), (31, 33), (34, 35), (30, 38), (33, 40), (29, 43), (31, 46), (34, 33)],
              fill=crin)
    d.line([(35, 30), (34, 35)], fill=crin, width=2)
    # hocico, ollar, boca y ojo
    d.rectangle([44, 35, 46, 38], fill=WOOD_D)
    d.point((45, 36), fill=OSCURO)                              # ollar
    d.line([(44, 38), (46, 38)], fill=OSCURO)                   # boca
    d.point((39, 33), fill=OSCURO)                              # ojo
    d.point((39, 32), fill=BLANCO)
    # brida
    d.line([(44, 35), (40, 32)], fill=OSCURO)
    # silla con manta del color del palo y cincha
    d.rectangle([19, 42, 30, 50], fill=robe, outline=robe_d)
    d.line([(19, 49), (30, 49)], fill=GOLD)
    d.line([(24, 50), (24, 56)], fill=robe_d)                   # cincha
    # ---- Jinete ----
    # pierna con bota y estribo
    d.polygon([(23, 44), (27, 44), (27, 53), (24, 53)], fill=robe_d)
    d.polygon([(23, 53), (27, 53), (28, 57), (22, 57)], fill=OSCURO)
    d.point((25, 57), fill=GOLD)                                # estribo
    # torso
    manto(d, [(19, 28), (30, 28), (31, 44), (18, 44)], robe)
    d.line([(19, 42), (30, 42)], fill=GOLD)                     # cinturón
    # brazo izquierdo con las riendas
    d.polygon([(20, 31), (24, 31), (32, 35), (30, 38)], fill=robe, outline=robe_d)
    d.line([(44, 36), (32, 36)], fill=OSCURO)                   # rienda
    d.ellipse([30, 34, 34, 38], fill=SKIN, outline=SKIN_D)      # mano
    # cabeza con gorro y penacho
    coronilla = cara(d, 24, 28)
    d.polygon([(19, coronilla + 1), (29, coronilla + 1), (28, coronilla - 4), (20, coronilla - 4)],
              fill=robe, outline=robe_d)
    d.line([(28, coronilla - 3), (33, coronilla - 7)], fill=RED, width=2)
    # brazo derecho en alto empuñando el símbolo del palo
    d.polygon([(27, 30), (31, 30), (37, 24), (34, 22)], fill=robe, outline=robe_d)
    d.line([(34, 25), (36, 23)], fill=GOLD)                     # puño dorado
    simbolo_en_mano(d, palo, 36, 21)
    d.ellipse([34, 19, 38, 23], fill=SKIN, outline=SKIN_D)      # mano


FIGURA = {"sota": dibujar_sota, "caballo": dibujar_caballo, "rey": dibujar_rey}
ETIQUETA_FIG = {"sota": "J", "caballo": "Q", "rey": "K"}


# ============================================================
#  Composición de una carta
# ============================================================
def carta_base(palo):
    img = Image.new("RGBA", (BASE_W, BASE_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    marco = MARCO[palo]
    d.rounded_rectangle([0, 0, BASE_W - 1, BASE_H - 1], radius=5, fill=CREMA, outline=marco, width=1)
    d.rounded_rectangle([3, 3, BASE_W - 4, BASE_H - 4], radius=4, outline=marco, width=1)
    return img, d


def dibujar_indices(d, etiqueta, palo):
    color = MARCO[palo]
    indice(d, etiqueta, 5, 6, color)
    indice(d, etiqueta, BASE_W - 8, BASE_H - 11, color, girado=True)


def crear_carta(palo, valor):
    img, d = carta_base(palo)
    if valor == 1:
        if palo == "copas":
            copa_as(d, 27, 38, 16)            # As de copas: cáliz rojo con oro
        elif palo == "espadas":
            espada_as(d, 27, 38, 16)          # As de espadas: vertical clásico
        elif palo == "bastos":
            basto_as(d, 27, 38, 17)           # As de bastos: garrote nudoso
        else:
            SIMBOLO[palo](d, 27, 38, 16)      # As grande y macizo
        etiqueta = "1"
    elif valor in DISPOSICION:
        for (x, y) in DISPOSICION[valor]:
            if palo == "espadas":
                # espejadas por columna: las de la izquierda miran a un lado
                sb_espadas(d, x, y, 5, flip=(x < BASE_W // 2))
            else:
                SIMBOLO[palo](d, x, y, 5)
        etiqueta = str(valor)
    else:
        FIGURA[valor](d, palo)
        etiqueta = ETIQUETA_FIG[valor]
    dibujar_indices(d, etiqueta, palo)
    return img


def crear_reverso():
    img = Image.new("RGBA", (BASE_W, BASE_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, BASE_W - 1, BASE_H - 1], radius=5, fill=BLANCO)
    d.rounded_rectangle([3, 3, BASE_W - 4, BASE_H - 4], radius=4, fill=AZUL)
    for gy in range(9, BASE_H - 6, 8):
        desfase = 4 if (gy // 8) % 2 else 0
        for gx in range(8 + desfase, BASE_W - 6, 8):
            for (dx, dy) in [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)]:
                d.point((gx + dx, gy + dy), fill=BLANCO)
    return img


# ============================================================
#  Generación
# ============================================================
def escalar(img):
    return img.resize((BASE_W * SCALE, BASE_H * SCALE), Image.NEAREST)


def main():
    palos = ["oros", "copas", "espadas", "bastos"]
    valores = [1, 2, 3, 4, 5, 6, 7, "sota", "caballo", "rey"]
    generadas = {}

    escalar(crear_reverso()).save(os.path.join(SALIDA, "reverso.png"))

    for palo in palos:
        for valor in valores:
            img = escalar(crear_carta(palo, valor))
            img.save(os.path.join(SALIDA, f"{palo}-{valor}.png"))
            generadas[f"{palo}-{valor}.png"] = img

    mini_w, mini_h = 96, 133
    gap = 6
    cols, filas = 10, 4
    hoja = Image.new("RGB", (cols * (mini_w + gap) + gap, filas * (mini_h + gap) + gap), (25, 25, 30))
    for r, palo in enumerate(palos):
        for c, valor in enumerate(valores):
            mini = generadas[f"{palo}-{valor}.png"].resize((mini_w, mini_h), Image.NEAREST)
            hoja.paste(mini, (gap + c * (mini_w + gap), gap + r * (mini_h + gap)))
    hoja.save(os.path.join(SALIDA, "_contacto.png"))

    print(f"Generadas {len(generadas)} cartas + reverso en {SALIDA}")


if __name__ == "__main__":
    main()
