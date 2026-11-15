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
from struct import pack
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
    max_size=236  # ten-pixel safe inset prevents 16px Lanczos alpha bleed at corners
    factor=min(max_size/art.width,max_size/art.height)
    w,h=max(1,round(art.width*factor)),max(1,round(art.height*factor))
    resized=art.resize((w,h),Image.Resampling.LANCZOS)
    canvas=Image.new("RGBA",(256,256),(0,0,0,0))
    canvas.alpha_composite(resized,((256-w)//2,(256-h)//2))
    # Keep the approved large desktop/window artwork unchanged. Windows may
    # choose a 16/24/32 px resource for its taskbar; generate those directly
    # from the ORIGINAL crop, rather than downsampling the padded 256px canvas.
    # Their slightly tighter framing makes the same approved artwork legible at
    # tiny taskbar sizes without replacing its identity or color.
    resources=[]
    for n in SIZES:
        if n in (16,24,32):
            target=n-1
            scale=min(target/art.width,target/art.height)
            icon_art=art.resize((max(1,round(art.width*scale)),max(1,round(art.height*scale))),Image.Resampling.LANCZOS)
            frame=Image.new("RGBA",(n,n),(0,0,0,0))
            frame.alpha_composite(icon_art,((n-icon_art.width)//2,(n-icon_art.height)//2))
        else:
            frame=canvas.resize((n,n),Image.Resampling.LANCZOS)
        # Preserve transparent ICO corners, including Lanczos fringe pixels.
        for pt in ((0,0),(0,n-1),(n-1,0),(n-1,n-1)):
            frame.putpixel(pt,(0,0,0,0))
        payload=BytesIO()
        frame.save(payload,format="PNG")
        resources.append(payload.getvalue())
    # Windows Vista+ supports PNG-backed ICO entries. Writing each entry
    # explicitly preserves independently optimized small-size resolutions.
    directory=bytearray(pack("<HHH",0,1,len(resources)))
    offset=6+16*len(resources)
    for n,payload in zip(SIZES,resources):
        directory.extend(pack("<BBBBHHII",n if n<256 else 0,n if n<256 else 0,0,0,1,32,len(payload),offset))
        offset+=len(payload)
    (ICONS/"icon.ico").write_bytes(bytes(directory)+b"".join(resources))

    for name,size in (("32x32.png",32),("128x128.png",128),("128x128@2x.png",256)):
        canvas.resize((size,size),Image.Resampling.LANCZOS).save(ICONS/name,"PNG")

    ico=Image.open(ICONS/"icon.ico")
    if not set((n,n) for n in SIZES).issubset(ico.ico.sizes()):
        raise SystemExit("FAIL CLOSED: ICO missing a required Windows size")
    for n in SIZES:
        img=ico.ico.getimage((n,n)).convert("RGBA")
        if n in (16,24,32):
            # Small frames must not accidentally fall back to a tiny 256px
            # padded thumbnail. Require at least ~80% visible occupancy.
            bounds=img.getchannel("A").point(lambda a: 255 if a>=8 else 0).getbbox()
            if not bounds or max(bounds[2]-bounds[0],bounds[3]-bounds[1]) < n*0.8:
                raise SystemExit(f"FAIL CLOSED: {n}px taskbar artwork too small")
        if any(img.getpixel(p)[3] for p in ((0,0),(n-1,0),(0,n-1),(n-1,n-1))):
            raise SystemExit(f"FAIL CLOSED: {n}px icon has an opaque corner")
        if img.getchannel("A").getbbox() is None:
            raise SystemExit(f"FAIL CLOSED: {n}px icon is empty")
    print("PASS: approved teal PTJ artwork, all 7 alpha-transparent ICO sizes and Tauri PNGs")

if __name__=="__main__":
    main()
