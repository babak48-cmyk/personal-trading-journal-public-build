"""Deterministically derive Tauri Windows resources from the exact user-supplied artwork.
No icon drawing, invention, replacement, or product-logic changes.
The 256px WebP is a space-efficient resized encoding of the approved 1254px PNG
supplied in this conversation. All icon sizes retain the same original artwork.
"""
from pathlib import Path
from hashlib import sha256
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src-tauri" / "icons" / "approved-icon-source.webp"
EXPECTED = "b193a7f819efa3396e6e9deece7d4a966703b2cae7b773041762d7c1fcf55b28"
if sha256(SOURCE.read_bytes()).hexdigest() != EXPECTED:
    raise SystemExit("FAIL CLOSED: approved source icon does not match verified original derivative")

im = Image.open(SOURCE).convert("RGBA")
if im.size != (256, 256):
    raise SystemExit("FAIL CLOSED: unexpected approved icon dimensions")
folder = SOURCE.parent
im.save(folder / "icon.ico", format="ICO", sizes=[
    (16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)
])
for name,size in (("32x32.png",32),("128x128.png",128),("128x128@2x.png",256)):
    im.resize((size,size),Image.Resampling.LANCZOS).save(folder / name, "PNG")
icon = Image.open(folder / "icon.ico")
if (256,256) not in icon.info.get("sizes", set()) and (256,256) not in icon.ico.sizes():
    raise SystemExit("FAIL CLOSED: ICO lacks 256px resource")
print("APPROVED ICON VERIFIED:", SOURCE.name, "-> icon.ico + Tauri PNG sizes")
