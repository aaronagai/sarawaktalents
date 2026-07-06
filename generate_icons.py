"""Generate PWA icons for GPS PRN-13 using only Python builtins."""
import struct, zlib

BG = (13, 148, 136)   # #0d9488 brand teal
FG = (255, 255, 255)  # white text

# 5-wide x 7-tall bitmap font
FONT = {
    'G': ["01110","10001","10000","10111","10001","10001","01111"],
    'P': ["11110","10001","10001","11110","10000","10000","10000"],
    'S': ["01111","10000","10000","01110","00001","00001","11110"],
}

def write_png(filename, size):
    pixels = [BG] * (size * size)

    scale = max(1, size // 22)
    gap   = scale
    cw, ch = 5 * scale, 7 * scale
    total_w = 3 * cw + 2 * gap
    ox0 = (size - total_w) // 2
    oy0 = (size - ch) // 2

    for ci, ch_letter in enumerate('GPS'):
        rows = FONT[ch_letter]
        ox = ox0 + ci * (cw + gap)
        for row in range(7):
            for col in range(5):
                if rows[row][col] == '1':
                    for sy in range(scale):
                        for sx in range(scale):
                            px = ox + col * scale + sx
                            py = oy0 + row * scale + sy
                            if 0 <= px < size and 0 <= py < size:
                                pixels[py * size + px] = FG

    def chunk(kind, data):
        body = kind + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xffffffff)

    raw = b''.join(
        bytes([0]) + b''.join(struct.pack('BBB', *pixels[r * size + c]) for c in range(size))
        for r in range(size)
    )

    png = (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )

    with open(filename, 'wb') as f:
        f.write(png)
    print(f'  {filename} ({size}x{size})')

print('Generating icons...')
write_png('icon-192.png', 192)
write_png('icon-512.png', 512)
print('Done.')
