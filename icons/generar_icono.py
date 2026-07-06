"""Genera los iconos de la app FIEsta (icon-512/192/180.png) con Pillow.

Dibuja el mismo motivo que el logo SVG de la pantalla principal:
planeta (espacio) + órbita con electrón (física) + estrellas de 4 puntas (fiesta).

Se dibuja en un lienzo grande (supersampling) y se reduce con LANCZOS para
que los bordes queden suaves. Uso:  python icons/generar_icono.py
"""

import os
import math
from PIL import Image, ImageDraw

# --- Ajustes generales ---
S = 2048  # lado del lienzo maestro (se reduce al final)
SALIDA = os.path.dirname(os.path.abspath(__file__))

# --- Paleta (mismos tonos que css/estilos.css) ---
FONDO_TOP = (11, 17, 32)     # #0b1120
FONDO_BOT = (26, 37, 64)     # #1a2540
PLANETA   = (76, 125, 255)   # #4c7dff
BRILLO    = (111, 151, 255)  # #6f97ff
ORBITA    = (160, 107, 255)  # #a06bff
ELECTRON  = (232, 237, 249)  # #e8edf9
ORO       = (255, 206, 84)   # #ffce54
BLANCO    = (255, 255, 255)


def lerp(a, b, t):
    """Interpola dos colores RGB (t entre 0 y 1)."""
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def estrella(draw, cx, cy, r, color):
    """Estrella de 4 puntas: 4 puntas largas + 4 vértices interiores cortos."""
    k = 0.32  # cuánto se "hunden" los lados (radio interior relativo)
    pts = [
        (cx, cy - r), (cx + k * r, cy - k * r),
        (cx + r, cy), (cx + k * r, cy + k * r),
        (cx, cy + r), (cx - k * r, cy + k * r),
        (cx - r, cy), (cx - k * r, cy - k * r),
    ]
    draw.polygon(pts, fill=color + (255,))


def construir():
    # Fondo con degradado vertical (línea a línea).
    base = Image.new("RGBA", (S, S), FONDO_TOP + (255,))
    d = ImageDraw.Draw(base)
    for y in range(S):
        d.line([(0, y), (S, y)], fill=lerp(FONDO_TOP, FONDO_BOT, y / (S - 1)) + (255,))

    pcx, pcy = int(S * 0.5), int(S * 0.56)  # centro del planeta
    pr = int(S * 0.20)                       # radio del planeta

    # Resplandor suave detrás del planeta (muchos círculos casi transparentes).
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for i in range(60, 0, -1):
        rr = pr * (1 + i * 0.03)
        gd.ellipse([pcx - rr, pcy - rr, pcx + rr, pcy + rr],
                   fill=PLANETA + (3,))
    base.alpha_composite(glow)

    # Planeta + brillo.
    d = ImageDraw.Draw(base)
    d.ellipse([pcx - pr, pcy - pr, pcx + pr, pcy + pr], fill=PLANETA + (255,))
    bx, by, br = pcx - int(pr * 0.35), pcy - int(pr * 0.35), int(pr * 0.38)
    hl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(hl).ellipse([bx - br, by - br, bx + br, by + br],
                               fill=BRILLO + (150,))
    base.alpha_composite(hl)

    # Órbita + electrón, dibujados en una capa aparte y rotados.
    orb = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    od = ImageDraw.Draw(orb)
    rx, ry = int(S * 0.36), int(S * 0.13)
    od.ellipse([pcx - rx, pcy - ry, pcx + rx, pcy + ry],
               outline=ORBITA + (255,), width=max(2, int(S * 0.02)))
    er = int(S * 0.032)
    od.ellipse([pcx + rx - er, pcy - er, pcx + rx + er, pcy + er],
               fill=ELECTRON + (255,))
    orb = orb.rotate(20, resample=Image.BICUBIC, center=(pcx, pcy))
    base.alpha_composite(orb)

    # Confeti estelar: (x, y, radio, color) en fracciones del lienzo.
    estrellas = [
        (0.18, 0.18, 0.075, ORO),
        (0.80, 0.19, 0.050, BLANCO),
        (0.83, 0.70, 0.045, ORBITA),
        (0.16, 0.74, 0.040, BLANCO),
        (0.11, 0.45, 0.030, ORO),
        (0.71, 0.86, 0.030, BLANCO),
    ]
    star = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(star)
    for fx, fy, fr, col in estrellas:
        estrella(sd, S * fx, S * fy, S * fr, col)
    base.alpha_composite(star)

    return base.convert("RGB")


def main():
    maestro = construir()
    for tam, nombre in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "icon-180.png")]:
        ruta = os.path.join(SALIDA, nombre)
        maestro.resize((tam, tam), Image.LANCZOS).save(ruta)
        print("Generado:", ruta)


if __name__ == "__main__":
    main()
