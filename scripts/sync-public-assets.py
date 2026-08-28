"""Download official Schmerling plans and prepare validated CAD derivatives.

The generated manifest only advertises files that passed local structural
checks. PDF and image originals are preserved byte-for-byte; DXF geometry is
extracted from page one of vector PDFs; DWG is generated only when LibreDWG's
``dwgwrite`` is available and a round-trip back to DXF succeeds.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "app" / "shmerling-data.json"
DOCS = ROOT / "docs"
PLANS = DOCS / "plans"
MANIFEST = DOCS / "plan-assets.json"


def applicable_urls() -> list[str]:
    rows = json.loads(DATA.read_text(encoding="utf-8"))
    urls: set[str] = set()
    for row in rows:
        for key in ("room65", "canopy65", "canopy75"):
            variant = row.get(key) or {}
            plans = variant.get("plans") or []
            if isinstance(plans, str):
                plans = [plans]
            for url in plans:
                if "ללא-השתקה" not in urllib.parse.unquote(url):
                    urls.add(url)
    return sorted(urls)


def download(url: str, target: Path) -> None:
    safe_url = urllib.parse.quote(url, safe=":/%?=&")
    request = urllib.request.Request(
        safe_url,
        headers={"User-Agent": "Mozilla/5.0 TiktinGeneratorSelector/1.0"},
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        payload = response.read()
    if len(payload) < 500:
        raise RuntimeError(f"Downloaded file is unexpectedly small: {url}")
    suffix = target.suffix.lower()
    if suffix == ".pdf" and not payload.startswith(b"%PDF-"):
        raise RuntimeError(f"Expected a PDF but received another format: {url}")
    if suffix == ".png" and not payload.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError(f"Expected a PNG but received another format: {url}")
    target.write_bytes(payload)


def valid_dxf(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 200:
        return False
    text = path.read_text(encoding="utf-8", errors="ignore")
    return "SECTION" in text and "ENTITIES" in text and "LWPOLYLINE" in text and text.rstrip().endswith("EOF")


def convert_dxf(pdf: Path, dxf: Path) -> bool:
    command = [sys.executable, str(ROOT / "scripts" / "pdf-vector-to-dxf.py"), str(pdf), str(dxf)]
    result = subprocess.run(command, text=True, capture_output=True)
    if result.returncode != 0 or not valid_dxf(dxf):
        dxf.unlink(missing_ok=True)
        print(f"DXF skipped for {pdf.name}: {result.stderr.strip() or result.stdout.strip()}")
        return False
    return True


def find_tool(*names: str) -> str | None:
    for name in names:
        found = shutil.which(name)
        if found:
            return found
    return None


def convert_dwg(dxf: Path, dwg: Path) -> bool:
    writer = find_tool("dwgwrite", "dxf2dwg")
    reader = find_tool("dwgread")
    if not writer or not reader:
        return False

    attempts = [
        [writer, "-o", str(dwg), str(dxf)],
        [writer, str(dxf), str(dwg)],
    ]
    for command in attempts:
        result = subprocess.run(command, text=True, capture_output=True)
        if result.returncode == 0 and dwg.exists() and dwg.stat().st_size > 200:
            break
    else:
        dwg.unlink(missing_ok=True)
        return False

    header = dwg.read_bytes()[:6]
    if header not in {b"AC1015", b"AC1018", b"AC1021", b"AC1024", b"AC1027", b"AC1032"}:
        dwg.unlink(missing_ok=True)
        return False

    roundtrip = dwg.with_suffix(".roundtrip.dxf")
    attempts = [
        [reader, "-O", "DXF", "-o", str(roundtrip), str(dwg)],
        [reader, "-o", str(roundtrip), str(dwg)],
    ]
    good = False
    for command in attempts:
        result = subprocess.run(command, text=True, capture_output=True)
        if result.returncode == 0 and valid_dxf(roundtrip):
            good = True
            break
    roundtrip.unlink(missing_ok=True)
    if not good:
        dwg.unlink(missing_ok=True)
    return good


def main() -> None:
    DOCS.mkdir(exist_ok=True)
    PLANS.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict[str, str]] = {}

    urls = applicable_urls()
    for index, url in enumerate(urls, start=1):
        source_suffix = Path(urllib.parse.urlparse(url).path).suffix.lower() or ".pdf"
        base = f"shmerling-plan-{index:02d}"
        original = PLANS / f"{base}{source_suffix}"
        if not original.exists():
            download(url, original)
        record = {"pdf" if source_suffix == ".pdf" else "image": f"plans/{original.name}"}

        if source_suffix == ".pdf":
            dxf = PLANS / f"{base}.dxf"
            if (dxf.exists() and valid_dxf(dxf)) or convert_dxf(original, dxf):
                record["dxf"] = f"plans/{dxf.name}"
                dwg = PLANS / f"{base}.dwg"
                if (dwg.exists() and dwg.stat().st_size > 200) or convert_dwg(dxf, dwg):
                    record["dwg"] = f"plans/{dwg.name}"
        manifest[url] = record
        print(f"PASS {index:02d}/{len(urls):02d} {original.name}: {', '.join(record)}")

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"PASS: {len(urls)} official plan files stored; manifest written to {MANIFEST}")


if __name__ == "__main__":
    main()

