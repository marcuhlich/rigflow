"""Merge scripts/i18n-pending/*.json into the translation files.

Pending file shape: { "section.sub.key": { "de": "...", "en": "..." } }

Also normalises the translation files: duplicate object keys are deep-merged
(later occurrence wins, matching what JSON.parse does at runtime).
Existing keys are never overwritten; conflicts are reported.

Usage: python -I scripts/i18n-merge.py [--dry-run]
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCALES = ROOT / "src" / "i18n" / "locales"
PENDING = ROOT / "scripts" / "i18n-pending"
LANGS = ("de", "en")


def deep_merge(base: dict, extra: dict) -> dict:
    for key, value in extra.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            deep_merge(base[key], value)
        else:
            base[key] = value
    return base


def merge_duplicates(pairs):
    result: dict = {}
    for key, value in pairs:
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def set_path(tree: dict, dotted: str, value: str) -> str | None:
    parts = dotted.split(".")
    node = tree
    for part in parts[:-1]:
        child = node.setdefault(part, {})
        if not isinstance(child, dict):
            return f"'{dotted}': '{part}' is a string, not a section"
        node = child
    leaf = parts[-1]
    if leaf in node:
        if node[leaf] != value:
            return f"'{dotted}' exists with different text, kept existing"
        return None
    node[leaf] = value
    return None


def main() -> None:
    dry = "--dry-run" in sys.argv
    trees = {
        lang: json.loads((LOCALES / lang / "translation.json").read_text(encoding="utf-8"),
                         object_pairs_hook=merge_duplicates)
        for lang in LANGS
    }
    added = 0
    for pending in sorted(PENDING.glob("*.json")):
        entries = json.loads(pending.read_text(encoding="utf-8"))
        for dotted, texts in entries.items():
            for lang in LANGS:
                if lang not in texts:
                    print(f"[{pending.name}] {dotted}: missing '{lang}'")
                    continue
                problem = set_path(trees[lang], dotted, texts[lang])
                if problem:
                    print(f"[{pending.name}] [{lang}] {problem}")
            added += 1
    print(f"{added} pending keys processed")
    if dry:
        return
    for lang in LANGS:
        out = json.dumps(trees[lang], ensure_ascii=False, indent=2) + "\n"
        (LOCALES / lang / "translation.json").write_text(out, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
