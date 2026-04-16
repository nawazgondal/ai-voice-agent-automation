import zlib
import struct

width, height = 256, 256
pixels = bytearray()
for y in range(height):
    for x in range(width):
        r = int(40 + 160 * (x / (width - 1)))
        g = int(180 + 40 * (y / (height - 1)))
        b = int(220 - 120 * ((x + y) / (2 * (width - 1))))
        pixels.extend([r, g, b])


def chunk(name, data):
    chunk_data = name + data
    return struct.pack('!I', len(data)) + chunk_data + struct.pack('!I', zlib.crc32(chunk_data) & 0xffffffff)

png = bytearray(b'\x89PNG\r\n\x1a\n')
ihdr = struct.pack('!IIBBBBB', width, height, 8, 2, 0, 0, 0)
png += chunk(b'IHDR', ihdr)
raw = bytearray()
for y in range(height):
    raw.append(0)
    raw.extend(pixels[y * width * 3:(y + 1) * width * 3])
png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
png += chunk(b'IEND', b'')

with open('thumbnail.png', 'wb') as f:
    f.write(png)
