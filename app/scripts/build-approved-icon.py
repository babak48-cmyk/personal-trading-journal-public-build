"""Derive Windows app/installer icons from the exact frozen, user-approved artwork.

Preserve original RGB artwork. Remove ONLY the dark outer square behind the
existing rounded blue journal badge by changing alpha, never repaint any content.
The locked 256px WebP remains unmodified. No installer is built by this script.
"""
from math import sqrt
from hashlib import sha256
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src-tauri" / "icons" / "approved-icon-source.webp"
EXPECTED = "b193a7f819efa3396e6e9deece7d4a966703b2cae7b773041762d7c1fcf55b28"

def remove_outer_square_background(image: Image.Image) -> tuple[Image.Image,int]:
    """Measured outline of the original glossy cyan-bordered badge, alpha-only.

    The exact user-approved source is SHA-256 locked. All original RGB bytes
    of journal, chart, rings, bookmark and outer rounded badge are preserved.
    Only the dark square area OUTSIDE this badge becomes transparent.
    """
    original=image.convert("RGBA")
    if original.size != (256,256):
        raise ValueError("Approved source icon dimensions differ")
    output=original.copy()
    inp,out=original.load(),output.load()
    removed=0
    for y in range(256):
        for x in range(256):
            if y<19 or y>237:
                alpha=0
            else:
                if y<68:
                    d=sqrt(max(0.0,49**2-(y-68)**2))
                    left,right=67-d,189+d
                elif y>183:
                    d=sqrt(max(0.0,54**2-(y-183)**2))
                    left,right=72-d,184+d
                else:
                    left,right=18.0,238.0
                alpha=round(255*max(0.0,min(1.0,x-left+0.5,right-x+0.5)))
            r,g,b,a=inp[x,y]
            if alpha==0:removed+=1
            out[x,y]=(r,g,b,min(a,alpha))
    if not 17500 <= removed <= 23000:
        raise ValueError(f"Unexpected backdrop area: {removed} pixels")
    if any(out[x,y][3]!=0 for x,y in ((0,0),(255,0),(0,255),(255,255))):
        raise ValueError("Outer corners are not transparent")
    if out[128,128][3]!=255 or out[125,200][3]!=255:
        raise ValueError("Journal artwork became transparent")
    if any(out[x,y][:3]!=inp[x,y][:3] for y in range(256) for x in range(256)):
        raise ValueError("Original artwork RGB altered")
    return output,removed

def main() -> None:
    if sha256(SOURCE.read_bytes()).hexdigest() != EXPECTED:
        raise SystemExit("FAIL CLOSED: approved source icon hash mismatch")
    image, removed = remove_outer_square_background(Image.open(SOURCE))
    folder = SOURCE.parent
    image.save(folder / "icon.ico", format="ICO", sizes=[
        (16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)
    ])
    for name,size in (("32x32.png",32),("128x128.png",128),("128x128@2x.png",256)):
        image.resize((size,size),Image.Resampling.LANCZOS).save(folder / name,"PNG")
    icon = Image.open(folder / "icon.ico")
    if (256,256) not in icon.ico.sizes():
        raise SystemExit("FAIL CLOSED: ICO lacks 256px resource")
    if icon.copy().convert("RGBA").getpixel((0,0))[3] != 0:
        raise SystemExit("FAIL CLOSED: ICO transparent corner missing")
    print(f"VERIFIED original artwork preserved: {removed} connected background pixels transparent; icon.ico and Tauri PNG sizes created")

if __name__ == "__main__":
    main()
