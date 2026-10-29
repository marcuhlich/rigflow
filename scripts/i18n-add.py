"""Add flat string keys to both translation files without reformatting them.

Usage:
  python -I scripts/i18n-add.py <section> <key> "<de text>" "<en text>" [<key> "<de>" "<en>" ...]

Inserts each key as the first entry of the top-level <section> (which must
already exist) in src/i18n/locales/{de,en}/translation.json. Existing keys are
skipped. The rest of the file is left byte-for-byte untouched.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src" / "i18n" / "locales"


def insert(lang: str, section: str, key: str, value: str) -> str:
    path = ROOT / lang / "translation.json"
    text = path.read_text(encoding="utf-8")
    data = json.loads(text)
    if section not in data:
        sys.exit(f"[{lang}] section '{section}' not found")
    if key in data[section]:
        return f"[{lang}] {section}.{key} exists, skipped"
    pattern = re.compile(r'^(  "' + re.escape(section) + r'": \{\r?\n)(\s+)', re.M)
    match = pattern.search(text)
    if not match:
        sys.exit(f"[{lang}] could not locate section '{section}' at top level")
    nl = "\r\n" if match.group(1).endswith("\r\n") else "\n"
    entry = f'{match.group(2)}{json.dumps(key)}: {json.dumps(value, ensure_ascii=False)},{nl}'
    text = text[: match.end(1)] + entry + text[match.end(1):]
    json.loads(text)  # still valid
    path.write_text(text, encoding="utf-8", newline="")
    return f"[{lang}] {section}.{key} added"


def main() -> None:
    args = sys.argv[1:]
    if len(args) < 4 or (len(args) - 1) % 3:
        sys.exit(__doc__)
    section, rest = args[0], args[1:]
    for i in range(0, len(rest), 3):
        key, de, en = rest[i : i + 3]
        print(insert("de", section, key, de))
        print(insert("en", section, key, en))


if __name__ == "__main__":
    main()
