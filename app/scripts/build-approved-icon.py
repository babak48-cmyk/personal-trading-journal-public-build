"""Derive Windows app/installer icons from the exact frozen, user-approved artwork.

Preserve all original RGB artwork pixels. Remove ONLY the connected nearly-black
square background by changing alpha, never generate or repaint icon content.
The locked 256px WebP remains unmodified. No installer is built by this script.
"""
from collections import deque
from hashlib import sha256
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src-tauri" / "icons" / "approved-icon-source.webp"
EXPECTED = "b193a7f819efa3396e6e9deece7d4a966703b2cae7b773041762d7c1fcf55b28"

def remove_connected_black_square(image: Image.Image) -> tuple[Image.Image, int]:
    """Only the dark near-neutral region connected to the outer border is removed.

    No RGB channel of any input pixel is changed; book/pen details and enclosed
    dark artwork are never filled/repainted. Ambiguous/transparent source fails
    closed rather than silently replacing the approved icon.
    """
    original = image.convert("RGBA")
    width, height = original.size
    if (width, height) != (256, 256):
        raise ValueError("Unexpected approved source dimensions")
    pix = original.load()
    corner_points = ((0, 0), (width-1, 0), (0, height-1), (width-1, height-1))
    corners = [pix[x, y] for x,y in corner_points]
    if all(a == 0 for *_,a in corners):
        raise ValueError("Source corners already transparent: do not transform a different asset")
    if not all(max(r,g,b) <= 65 and max(r,g,b)-min(r,g,b) <= 24 for r,g,b,a in corners):
        raise ValueError("Corners are not a nearly-black square; manual source review required")

    def is_background(x: int, y: int) -> bool:
        r,g,b,a = pix[x,y]
        return a > 0 and max(r,g,b) <= 68 and max(r,g,b)-min(r,g,b) <= 24

    seen = bytearray(width * height)
    queue = deque()
    for x in range(width):
        for y in (0,height-1):
            if is_background(x,y):
                i = y*width+x
                if not seen[i]:
                    seen[i] = 1; queue.append((x,y))
    for y in range(height):
        for x in (0,width-1):
            if is_background(x,y):
                i = y*width+x
                if not seen[i]:
                    seen[i] = 1; queue.append((x,y))
    count = 0
    while queue:
        x,y = queue.popleft()
        count += 1
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if not (0 <= nx < width and 0 <= ny < height):
                continue
            i = ny*width+nx
            if not seen[i] and is_background(nx,ny):
                seen[i] = 1
                queue.append((nx,ny))
    if count < (width*height)//50 or count > (width*height*85)//100:
        raise ValueError(f"Ambiguous black background isolation ({count} pixels); manual review required")

    output = original.copy()
    out = output.load()
    for i, selected in enumerate(seen):
        if selected:
            x,y=i%width,i//width
            r,g,b,_=out[x,y]
            out[x,y]=(r,g,b,0)
    if any(out[x,y][3] != 0 for x,y in corner_points):
        raise ValueError("Failed to remove all four black background corners")
    # Invariant: foreground RGB is an exact byte-for-byte copy of the source.
    if any(out[x,y][:3] != pix[x,y][:3] for y in range(height) for x in range(width)):
        raise ValueError("Approved artwork RGB changed")
    return output,count

def main() -> None:
    if sha256(SOURCE.read_bytes()).hexdigest() != EXPECTED:
        raise SystemExit("FAIL CLOSED: approved source icon hash mismatch")
    image, removed = remove_connected_black_square(Image.open(SOURCE))
    folder = SOURCE.parent
    image.save(folder / "icon.ico", format="ICO", sizes=[
        (16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)
    ])
    for name,size in (("32x32.png",32),("128x128.png",128),("128x128@2x.png",256)):
        image.resize((size,size),Image.Resampling.LANCZOS).save(folder / name,"PNG")
    # Keep a reviewable lossless result alongside derived Tauri sizes.
    image.save(folder / "approved-icon-transparent-preview.png", "PNG")
    icon = Image.open(folder / "icon.ico")
    if (256,256) not in icon.ico.sizes():
        raise SystemExit("FAIL CLOSED: ICO lacks 256px resource")
    if icon.copy().convert("RGBA").getpixel((0,0))[3] != 0:
        raise SystemExit("FAIL CLOSED: ICO transparent corner missing")
    print(f"VERIFIED original artwork preserved: {removed} connected background pixels transparent; icon.ico and Tauri PNG sizes created")

if __name__ == "__main__":
    main()
