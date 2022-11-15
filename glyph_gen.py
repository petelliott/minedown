import sys

print('const glyph_sizes = new Uint8Array([')

with open(sys.argv[1], mode='rb') as f:
    data = f.read()
    for byte in data:
        print(f"{byte}, ", end="")

print('])')
