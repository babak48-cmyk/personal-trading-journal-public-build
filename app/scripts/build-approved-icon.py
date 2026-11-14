"""Build Windows icon resources from the NEW user-approved 3D Trading Journal artwork.

The exact user-supplied 1312x1199 transparent image (book, gold bull, pen and
Trading Journal text) was resized, not redrawn, to a compact 128x117 WebP source.
Its SHA-256 is pinned; the base64 file is checked into the public build branch
because GitHub's text-only integration cannot write binary attachments directly.
The original full-resolution PNG remains in the separately delivered local ZIP.
The old square-backed source remains untouched and is NOT used for new builds.
"""
from pathlib import Path
from hashlib import sha256
from base64 import b64decode
from io import BytesIO
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
ICONS=ROOT/"src-tauri"/"icons"
SOURCE=ICONS/"approved-3d-bull-source.webp.b64"
EXPECTED="9ec77b7893e149fb6acb6f76a98e5a0d19a3f98442eab89b70621afafb955a8d"

def main() -> None:
    data=b64decode(SOURCE.read_text().strip(),validate=True)
    if sha256(data).hexdigest()!=EXPECTED:
        raise SystemExit("FAIL CLOSED: user-approved 3D bull notebook icon content mismatch")
    original=Image.open(BytesIO(data)).convert("RGBA")
    if original.size!=(128,117):
        raise SystemExit("FAIL CLOSED: unexpected approved icon geometry")
    if any(original.getpixel(pt)[3] for pt in [(0,0),(127,0),(0,116),(127,116)]):
        raise SystemExit("FAIL CLOSED: user-approved image must have transparent corners")
    if original.getpixel((64,58))[3]==0:
        raise SystemExit("FAIL CLOSED: notebook artwork not present")
    # Aspect ratio is preserved; transparent vertical margins add a square ICO canvas.
    inner=original.resize((256,234),Image.Resampling.LANCZOS)
    image=Image.new("RGBA",(256,256),(0,0,0,0))
    image.alpha_composite(inner,(0,11))
    image.save(ICONS/"icon.ico",format="ICO",sizes=[
        (16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)
    ])
    for name,size in (("32x32.png",32),("128x128.png",128),("128x128@2x.png",256)):
        image.resize((size,size),Image.Resampling.LANCZOS).save(ICONS/name,"PNG")
    ico=Image.open(ICONS/"icon.ico")
    if (256,256) not in ico.ico.sizes() or ico.getpixel((0,0))[3]!=0:
        raise SystemExit("FAIL CLOSED: ICO resource missing or background opaque")
    print("APPROVED 3D BULL JOURNAL verified: transparent, proportional Windows ICO and Tauri PNG resources")

if __name__=="__main__":
    main()
