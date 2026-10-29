"""Render all app/PWA/native icons from the RigFlow mark.

Source of truth: assets/brand/rigflow-mark.svg (with rivets) and
rigflow-mark-simple.svg (small sizes). Rendering runs in headless Chrome
(canvas -> PNG/WebP), so no image library is needed.

Usage: python -I scripts/build-icons.py
Then for the native app: npx capacitor-assets generate
"""
import base64
import json
import re
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "assets" / "brand"

CHROME_CANDIDATES = [
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    Path("/usr/bin/google-chrome"),
    Path("/usr/bin/chromium"),
]

BG = "#0F0F11"
AMBER = "#F59E0B"
WHITE = "#FFFFFF"

# name -> (size, background or None, mark colour, mark scale, rivets, corner radius ratio, format)
# Full-bleed square icons keep the mark inside the maskable safe zone (scale 0.6).
OUTPUTS = {
    "public/favicon-16x16.png":          (16,   BG,   AMBER, 0.68, False, 0.22, "png"),
    "public/favicon-32x32.png":          (32,   BG,   AMBER, 0.68, False, 0.22, "png"),
    "favicon-48":                        (48,   BG,   AMBER, 0.66, False, 0.22, "png"),
    "public/apple-touch-icon.png":       (180,  BG,   AMBER, 0.60, True,  0.0,  "png"),
    "public/pwa-192x192.png":            (192,  BG,   AMBER, 0.60, True,  0.0,  "png"),
    "public/pwa-512x512.png":            (512,  BG,   AMBER, 0.60, True,  0.0,  "png"),
    "public/android-chrome-192x192.png": (192,  BG,   AMBER, 0.60, True,  0.0,  "png"),
    "public/android-chrome-512x512.png": (512,  BG,   AMBER, 0.60, True,  0.0,  "png"),
    "public/badge-96x96.png":            (96,   None, WHITE, 0.82, False, 0.0,  "png"),
    "public/badge-512x512.png":          (512,  None, WHITE, 0.82, False, 0.0,  "png"),
    "public/logo-transparent.png":       (512,  None, AMBER, 0.90, True,  0.0,  "png"),
    "assets/icon-only.png":              (1024, BG,   AMBER, 0.60, True,  0.0,  "png"),
    "assets/icon-foreground.png":        (1024, None, AMBER, 0.46, True,  0.0,  "png"),
    "assets/icon-background.png":        (1024, BG,   AMBER, 0.0,  False, 0.0,  "png"),
    "assets/splash.png":                 (2732, BG,   AMBER, 0.18, True,  0.0,  "png"),
    "assets/splash-dark.png":            (2732, BG,   AMBER, 0.18, True,  0.0,  "png"),
}
for size in (48, 72, 96, 128, 192, 256, 512):
    OUTPUTS[f"icons/icon-{size}.webp"] = (size, BG, AMBER, 0.60, size >= 96, 0.0, "webp")


def mark_path(svg_file: Path) -> tuple[str, str]:
    text = svg_file.read_text(encoding="utf-8")
    view_box = re.search(r'viewBox="([^"]+)"', text).group(1)
    d = re.search(r'\sd="([^"]+)"', text).group(1)
    return view_box, d


def find_chrome() -> Path:
    for candidate in CHROME_CANDIDATES:
        if candidate.exists():
            return candidate
    sys.exit("Chrome/Edge not found; add its path to CHROME_CANDIDATES")


def build_page(jobs: dict, marks: dict) -> str:
    return f"""<!doctype html><html><body><pre id="out"></pre><script>
const JOBS = {json.dumps(jobs)};
const MARKS = {json.dumps(marks)};
async function render(job) {{
  const [size, bg, fg, scale, rivets, radius, fmt] = job;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (bg) {{
    ctx.fillStyle = bg;
    const r = radius * size;
    ctx.beginPath(); ctx.roundRect(0, 0, size, size, r); ctx.fill();
  }}
  if (scale > 0) {{
    const m = MARKS[rivets ? 'full' : 'simple'];
    const s = size * scale, off = (size - s) / 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${{m.viewBox}}" width="${{s}}" height="${{s}}"><path fill="${{fg}}" fill-rule="evenodd" d="${{m.d}}"/></svg>`;
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(svg);
    await img.decode();
    ctx.drawImage(img, off, off, s, s);
  }}
  return c.toDataURL(fmt === 'webp' ? 'image/webp' : 'image/png', 0.95);
}}
(async () => {{
  const result = {{}};
  for (const [name, job] of Object.entries(JOBS)) result[name] = await render(job);
  document.getElementById('out').textContent = 'BEGIN' + JSON.stringify(result) + 'END';
}})();
</script></body></html>"""


def write_ico(path: Path, pngs: list[bytes]) -> None:
    """ICO container with embedded PNGs (supported by all current browsers)."""
    header = struct.pack("<HHH", 0, 1, len(pngs))
    entries, offset = b"", 6 + 16 * len(pngs)
    for png in pngs:
        w, h = struct.unpack(">II", png[16:24])
        entries += struct.pack("<BBBBHHII", w % 256, h % 256, 0, 0, 1, 32, len(png), offset)
        offset += len(png)
    path.write_bytes(header + entries + b"".join(pngs))


def main() -> None:
    marks = {}
    for key, file in (("full", "rigflow-mark.svg"), ("simple", "rigflow-mark-simple.svg")):
        view_box, d = mark_path(BRAND / file)
        marks[key] = {"viewBox": view_box, "d": d}

    with tempfile.TemporaryDirectory() as tmp:
        page = Path(tmp) / "render.html"
        page.write_text(build_page(OUTPUTS, marks), encoding="utf-8")
        out = subprocess.run(
            [str(find_chrome()), "--headless=new", "--disable-gpu", f"--user-data-dir={tmp}/profile",
             "--virtual-time-budget=20000", "--dump-dom", page.as_uri()],
            capture_output=True, text=True, encoding="utf-8", timeout=180,
        ).stdout
    match = re.search(r"BEGIN(\{.*?\})END", out, re.S)
    if not match:
        sys.exit("Rendering failed: no output from Chrome")
    results = json.loads(match.group(1).replace("&quot;", '"'))

    data = {}
    for name, url in results.items():
        data[name] = base64.b64decode(url.split(",", 1)[1])
        if "/" in name:
            target = ROOT / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data[name])
            print(f"wrote {name} ({len(data[name])} bytes)")

    write_ico(ROOT / "public" / "favicon.ico",
              [data["public/favicon-16x16.png"], data["public/favicon-32x32.png"], data["favicon-48"]])
    print("wrote public/favicon.ico")


if __name__ == "__main__":
    main()
