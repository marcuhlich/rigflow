"""Report static t("...") keys used in src/ that are missing in de or en.

Only literal keys are checked; dynamic keys (template strings, variables)
are skipped. Usage: python -I scripts/i18n-check.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
LOCALES = SRC / "i18n" / "locales"

KEY_RE = re.compile(r"""\bt\(\s*["']([a-z0-9_]+(?:\.[a-zA-Z0-9_-]+)+)["']""")
PLURAL_SUFFIXES = ("_one", "_other", "_zero", "_two", "_few", "_many")


def flatten(tree: dict, prefix: str = "") -> set[str]:
    keys: set[str] = set()
    for key, value in tree.items():
        path = f"{prefix}{key}"
        if isinstance(value, dict):
            keys |= flatten(value, f"{path}.")
        else:
            keys.add(path)
            for suffix in PLURAL_SUFFIXES:
                if path.endswith(suffix):
                    keys.add(path[: -len(suffix)])
    return keys


def main() -> None:
    known = {
        lang: flatten(json.loads((LOCALES / lang / "translation.json").read_text(encoding="utf-8")))
        for lang in ("de", "en")
    }
    missing: dict[str, list[str]] = {}
    for file in SRC.rglob("*.ts*"):
        text = file.read_text(encoding="utf-8", errors="replace")
        for match in KEY_RE.finditer(text):
            key = match.group(1)
            gaps = [lang for lang, keys in known.items() if key not in keys]
            if gaps:
                rel = file.relative_to(ROOT).as_posix()
                missing.setdefault(f"{key} (missing: {', '.join(gaps)})", []).append(rel)
    for key, files in sorted(missing.items()):
        print(f"{key}  <-  {', '.join(sorted(set(files)))}")
    print(f"\n{len(missing)} missing keys")
    sys.exit(1 if missing else 0)


if __name__ == "__main__":
    main()
