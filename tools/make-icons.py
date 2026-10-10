#!/usr/bin/env python3
"""Generate all app icons (sunset + euro sun) without external libraries.

Usage: python3 tools/make-icons.py
Writes web icons to icons/ and Capacitor adaptive-icon sources to
app-android/assets/. Re-run after changing the design below.
"""
import math
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Design in a 1024 x 1024 coordinate space.
HORIZON = 620
SUN_C, SUN_R = (512, 470), 240
SKY_TOP, SKY_BOTTOM = (255, 180, 84), (255, 111, 125)
SEA_TOP, SEA_BOTTOM = (11, 61, 90), (5, 34, 47)
SUN_COL, EURO_COL = (255, 239, 201), (11, 61, 90)
EURO_C, EURO_R_OUT, EURO_R_IN, EURO_GAP_DEG = (529, 470), 112, 80, 42
EURO_BARS = [(407, 567, 442), (407, 567, 498)]  # x0, x1, y center
BAR_HALF = 12
STRIPES = [(660, 300), (712, 220), (764, 140), (816, 70)]  # y center, width
STRIPE_HALF = 11


def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def cov(d):
    """Anti-aliased coverage from a signed distance (negative = inside)."""
    return max(0.0, min(1.0, 0.5 - d))


def sd_round_rect(x, y, cx, cy, hw, hh, r):
    qx, qy = abs(x - cx) - (hw - r), abs(y - cy) - (hh - r)
    return math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - r


def sd_euro_arc(x, y):
    dx, dy = x - EURO_C[0], y - EURO_C[1]
    r = math.hypot(dx, dy)
    mid = (EURO_R_OUT + EURO_R_IN) / 2
    half = (EURO_R_OUT - EURO_R_IN) / 2
    ang = abs(math.degrees(math.atan2(dy, dx)))  # 0 = right
    d_ring = abs(r - mid) - half
    if ang >= EURO_GAP_DEG:
        return d_ring
    # inside the gap: distance to the nearer round end cap
    a = math.radians(EURO_GAP_DEG)
    ex, ey = mid * math.cos(a), mid * math.sin(a)
    return math.hypot(dx - ex, abs(dy) - ey) - half


def pixel(x, y, layer):
    """RGBA (0..255 floats) of one pixel at 1024-space position."""
    if layer == "background":
        base = lerp(SKY_TOP, SKY_BOTTOM, y / HORIZON) if y < HORIZON else \
            lerp(SEA_TOP, SEA_BOTTOM, (y - HORIZON) / (1024 - HORIZON))
        return (*base, 255.0)

    col, alpha = (0.0, 0.0, 0.0), 0.0
    if layer == "full":
        base = lerp(SKY_TOP, SKY_BOTTOM, y / HORIZON) if y < HORIZON else \
            lerp(SEA_TOP, SEA_BOTTOM, (y - HORIZON) / (1024 - HORIZON))
        col, alpha = base, 1.0

    def paint(c, a):
        nonlocal col, alpha
        if a <= 0:
            return
        out_a = a + alpha * (1 - a)
        col = tuple((c[i] * a + col[i] * alpha * (1 - a)) / out_a for i in range(3))
        alpha = out_a

    # sun disc, only above the horizon
    d_sun = math.hypot(x - SUN_C[0], y - SUN_C[1]) - SUN_R
    paint(SUN_COL, min(cov(d_sun), cov(y - HORIZON)))
    # euro sign inside the sun
    d_eu = sd_euro_arc(x, y)
    for x0, x1, yc in EURO_BARS:
        d_eu = min(d_eu, sd_round_rect(x, y, (x0 + x1) / 2, yc, (x1 - x0) / 2, BAR_HALF, 3))
    paint(EURO_COL, cov(d_eu) * cov(d_sun + 6))
    # reflection stripes in the sea
    for yc, w in STRIPES:
        d = sd_round_rect(x, y, 512, yc, w / 2, STRIPE_HALF, STRIPE_HALF)
        paint(SUN_COL, cov(d) * 0.65)
    return (*col, alpha * 255.0)


def render(size, layer):
    rows = []
    s = 1024 / size
    for py in range(size):
        row = bytearray([0])
        y = (py + 0.5) * s
        for px in range(size):
            r, g, b, a = pixel((px + 0.5) * s, y, layer)
            row += bytes((round(r), round(g), round(b), round(a)))
        rows.append(bytes(row))
    return rows


def write_png(path, size, layer):
    rows = render(size, layer)
    raw = b"".join(rows)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png)
    print("wrote", os.path.relpath(path, ROOT))


if __name__ == "__main__":
    for name, size in (("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180)):
        write_png(os.path.join(ROOT, "icons", name), size, "full")
    assets = os.path.join(ROOT, "app-android", "assets")
    write_png(os.path.join(assets, "icon-only.png"), 1024, "full")
    write_png(os.path.join(assets, "icon-foreground.png"), 1024, "foreground")
    write_png(os.path.join(assets, "icon-background.png"), 1024, "background")
