"""Render page 1 of every cinematic product PDF as a web cover image.

Source: E:/ABU/PRODUCTS/cinematic_pdfs/*.pdf -> assets/img/covers/<stem>.webp
1:1 mapping by filename, so store cards and product pages can reference
covers deterministically. ~600px wide webp keeps the store light.
"""
import os, glob
import fitz

SRC = r"E:\ABU\PRODUCTS\cinematic_pdfs"
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "img", "covers")

os.makedirs(OUT, exist_ok=True)
count = 0
for pdf in sorted(glob.glob(os.path.join(SRC, "*.pdf"))):
    stem = os.path.splitext(os.path.basename(pdf))[0]
    out = os.path.join(OUT, f"{stem}.jpg")
    try:
        doc = fitz.open(pdf)
        page = doc[0]
        zoom = 600 / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        pix.save(out, jpg_quality=82)
        print(f"{stem}.jpg {os.path.getsize(out)//1024}KB")
        count += 1
    except Exception as e:
        print(f"SKIP {stem}: {e}")
print(f"done: {count} covers")
