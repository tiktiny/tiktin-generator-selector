"""Convert vector paths in a PDF drawing to a millimetre-based ASCII DXF.

This intentionally preserves geometry only. Text and raster images remain in
the source PDF and should be checked during CAD QA before professional use.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from pypdf import PdfReader
from pypdf.generic import ContentStream

PT_TO_MM = 25.4 / 72.0


def multiply(left, right):
    a, b, c, d, e, f = left
    g, h, i, j, k, l = right
    return (
        a * g + c * h,
        b * g + d * h,
        a * i + c * j,
        b * i + d * j,
        a * k + c * l + e,
        b * k + d * l + f,
    )


def point(matrix, x, y):
    a, b, c, d, e, f = matrix
    return ((a * x + c * y + e) * PT_TO_MM, (b * x + d * y + f) * PT_TO_MM)


def bezier(p0, p1, p2, p3, steps=12):
    result = []
    for index in range(1, steps + 1):
        t = index / steps
        u = 1 - t
        result.append((
            u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1],
        ))
    return result


def extract_paths(reader, page_number):
    page = reader.pages[page_number]
    stream = ContentStream(page.get_contents(), reader)
    matrix = (1, 0, 0, 1, 0, 0)
    stack = []
    current = []
    current_raw = None
    start_raw = None
    entities = []

    def finish(close=False):
        nonlocal current, current_raw, start_raw
        if close and current and current[0] != current[-1]:
            current.append(current[0])
        if len(current) >= 2:
            entities.append(current)
        current = []
        current_raw = None
        start_raw = None

    for operands, operator in stream.operations:
        op = operator.decode("latin1")
        values = [float(value) for value in operands if hasattr(value, "as_numeric") or isinstance(value, (int, float))]
        if op == "q":
            stack.append(matrix)
        elif op == "Q":
            matrix = stack.pop() if stack else (1, 0, 0, 1, 0, 0)
        elif op == "cm" and len(values) == 6:
            matrix = multiply(matrix, tuple(values))
        elif op == "m" and len(values) >= 2:
            finish()
            current_raw = (values[0], values[1])
            start_raw = current_raw
            current = [point(matrix, *current_raw)]
        elif op == "l" and len(values) >= 2:
            current_raw = (values[0], values[1])
            current.append(point(matrix, *current_raw))
        elif op == "re" and len(values) == 4:
            finish()
            x, y, width, height = values
            raw = [(x, y), (x + width, y), (x + width, y + height), (x, y + height)]
            entities.append([point(matrix, *item) for item in raw] + [point(matrix, *raw[0])])
        elif op in {"c", "v", "y"} and current_raw:
            if op == "c" and len(values) == 6:
                control1, control2, end = (values[0], values[1]), (values[2], values[3]), (values[4], values[5])
            elif op == "v" and len(values) == 4:
                control1, control2, end = current_raw, (values[0], values[1]), (values[2], values[3])
            elif op == "y" and len(values) == 4:
                control1, control2, end = (values[0], values[1]), (values[2], values[3]), (values[2], values[3])
            else:
                continue
            raw_points = bezier(current_raw, control1, control2, end)
            current.extend(point(matrix, *item) for item in raw_points)
            current_raw = end
        elif op == "h":
            if start_raw and current:
                current.append(current[0])
                current_raw = start_raw
        elif op in {"S", "B", "B*", "f", "F", "f*"}:
            finish()
        elif op in {"s", "b", "b*"}:
            finish(close=True)
        elif op == "n":
            finish()
    finish()
    return entities


def dxf_text(value):
    return value.replace("\n", " ").replace("\r", " ")


def write_dxf(output, entities, source, page_number):
    lines = [
        "0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1027",
        "9", "$INSUNITS", "70", "4", "0", "ENDSEC",
        "0", "SECTION", "2", "TABLES", "0", "TABLE", "2", "LAYER", "70", "2",
        "0", "LAYER", "2", "PDF_GEOMETRY", "70", "0", "62", "7", "6", "CONTINUOUS",
        "0", "LAYER", "2", "PDF_NOTES", "70", "0", "62", "3", "6", "CONTINUOUS",
        "0", "ENDTAB", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES",
    ]
    for polyline in entities:
        closed = len(polyline) > 2 and math.dist(polyline[0], polyline[-1]) < 0.001
        vertices = polyline[:-1] if closed else polyline
        lines += ["0", "LWPOLYLINE", "8", "PDF_GEOMETRY", "90", str(len(vertices)), "70", "1" if closed else "0"]
        for x, y in vertices:
            lines += ["10", f"{x:.5f}", "20", f"{y:.5f}"]
    note = f"Converted from {source.name}, PDF page {page_number + 1}; units: mm; verify scale and dimensions before use"
    lines += ["0", "TEXT", "8", "PDF_NOTES", "10", "0", "20", "-10", "40", "3", "1", dxf_text(note)]
    lines += ["0", "ENDSEC", "0", "EOF"]
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_pdf", type=Path)
    parser.add_argument("output_dxf", type=Path)
    parser.add_argument("--page", type=int, default=1, help="1-based PDF page")
    args = parser.parse_args()
    reader = PdfReader(str(args.input_pdf))
    page_number = args.page - 1
    if page_number < 0 or page_number >= len(reader.pages):
        raise SystemExit(f"Page must be between 1 and {len(reader.pages)}")
    entities = extract_paths(reader, page_number)
    if not entities:
        raise SystemExit("No vector paths found. The PDF page may be raster-only.")
    args.output_dxf.parent.mkdir(parents=True, exist_ok=True)
    write_dxf(args.output_dxf, entities, args.input_pdf, page_number)
    print(f"Created {args.output_dxf} with {len(entities)} vector entities")


if __name__ == "__main__":
    main()
