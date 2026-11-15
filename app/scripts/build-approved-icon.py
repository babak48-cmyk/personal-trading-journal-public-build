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
    # Each Windows desktop and taskbar resolution receives an independently
    # framed crop of the SAME hash-pinned approved artwork. Previously the
    # 48/64/128/256px desktop resources were made from a padded 256px canvas
    # and therefore displayed noticeably smaller than the taskbar resources.
    # Do not invent new graphics or stretch aspect ratio.
    resources=[]
    frames={}
    for n in SIZES:
        target=n-1 if n<=32 else n-2
        scale=min(target/art.width,target/art.height)
        iw,ih=max(1,round(art.width*scale)),max(1,round(art.height*scale))
        icon_art=art.resize((iw,ih),Image.Resampling.LANCZOS)
        frame=Image.new("RGBA",(n,n),(0,0,0,0))
        frame.alpha_composite(icon_art,((n-iw)//2,(n-ih)//2))
        # Avoid opaque/fringed ICO corners on Windows at any display scaling.
        for pt in ((0,0),(0,n-1),(n-1,0),(n-1,n-1)):
            frame.putpixel(pt,(0,0,0,0))
        frames[n]=frame
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
        frames[size].save(ICONS/name,"PNG")

    ico=Image.open(ICONS/"icon.ico")
    if not set((n,n) for n in SIZES).issubset(ico.ico.sizes()):
        raise SystemExit("FAIL CLOSED: ICO missing a required Windows size")
    for n in SIZES:
        img=ico.ico.getimage((n,n)).convert("RGBA")
        if n in SIZES:
            # The same approved artwork must occupy the available icon box at
            # both Taskbar and Desktop sizes, without opaque square backgrounds.
            bounds=img.getchannel("A").point(lambda a: 255 if a>=8 else 0).getbbox()
            if not bounds or max(bounds[2]-bounds[0],bounds[3]-bounds[1]) < n*0.8:
                raise SystemExit(f"FAIL CLOSED: {n}px desktop/taskbar artwork too small")
        if any(img.getpixel(p)[3] for p in ((0,0),(n-1,0),(0,n-1),(n-1,n-1))):
            raise SystemExit(f"FAIL CLOSED: {n}px icon has an opaque corner")
        if img.getchannel("A").getbbox() is None:
            raise SystemExit(f"FAIL CLOSED: {n}px icon is empty")
    print("PASS: approved teal PTJ artwork, all 7 alpha-transparent ICO sizes and Tauri PNGs")

if __name__=="__main__":
    main()
