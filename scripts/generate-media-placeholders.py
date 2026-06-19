#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator placeholderow mediow dla Phase 16 (MED-01/MED-02).

Generalizacja scripts/generate-nameplate-placeholder.py (Phase 14, NAME-01).

LOCKED (14-CONTEXT / 16-RESEARCH): w srodowisku NIE ma narzedzi do obrazow
(PIL/sharp/canvas/ImageMagick nieobecne). Dlatego raster generujemy CZYSTYM
Pythonem (tylko stdlib: `zlib` + `struct`) emitujac surowe bajty PNG
(sygnatura + IHDR + IDAT + IEND).

Wynik zapisujemy pod nazwa `.webp` — rozszerzenie jest CELOWE. Przegladarka oraz
THREE.TextureLoader sniffuja zawartosc pliku, wiec bajty PNG sa dekodowane
poprawnie niezaleznie od rozszerzenia. Phase 16 podmieni te pliki na realne
zdjecia komponentow (ten sam URL, ten sam slot w public/media/).

Kazdy placeholder to plyta o odrebnym tle z kontrastowa ramka-bezel
(RGB 0x3A,0x3A,0x3A) szerokosci kilku pikseli. Tekst NIE jest renderowany —
placeholder ma byc lekki i nie wymaga rasteryzacji fontow w czystym Pythonie.

Wymiary 512x320 (POT-friendly, zgodne z nameplate / CanvasTexture).
"""

import struct
import zlib

# Wymiary rastra — zgodne z nameplate (512 x 320).
WIDTH = 512
HEIGHT = 320

# Wspolny ciemny grawerowany bezel — ramka kazdego placeholdera.
BEZEL = (0x3A, 0x3A, 0x3A)    # ciemny bezel — ramka
BORDER_WIDTH = 6              # szerokosc ramki w pikselach

# Konfiguracja placeholderow: (sciezka wyjsciowa, kolor tla RGB).
# Kazdy komponent ma odrebne tlo dla wizualnego rozroznienia.
PLACEHOLDERS = [
    ('public/media/kolo-zamachowe-placeholder.webp', (0x80, 0x80, 0x80)),  # szary — kolo zamachowe
    ('public/media/hamulec-placeholder.webp', (0x60, 0x40, 0x40)),         # ciemny czerwonawy — hamulec
]


def _build_raster(bg_color):
    """Zwraca surowe bajty pikseli RGB (bez filtra) wiersz po wierszu."""
    rows = []
    for y in range(HEIGHT):
        row = bytearray()
        for x in range(WIDTH):
            in_border = (
                x < BORDER_WIDTH or x >= WIDTH - BORDER_WIDTH or
                y < BORDER_WIDTH or y >= HEIGHT - BORDER_WIDTH
            )
            r, g, b = BEZEL if in_border else bg_color
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
    """Iteruje po konfiguracji placeholderow i zapisuje bajty PNG do .webp."""
    for output_path, bg_color in PLACEHOLDERS:
        png_bytes = _encode_png(_build_raster(bg_color))
        with open(output_path, 'wb') as f:
            f.write(png_bytes)
        print(f'Zapisano placeholder ({len(png_bytes)} B): {output_path}')


if __name__ == '__main__':
    main()
