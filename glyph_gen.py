import sys
import PIL.Image

print('const glyph_sizes = new Uint8Array([')

im = PIL.Image.open(sys.argv[1])

for codepoint in range(256):
    x = 8*(codepoint % 16)
    y = 8*(codepoint // 16)
    w = -1
    for i in range(x, x+8):
        for j in range(y, y+8):
            if im.getpixel((i, j))[3] != 0:
                w = max(w, i - x + 1)

    if w == -1:
        w = 4 # TODO: figure this out
    print(f"{w+1}, ", end="")

print(']);')
