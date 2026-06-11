# -*- coding: utf-8 -*-
"""Sube el número de versión de cache-busting (?v=N) en index.html.

Busca todas las referencias ?v=<num> en index.html, toma el mayor,
le suma 1 y reescribe TODAS con el nuevo número. Lo invoca el hook
pre-commit (.githooks/pre-commit) cuando cambian archivos CSS/JS.
"""
import re
import pathlib
import sys

INDEX = pathlib.Path(__file__).resolve().parent.parent / "index.html"


def main() -> int:
    if not INDEX.exists():
        print(f"bump-version: no se encontró {INDEX}")
        return 0
    html = INDEX.read_text(encoding="utf-8")
    versions = [int(n) for n in re.findall(r"\?v=(\d+)", html)]
    if not versions:
        print("bump-version: no hay etiquetas ?v= en index.html (sin cambios)")
        return 0
    new_v = max(versions) + 1
    new_html = re.sub(r"\?v=\d+", f"?v={new_v}", html)
    if new_html != html:
        INDEX.write_text(new_html, encoding="utf-8")
        print(f"bump-version: assets -> ?v={new_v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
