from __future__ import annotations

import math
import os
import random
from dataclasses import dataclass
from typing import Iterable, Tuple

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


W = 6144
H = 1536
CENTER_X = W // 2
ASSET_SHEET = os.path.join("src", "assets", "maps", "backgroundsforgames", "anglearenaassets.png")


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def clamp(v: float, lo: float, hi: float) -> float:
    return lo if v < lo else hi if v > hi else v


def make_vertical_gradient(size: Tuple[int, int], top: Tuple[int, int, int], bottom: Tuple[int, int, int]) -> Image.Image:
    w, h = size
    base = Image.new("RGB", (1, h), (0, 0, 0))
    px = base.load()
    for y in range(h):
        t = y / max(1, h - 1)
        px[0, y] = (
            int(lerp(top[0], bottom[0], t)),
            int(lerp(top[1], bottom[1], t)),
            int(lerp(top[2], bottom[2], t)),
        )
    return base.resize((w, h), Image.Resampling.BILINEAR)


def add_soft_stars(img: Image.Image, rng: random.Random, count: int) -> None:
    draw = ImageDraw.Draw(img, "RGBA")
    for _ in range(count):
        x = rng.randint(0, W - 1)
        y = rng.randint(0, int(H * 0.62))
        r = rng.choice([1, 1, 1, 2, 2, 3])
        a = rng.randint(25, 120)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(240, 248, 255, a))
    # Tiny glow
    glow = img.filter(ImageFilter.GaussianBlur(1.2))
    img.paste(glow, (0, 0), glow.split()[-1])


def _is_bg_pixel(rgb: Tuple[int, int, int], threshold: int = 245) -> bool:
    r, g, b = rgb
    return r >= threshold and g >= threshold and b >= threshold


def extract_sprites_from_sheet(sheet: Image.Image) -> list[tuple[Tuple[int, int, int, int], Image.Image]]:
    """
    Extract sprite bboxes from a white-background sheet.

    Strategy:
    - build a foreground mask (non-white pixels)
    - connected-component label on a downscaled mask for speed
    - scale bboxes back to original coords with padding
    - create alpha via flood fill from crop edges (only removes background connected to border)

    Returns: list of (bbox_in_sheet, sprite_rgba)
    """
    if sheet.mode != "RGB":
        sheet = sheet.convert("RGB")

    sw, sh = sheet.size
    scale = 2
    mw, mh = sw // scale, sh // scale
    small = sheet.resize((mw, mh), Image.Resampling.BILINEAR)
    small_px = small.load()

    mask = [[False] * mw for _ in range(mh)]
    for y in range(mh):
        for x in range(mw):
            mask[y][x] = not _is_bg_pixel(small_px[x, y], 247)

    visited = [[False] * mw for _ in range(mh)]
    components: list[Tuple[int, int, int, int]] = []

    for y in range(mh):
        for x in range(mw):
            if visited[y][x] or not mask[y][x]:
                continue
            # BFS
            q = [(x, y)]
            visited[y][x] = True
            minx = maxx = x
            miny = maxy = y
            while q:
                cx, cy = q.pop()
                if cx < minx:
                    minx = cx
                if cx > maxx:
                    maxx = cx
                if cy < miny:
                    miny = cy
                if cy > maxy:
                    maxy = cy
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if nx < 0 or ny < 0 or nx >= mw or ny >= mh:
                        continue
                    if visited[ny][nx] or not mask[ny][nx]:
                        continue
                    visited[ny][nx] = True
                    q.append((nx, ny))

            # Filter tiny specks
            bw = (maxx - minx + 1)
            bh = (maxy - miny + 1)
            if bw * bh < 120:
                continue
            # scale up, add padding
            pad = 6 * scale
            x0 = max(0, minx * scale - pad)
            y0 = max(0, miny * scale - pad)
            x1 = min(sw, (maxx + 1) * scale + pad)
            y1 = min(sh, (maxy + 1) * scale + pad)
            components.append((x0, y0, x1, y1))

    # Merge boxes that overlap (rare, but helps keep multi-part sprites together)
    merged: list[Tuple[int, int, int, int]] = []
    for box in sorted(components, key=lambda b: (b[1], b[0])):
        x0, y0, x1, y1 = box
        did_merge = False
        for i, (mx0, my0, mx1, my1) in enumerate(merged):
            if not (x1 < mx0 or x0 > mx1 or y1 < my0 or y0 > my1):
                merged[i] = (min(x0, mx0), min(y0, my0), max(x1, mx1), max(y1, my1))
                did_merge = True
                break
        if not did_merge:
            merged.append(box)

    results: list[tuple[Tuple[int, int, int, int], Image.Image]] = []
    for (x0, y0, x1, y1) in merged:
        crop = sheet.crop((x0, y0, x1, y1)).convert("RGBA")
        cw, ch = crop.size
        crop_px = crop.load()
        alpha = Image.new("L", (cw, ch), 255)
        a_px = alpha.load()

        # Flood-fill from edges to find background connected to border
        q2: list[Tuple[int, int]] = []
        seen = [[False] * cw for _ in range(ch)]

        def push(px: int, py: int) -> None:
            if px < 0 or py < 0 or px >= cw or py >= ch:
                return
            if seen[py][px]:
                return
            seen[py][px] = True
            q2.append((px, py))

        # seed edges
        for ix in range(cw):
            push(ix, 0)
            push(ix, ch - 1)
        for iy in range(ch):
            push(0, iy)
            push(cw - 1, iy)

        while q2:
            px, py = q2.pop()
            r, g, b, _ = crop_px[px, py]
            if _is_bg_pixel((r, g, b), 245):
                a_px[px, py] = 0
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < cw and 0 <= ny < ch and not seen[ny][nx]:
                        seen[ny][nx] = True
                        q2.append((nx, ny))

        # Feather edge slightly to reduce jaggies
        alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))
        crop.putalpha(alpha)
        results.append(((x0, y0, x1, y1), crop))

    return results


def categorize_sprites(sheet: Image.Image) -> dict[str, list[Image.Image]]:
    if not os.path.exists(ASSET_SHEET):
        return {}

    extracted = extract_sprites_from_sheet(sheet)
    buckets: dict[str, list[Image.Image]] = {
        "trees": [],
        "rocks": [],
        "ruins": [],
        "plants": [],
        "ground": [],
        "sky": [],
        "props": [],
    }
    sw, sh = sheet.size
    for (x0, y0, x1, y1), sprite in extracted:
        cy = (y0 + y1) / 2.0
        bw = x1 - x0
        bh = y1 - y0
        rel_y = cy / sh

        if rel_y < 0.20:
            buckets["trees"].append(sprite)
        elif rel_y < 0.34:
            buckets["rocks"].append(sprite)
        elif rel_y < 0.52:
            # ruins/platforms/banner
            buckets["ruins"].append(sprite)
        elif rel_y < 0.70:
            buckets["plants"].append(sprite)
        elif rel_y < 0.86:
            # terrain chunks + impact patches
            buckets["ground"].append(sprite)
        else:
            # clouds/mountains/props
            if bw > 190 and bh < 120:
                buckets["sky"].append(sprite)
            else:
                buckets["props"].append(sprite)

    return buckets


def paste_sprite(
    layer: Image.Image,
    sprite: Image.Image,
    x: int,
    y: int,
    scale: float,
    alpha: float = 1.0,
    flip: bool = False,
) -> None:
    if scale <= 0:
        return
    s = sprite
    if flip:
        s = s.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    w, h = s.size
    nw = max(1, int(w * scale))
    nh = max(1, int(h * scale))
    s2 = s.resize((nw, nh), Image.Resampling.LANCZOS)
    if alpha < 1.0:
        a = s2.split()[-1]
        a = a.point(lambda v: int(v * alpha))
        s2.putalpha(a)
    layer.alpha_composite(s2, (x - nw // 2, y - nh))


def make_cloud_field(rng: random.Random, strength: float, scale: float, tint: Tuple[int, int, int]) -> Image.Image:
    # Start with noise, blur into cloud blobs, and colorize.
    noise_w = max(256, int(W / scale))
    noise_h = max(256, int(H / scale))
    noise = Image.effect_noise((noise_w, noise_h), rng.uniform(55, 95)).convert("L")
    noise = noise.filter(ImageFilter.GaussianBlur(rng.uniform(1.6, 2.8)))
    noise = noise.resize((W, H), Image.Resampling.BICUBIC)

    # Push midtones into usable alpha.
    def curve(v: int) -> int:
        t = v / 255.0
        t = (t - 0.42) / 0.58
        t = clamp(t, 0.0, 1.0)
        t = t * t * (3 - 2 * t)  # smoothstep
        return int(255 * t * strength)

    alpha = noise.point(curve)

    col = Image.new("RGBA", (W, H), (tint[0], tint[1], tint[2], 0))
    col.putalpha(alpha)
    return col


def vignette_alpha(inner: float = 0.1, outer: float = 0.9) -> Image.Image:
    # Elliptical vignette used as subtle framing (no hard borders).
    base = Image.new("L", (W, H), 255)
    mask = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(mask)
    pad_x = int(W * inner)
    pad_y = int(H * inner)
    draw.ellipse((pad_x, pad_y, W - pad_x, H - pad_y), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(int(W * (outer - inner) * 0.06)))
    return ImageChops.screen(base, mask)


def draw_ruin_cluster(draw: ImageDraw.ImageDraw, rng: random.Random, x: int, base_y: int, scale: float, tone: Tuple[int, int, int, int]) -> None:
    # Chunky fantasy ruin silhouettes with a few blocks.
    w = int(260 * scale)
    h = int(220 * scale)
    x0 = x - w // 2
    y0 = base_y - h
    # Main block
    draw.rounded_rectangle((x0, y0, x0 + w, base_y), radius=int(22 * scale), fill=tone)
    # Broken top cutouts
    for _ in range(rng.randint(2, 4)):
        cut_w = int(rng.uniform(0.18, 0.32) * w)
        cut_h = int(rng.uniform(0.10, 0.22) * h)
        cx = rng.randint(x0 + int(0.08 * w), x0 + w - cut_w - int(0.08 * w))
        cy = rng.randint(y0, y0 + int(0.25 * h))
        draw.rounded_rectangle((cx, cy, cx + cut_w, cy + cut_h), radius=int(10 * scale), fill=(0, 0, 0, 0))
    # Pillars
    for _ in range(rng.randint(1, 3)):
        pw = int(rng.uniform(0.10, 0.16) * w)
        ph = int(rng.uniform(0.55, 0.95) * h)
        px = rng.randint(x0 + int(0.05 * w), x0 + w - pw - int(0.05 * w))
        py = base_y - ph
        draw.rounded_rectangle((px, py, px + pw, base_y), radius=int(14 * scale), fill=tone)


def draw_wood_scaffold(draw: ImageDraw.ImageDraw, rng: random.Random, x: int, base_y: int, scale: float) -> None:
    # Simple wooden frame for targets/impacts.
    w = int(220 * scale)
    h = int(200 * scale)
    x0 = x - w // 2
    y0 = base_y - h
    wood = (132, 86, 44, int(180 * scale))
    beam = max(3, int(8 * scale))
    # Vertical beams
    draw.rectangle((x0, y0, x0 + beam, base_y), fill=wood)
    draw.rectangle((x0 + w - beam, y0 + int(0.10 * h), x0 + w, base_y), fill=wood)
    # Cross beams
    for t in [0.18, 0.46, 0.74]:
        yy = int(lerp(y0, base_y, t))
        draw.rectangle((x0, yy, x0 + w, yy + beam), fill=wood)
    # Diagonal braces
    draw.line((x0, base_y, x0 + w, y0 + int(0.22 * h)), fill=(150, 105, 62, 170), width=max(2, beam - 2))
    draw.line((x0, y0 + int(0.22 * h), x0 + w, base_y), fill=(150, 105, 62, 170), width=max(2, beam - 2))
    # Small hanging planks
    if rng.random() < 0.7:
        plank_w = int(86 * scale)
        plank_h = int(26 * scale)
        px = x0 + int(0.55 * w)
        py = y0 + int(0.52 * h)
        draw.rounded_rectangle((px, py, px + plank_w, py + plank_h), radius=int(8 * scale), fill=(120, 78, 40, 160))


def build_mid_layer(rng: random.Random) -> Image.Image:
    mid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(mid, "RGBA")
    horizon_y = int(H * 0.77)

    # Keep centre clear for launch zone: avoid decorations in this window.
    clear_min = CENTER_X - 620
    clear_max = CENTER_X + 620

    def allowed(x: int) -> bool:
        return not (clear_min <= x <= clear_max)

    # Floating islands / silhouettes (distant)
    for side in [-1, 1]:
        for i in range(7):
            x = int(CENTER_X + side * rng.uniform(980, 2920))
            if not allowed(x):
                continue
            y = int(H * rng.uniform(0.34, 0.58))
            s = rng.uniform(0.65, 1.25)
            w = int(260 * s)
            h = int(90 * s)
            col = (46, 72, 130, rng.randint(80, 120))
            draw.ellipse((x - w, y - h, x + w, y + h), fill=col)
            draw.ellipse((x - int(0.55 * w), y - int(0.25 * h), x + int(0.65 * w), y + int(0.65 * h)), fill=(60, 96, 165, int(col[3] * 0.85)))

    # Left/right ruin zones and scaffolds (mid silhouettes)
    for side in [-1, 1]:
        for i in range(6):
            x = int(CENTER_X + side * rng.uniform(1050, 2860))
            if not allowed(x):
                continue
            y = horizon_y - rng.randint(0, 70)
            s = rng.uniform(0.72, 1.18)
            tone = (64, 92, 165, rng.randint(90, 140))
            draw_ruin_cluster(draw, rng, x, y, s, tone)

        for i in range(5):
            x = int(CENTER_X + side * rng.uniform(1200, 2920))
            if not allowed(x):
                continue
            y = horizon_y - rng.randint(0, 55)
            s = rng.uniform(0.7, 1.1)
            draw_wood_scaffold(draw, rng, x, y, s)

    # Asset sheet elements (ruins/platforms/trees) to give the scene real art.
    if os.path.exists(ASSET_SHEET):
        sheet = Image.open(ASSET_SHEET).convert("RGB")
        buckets = categorize_sprites(sheet)
        ruins = buckets.get("ruins", [])
        trees = buckets.get("trees", [])
        rocks = buckets.get("rocks", [])

        def mirrored_x(base_x: int) -> int:
            return CENTER_X + (CENTER_X - base_x)

        # Place a few mirrored clusters left/right, keeping the centre clear.
        for i in range(7):
            base_x = int(CENTER_X - rng.uniform(980, 2920))
            if clear_min <= base_x <= clear_max:
                continue
            base_y = horizon_y - rng.randint(0, 60)
            pick = None
            if ruins and rng.random() < 0.65:
                pick = rng.choice(ruins)
                s = rng.uniform(0.62, 1.05)
                paste_sprite(mid, pick, base_x, base_y, s, alpha=0.98, flip=False)
                paste_sprite(mid, pick, mirrored_x(base_x), base_y, s, alpha=0.98, flip=True)
            elif trees:
                pick = rng.choice(trees)
                s = rng.uniform(0.55, 0.95)
                paste_sprite(mid, pick, base_x, base_y + rng.randint(10, 35), s, alpha=0.92, flip=False)
                paste_sprite(mid, pick, mirrored_x(base_x), base_y + rng.randint(10, 35), s, alpha=0.92, flip=True)
            elif rocks:
                pick = rng.choice(rocks)
                s = rng.uniform(0.55, 0.9)
                paste_sprite(mid, pick, base_x, base_y + rng.randint(20, 60), s, alpha=0.92, flip=False)
                paste_sprite(mid, pick, mirrored_x(base_x), base_y + rng.randint(20, 60), s, alpha=0.92, flip=True)

    # Subtle glow particles (mid)
    for _ in range(180):
        x = rng.randint(0, W - 1)
        y = rng.randint(int(H * 0.22), int(H * 0.78))
        r = rng.choice([1, 1, 2, 2, 3])
        a = rng.randint(10, 55)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(186, 230, 253, a))

    # Soft blur for cohesion
    mid = mid.filter(ImageFilter.GaussianBlur(0.6))
    return mid


def build_foreground_layer(rng: random.Random) -> Image.Image:
    fg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(fg, "RGBA")
    horizon_y = int(H * 0.78)

    # Build a low, varied ground silhouette with impact-friendly flats.
    pts = []
    x = 0
    y = horizon_y
    while x <= W:
        # flatter in the centre; more variation at edges
        dist = abs(x - CENTER_X) / (W / 2)
        amp = lerp(18, 64, dist)
        dx = rng.randint(90, 170)
        y = horizon_y + int(rng.uniform(-amp, amp) * 0.45)
        pts.append((x, y))
        x += dx
    pts.append((W, H))
    pts.append((0, H))

    ground_fill = (30, 58, 90, 255)
    draw.polygon(pts, fill=ground_fill)

    # Overlay asset ground chunks and foliage for a richer AAA-ish foreground.
    if os.path.exists(ASSET_SHEET):
        sheet = Image.open(ASSET_SHEET).convert("RGB")
        buckets = categorize_sprites(sheet)
        ground = buckets.get("ground", [])
        plants = buckets.get("plants", [])
        rocks = buckets.get("rocks", [])
        props = buckets.get("props", [])

        def mirrored_x(base_x: int) -> int:
            return CENTER_X + (CENTER_X - base_x)

        # Big ground platforms: one on left, one on right (leave centre open).
        big_ground = [s for s in ground if s.size[0] >= 320]
        if big_ground:
            left_x = int(CENTER_X - 1900)
            right_x = mirrored_x(left_x)
            gy = horizon_y + 250
            pick = rng.choice(big_ground)
            paste_sprite(fg, pick, left_x, gy, scale=1.6, alpha=1.0, flip=False)
            paste_sprite(fg, pick, right_x, gy, scale=1.6, alpha=1.0, flip=True)

        # Smaller ground clumps across the bottom edges (avoid centre).
        for i in range(14):
            base_x = rng.choice([
                rng.randint(140, CENTER_X - 760),
                rng.randint(CENTER_X + 760, W - 140),
            ])
            base_y = horizon_y + rng.randint(170, 430)
            if ground:
                pick = rng.choice(ground)
                s = rng.uniform(0.85, 1.5)
                paste_sprite(fg, pick, base_x, base_y, s, alpha=0.92, flip=rng.random() < 0.5)

        # Foliage + rocks near edges for depth.
        for i in range(26):
            base_x = rng.choice([
                rng.randint(120, CENTER_X - 820),
                rng.randint(CENTER_X + 820, W - 120),
            ])
            base_y = horizon_y + rng.randint(220, 520)
            if plants and rng.random() < 0.68:
                pick = rng.choice(plants)
                s = rng.uniform(0.7, 1.35)
                paste_sprite(fg, pick, base_x, base_y, s, alpha=0.98, flip=rng.random() < 0.5)
            elif rocks:
                pick = rng.choice(rocks)
                s = rng.uniform(0.6, 1.15)
                paste_sprite(fg, pick, base_x, base_y, s, alpha=0.98, flip=rng.random() < 0.5)

        # A couple of props (lantern/barrel/stump) near the far edges.
        for i in range(4):
            if not props:
                break
            base_x = rng.choice([rng.randint(160, 860), rng.randint(W - 860, W - 160)])
            base_y = horizon_y + rng.randint(260, 520)
            pick = rng.choice(props)
            paste_sprite(fg, pick, base_x, base_y, scale=rng.uniform(0.7, 1.05), alpha=0.95, flip=rng.random() < 0.5)

    # Warm impact clearings left/right (slightly lighter patches).
    for side in [-1, 1]:
        for i in range(4):
            cx = int(CENTER_X + side * rng.uniform(1100, 2850))
            cy = horizon_y + rng.randint(30, 180)
            rx = int(rng.uniform(280, 520))
            ry = int(rng.uniform(90, 160))
            col = (44, 84, 126, rng.randint(120, 160))
            draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=col)

    # Foreground rocks and tufts near edges to keep the centre readable.
    for side in [-1, 1]:
        for i in range(16):
            cx = int(CENTER_X + side * rng.uniform(860, 3000))
            cy = horizon_y + rng.randint(80, 420)
            s = rng.uniform(0.7, 1.45)
            rx = int(55 * s)
            ry = int(34 * s)
            base = (24, 46, 72, rng.randint(160, 230))
            highlight = (70, 120, 170, int(base[3] * 0.35))
            draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=base)
            draw.ellipse((cx - int(rx * 0.55), cy - int(ry * 0.45), cx + int(rx * 0.25), cy + int(ry * 0.05)), fill=highlight)

    # Magical platform hint at centre (subtle; no catapult).
    ring_y = horizon_y + 120
    ring_r = 210
    ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(ring, "RGBA")
    rdraw.ellipse((CENTER_X - ring_r, ring_y - ring_r // 2, CENTER_X + ring_r, ring_y + ring_r // 2), outline=(186, 230, 253, 90), width=6)
    rdraw.ellipse((CENTER_X - ring_r + 18, ring_y - ring_r // 2 + 12, CENTER_X + ring_r - 18, ring_y + ring_r // 2 - 12), outline=(251, 191, 36, 55), width=4)
    ring = ring.filter(ImageFilter.GaussianBlur(1.4))
    fg = Image.alpha_composite(fg, ring)

    # Soft depth haze at bottom
    haze = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(haze, "RGBA")
    hdraw.rectangle((0, int(H * 0.82), W, H), fill=(2, 6, 23, 140))
    haze = haze.filter(ImageFilter.GaussianBlur(24))
    fg = Image.alpha_composite(fg, haze)

    return fg


def build_sky_layer(rng: random.Random) -> Image.Image:
    sky = make_vertical_gradient((W, H), top=(8, 18, 52), bottom=(26, 86, 156)).convert("RGBA")

    # Distant light near horizon (keeps arcs readable)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow, "RGBA")
    gdraw.ellipse((int(W * 0.08), int(H * 0.42), int(W * 0.92), int(H * 1.08)), fill=(59, 130, 246, 65))
    gdraw.ellipse((int(W * 0.16), int(H * 0.50), int(W * 0.84), int(H * 1.00)), fill=(186, 230, 253, 30))
    glow = glow.filter(ImageFilter.GaussianBlur(36))
    sky = Image.alpha_composite(sky, glow)

    # Clouds: layered for parallax-friendly depth.
    c1 = make_cloud_field(rng, strength=0.65, scale=9.0, tint=(214, 241, 255))
    c2 = make_cloud_field(rng, strength=0.46, scale=6.5, tint=(168, 220, 255))
    c3 = make_cloud_field(rng, strength=0.36, scale=4.6, tint=(255, 214, 246))
    sky = Image.alpha_composite(sky, c1)
    sky = Image.alpha_composite(sky, c2)
    sky = Image.alpha_composite(sky, c3)

    # Add asset clouds/mountains as very distant silhouettes.
    if os.path.exists(ASSET_SHEET):
        sheet = Image.open(ASSET_SHEET).convert("RGB")
        buckets = categorize_sprites(sheet)
        sky_sprites = buckets.get("sky", [])
        props = buckets.get("props", [])
        candidates = sky_sprites + [s for s in props if s.size[0] >= 160 and s.size[1] <= 160]
        for i in range(10):
            if not candidates:
                break
            s = rng.choice(candidates)
            x = rng.randint(120, W - 120)
            y = rng.randint(int(H * 0.22), int(H * 0.55))
            sc = rng.uniform(1.2, 2.6) if s.size[0] > 220 else rng.uniform(1.6, 3.2)
            paste_sprite(sky, s, x, y, sc, alpha=0.25, flip=rng.random() < 0.5)

    # Stars and particles.
    add_soft_stars(sky, rng, count=520)

    # Subtle vignette (no borders).
    v = vignette_alpha()
    sky.putalpha(ImageChops.multiply(sky.split()[-1], v))
    return sky


@dataclass
class Outputs:
    sky: str
    mid: str
    foreground: str
    composite: str


def main() -> None:
    seed = int(os.environ.get("SAT_ANGLE_ARENA_SEED", "1337"))
    rng = random.Random(seed)

    out_dir = os.environ.get(
        "SAT_ANGLE_ARENA_OUTDIR",
        os.path.join("src", "assets", "maps", "backgroundsforgames", "angle_arena_panorama"),
    )
    os.makedirs(out_dir, exist_ok=True)

    sky = build_sky_layer(rng)
    mid = build_mid_layer(rng)
    fg = build_foreground_layer(rng)

    composite = Image.alpha_composite(Image.alpha_composite(sky, mid), fg)
    composite = ImageEnhance.Color(composite).enhance(1.05)
    composite = ImageEnhance.Contrast(composite).enhance(1.03)

    outputs = Outputs(
        sky=os.path.join(out_dir, "angle-arena-sky-6144x1536.png"),
        mid=os.path.join(out_dir, "angle-arena-mid-6144x1536.png"),
        foreground=os.path.join(out_dir, "angle-arena-foreground-6144x1536.png"),
        composite=os.path.join(out_dir, "angle-arena-composite-6144x1536.png"),
    )

    sky.save(outputs.sky)
    mid.save(outputs.mid)
    fg.save(outputs.foreground)
    composite.save(outputs.composite)

    print("Wrote:")
    print(outputs.sky)
    print(outputs.mid)
    print(outputs.foreground)
    print(outputs.composite)


if __name__ == "__main__":
    main()
