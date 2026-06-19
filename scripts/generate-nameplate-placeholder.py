#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator placeholdera tabliczki znamionowej (NAME-01, Phase 14).

LOCKED (14-CONTEXT): w srodowisku NIE ma narzedzi do obrazow (PIL/sharp/canvas/
ImageMagick nieobecne). Dlatego raster generujemy CZYSTYM Pythonem (tylko stdlib:
`zlib` + `struct`) emitujac surowe bajty PNG (sygnatura + IHDR + IDAT + IEND).

Wynik zapisujemy pod nazwa `.webp` — rozszerzenie jest CELOWE. Przegladarka oraz
THREE.TextureLoader sniffuja zawartosc pliku, wiec bajty PNG sa dekodowane
poprawnie niezaleznie od rozszerzenia. Phase 16 podmieni ten plik na realne
zdjecie tabliczki (ten sam URL, ten sam slot w public/media/).

Plyta: matowe srebro (RGB 0xC8,0xC8,0xC8) z ciemna grawerowana ramka-bezel
(RGB 0x3A,0x3A,0x3A) szerokosci kilku pikseli. Tekst NIE jest renderowany —
placeholder ma byc lekki i nie wymaga rasteryzacji fontow w czystym Pythonie.

Wymiary 512x320 (POT-friendly, zgodne z dotychczasowym CanvasTexture).
"""

import struct
import zlib

# Wymiary rastra — zgodne z poprzednim canvas (512 x 320).
WIDTH = 512
HEIGHT = 320

# Kolory (RGB) per UI-SPEC / dotychczasowy CanvasTexture.
SILVER = (0xC8, 0xC8, 0xC8)   # matowe srebro — tlo plyty
BEZEL = (0x3A, 0x3A, 0x3A)    # ciemny grawerowany bezel — ramka
BORDER_WIDTH = 6              # szerokosc ramki w pikselach

OUTPUT_PATH = 'public/media/tabliczka-znamionowa.webp'


def _build_raster():
    """Zwraca surowe bajty pikseli RGB (bez filtra) wiersz po wierszu."""
    rows = []
    for y in range(HEIGHT):
        row = bytearray()
        for x in range(WIDTH):
            in_border = (
                x < BORDER_WIDTH or x >= WIDTH - BORDER_WIDTH or
                y < BORDER_WIDTH or y >= HEIGHT - BORDER_WIDTH
            )
            r, g, b = BEZEL if in_border else SILVER
            row.extend((r, g, b))
        rows.append(bytes(row))
    return rows


def _chunk(tag, data):
    """Skleja kawalek PNG: dlugosc + tag + dane + CRC32(tag+dane)."""
    chunk = tag + data
    crc = zlib.crc32(chunk) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + chunk + struct.pack('>I', crc)


def _encode_png(rows):
    """Buduje pelny strumien PNG (sygnatura + IHDR + IDAT + IEND)."""
    signature = b'\x89PNG\r\n\x1a\n'

    # IHDR: width, height, bit depth=8, color type=2 (truecolor RGB),
    # compression=0, filter=0, interlace=0.
    ihdr = struct.pack('>IIBBBBB', WIDTH, HEIGHT, 8, 2, 0, 0, 0)

    # Kazdy wiersz poprzedzony bajtem filtra 0 (None) — bez predykcji.
    raw = bytearray()
    for row in rows:
        raw.append(0)
        raw.extend(row)
    idat = zlib.compress(bytes(raw), 9)

    return (
        signature
        + _chunk(b'IHDR', ihdr)
        + _chunk(b'IDAT', idat)
        + _chunk(b'IEND', b'')
    )


def main():
    png_bytes = _encode_png(_build_raster())
    with open(OUTPUT_PATH, 'wb') as f:
        f.write(png_bytes)
    print(f'Zapisano placeholder ({len(png_bytes)} B): {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
