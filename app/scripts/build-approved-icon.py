"""Build Windows resources from the latest user-approved teal Trading Journal artwork.

The pinned transparent WebP source is a resized copy of the user's supplied
Glossy Teal Trading Journal Icon PNG. Earlier source assets are retained.
This only changes the generated ICO/PNG on subsequent builds, not journal data
or the accepted baseline branch. Test installed Windows visuals separately.
"""
from pathlib import Path
from hashlib import sha256
from base64 import b64decode
from io import BytesIO
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
ICONS=ROOT/"src-tauri"/"icons"
SOURCE=ICONS/"approved-teal-journal-source.webp.b64"
EXPECTED="fc66781afc36f01faa6987ba8a3dc0bbc1851e4c2706d6f0323994ebd9e78c3e"
SIZES=(16,24,32,48,64,128,256)

def main() -> None:
    raw=b64decode(SOURCE.read_text(encoding="utf-8").strip(),validate=True)
    if sha256(raw).hexdigest()!=EXPECTED:
        raise SystemExit("FAIL CLOSED: approved teal icon source SHA-256 mismatch")
    original=Image.open(BytesIO(raw)).convert("RGBA")
    if original.size!=(96,88):
        raise SystemExit("FAIL CLOSED: unexpected approved icon dimensions")
    if any(original.getpixel(point)[3] for point in ((0,0),(95,0),(0,87),(95,87))):
        raise SystemExit("FAIL CLOSED: icon source corners are not transparent")

    # Crop only transparent margin, preserve every original RGB/alpha detail.
    alpha=original.getchannel("A")
    bbox=alpha.point(lambda v: 255 if v>=8 else 0).getbbox()
    if not bbox:
        raise SystemExit("FAIL CLOSED: approved artwork is empty")
    art=original.crop(bbox)
    max_size=244  # six-pixel inset on the largest canvas; nearly fills small icons
    factor=min(max_size/art.width,max_size/art.height)
    w,h=max(1,round(art.width*factor)),max(1,round(art.height*factor))
    resized=art.resize((w,h),Image.Resampling.LANCZOS)
    canvas=Image.new("RGBA",(256,256),(0,0,0,0))
    canvas.alpha_composite(resized,((256-w)//2,(256-h)//2))
    canvas.save(ICONS/"icon.ico",format="ICO",sizes=[(n,n) for n in SIZES])

    for name,size in (("32x32.png",32),("128x128.png",128),("128x128@2x.png",256)):
        canvas.resize((size,size),Image.Resampling.LANCZOS).save(ICONS/name,"PNG")

    ico=Image.open(ICONS/"icon.ico")
    if not set((n,n) for n in SIZES).issubset(ico.ico.sizes()):
        raise SystemExit("FAIL CLOSED: ICO missing a required Windows size")
    for n in SIZES:
        img=ico.ico.getimage((n,n)).convert("RGBA")
        if any(img.getpixel(p)[3] for p in ((0,0),(n-1,0),(0,n-1),(n-1,n-1))):
            raise SystemExit(f"FAIL CLOSED: {n}px icon has an opaque corner")
        if img.getchannel("A").getbbox() is None:
            raise SystemExit(f"FAIL CLOSED: {n}px icon is empty")
    print("PASS: approved teal PTJ artwork, all 7 alpha-transparent ICO sizes and Tauri PNGs")

if __name__=="__main__":
    main()
