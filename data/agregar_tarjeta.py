"""Script de consola para añadir tarjetas al banco del juego.

Lee/escribe data/tarjetas.json (fuente de la verdad) y regenera
data/tarjetas.js (lo que carga la web), ya que el navegador no puede
leer un .json directamente al abrir index.html sin servidor.
"""

import json
from pathlib import Path

BASE = Path(__file__).parent
JSON_PATH = BASE / "tarjetas.json"
JS_PATH = BASE / "tarjetas.js"


def cargar():
    if JSON_PATH.exists():
        return json.loads(JSON_PATH.read_text(encoding="utf-8"))
    return {}


def guardar(datos):
    JSON_PATH.write_text(
        json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    js = (
        "// Generado a partir de tarjetas.json por agregar_tarjeta.py — no editar a mano.\n"
        "const TARJETAS = "
        + json.dumps(datos, ensure_ascii=False, indent=2)
        + ";\n"
    )
    JS_PATH.write_text(js, encoding="utf-8")


def elegir_categoria(datos):
    categorias = list(datos.keys())
    print("\nCategorías actuales:", ", ".join(categorias) or "(ninguna)")
    cat = input("Categoría (nueva o existente, Enter para salir): ").strip()
    return cat


def main():
    datos = cargar()
    cambios = 0

    while True:
        cat = elegir_categoria(datos)
        if not cat:
            break

        print(f"Añadiendo tarjetas a '{cat}'. Enter en blanco para cambiar de categoría.")
        while True:
            tarjeta = input(f"  Tarjeta para '{cat}' (Enter para volver): ").strip()
            if not tarjeta:
                break

            datos.setdefault(cat, [])
            if tarjeta in datos[cat]:
                print(f"  ⚠️  '{tarjeta}' ya existe en '{cat}', no se añade.")
                continue

            datos[cat].append(tarjeta)
            cambios += 1
            print(f"  ✅ Añadida '{tarjeta}' a '{cat}' ({len(datos[cat])} tarjetas en total).")

    if cambios == 0:
        print("\nSin cambios. No se ha tocado ningún archivo.")
        return

    guardar(datos)
    print(f"\nGuardado. Se han añadido {cambios} tarjeta(s).")
    print("Categorías y tamaños actuales:")
    for cat, tarjetas in datos.items():
        print(f"  - {cat}: {len(tarjetas)}")


if __name__ == "__main__":
    main()
