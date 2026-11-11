/**
 * Render every brand raster asset from the SVG sources in `apps/web/brand/`.
 *
 *   bun run generate:pwa-icons   (from apps/web)
 *
 * Inputs
 *   brand/ahk-mark.svg        gradient monogram on a rounded tile (icons ≥ 48 px)
 *   brand/ahk-mark-flat.svg   single-colour monogram (favicon 16/32 px)
 *   brand/ahk-lockup.svg      1200×630 Open Graph composition (text set in Inter)
 *
 * Outputs
 *   public/icons/icon-32.png, icon-192.png, icon-512.png, apple-touch-icon.png,
 *   maskable-icon-512.png, public/favicon.ico, public/og-image.png
 *
 * The OG lockup renders text with the system font named in the SVG (Inter). Install Inter
 * or edit the `font-family` in ahk-lockup.svg before regenerating on a machine without it.
 */
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '..');
const BRAND_DIR = join(webRoot, 'brand');
const OUT_DIR = join(webRoot, 'public/icons');
const FAVICON_OUT = join(webRoot, 'public/favicon.ico');
const OG_OUT = join(webRoot, 'public/og-image.png');

const BG_HEX = '#07060B';

const markSvg = await readFile(join(BRAND_DIR, 'ahk-mark.svg'));
const flatSvg = await readFile(join(BRAND_DIR, 'ahk-mark-flat.svg'));
const lockupSvg = await readFile(join(BRAND_DIR, 'ahk-lockup.svg'));

/** Rasterise an SVG to a square PNG. `density` keeps strokes crisp at small sizes. */
async function renderSquare(svg, size) {
    return sharp(svg, { density: Math.max(72, Math.round((size / 512) * 72 * 4)) })
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toBuffer();
}

/**
 * Maskable icon: the mark must sit inside the central 80% safe zone and the canvas must be
 * fully opaque (launchers crop it to a circle or squircle).
 */
async function renderMaskable(svg, size) {
    const inner = Math.round(size * 0.8);
    const mark = await renderSquare(svg, inner);
    const offset = Math.round((size - inner) / 2);
    return sharp({
        create: { width: size, height: size, channels: 4, background: BG_HEX },
    })
        .composite([{ input: mark, left: offset, top: offset }])
        .png({ compressionLevel: 9 })
        .toBuffer();
}

function encodeIco(images) {
    const count = images.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(count, 4);

    const entries = [];
    let dataOffset = 6 + count * 16;

    for (const { width, height, buffer } of images) {
        const entry = Buffer.alloc(16);
        entry.writeUInt8(width >= 256 ? 0 : width, 0);
        entry.writeUInt8(height >= 256 ? 0 : height, 1);
        entry.writeUInt16LE(1, 4);
        entry.writeUInt16LE(32, 6);
        entry.writeUInt32LE(buffer.length, 8);
        entry.writeUInt32LE(dataOffset, 12);
        entries.push(entry);
        dataOffset += buffer.length;
    }

    return Buffer.concat([header, ...entries, ...images.map((img) => img.buffer)]);
}

await mkdir(OUT_DIR, { recursive: true });

const icons = [
    ['icon-512.png', 512, markSvg],
    ['icon-192.png', 192, markSvg],
    ['apple-touch-icon.png', 180, markSvg],
    ['icon-32.png', 32, flatSvg],
];
for (const [name, size, svg] of icons) {
    await writeFile(join(OUT_DIR, name), await renderSquare(svg, size));
}
await writeFile(join(OUT_DIR, 'maskable-icon-512.png'), await renderMaskable(markSvg, 512));

const faviconImages = await Promise.all(
    [16, 32, 48].map(async (size) => ({
        width: size,
        height: size,
        buffer: await renderSquare(size <= 32 ? flatSvg : markSvg, size),
    })),
);
await writeFile(FAVICON_OUT, encodeIco(faviconImages));

await writeFile(
    OG_OUT,
    await sharp(lockupSvg, { density: 144 })
        .resize(1200, 630)
        .flatten({ background: BG_HEX })
        .png({ compressionLevel: 9 })
        .toBuffer(),
);

console.log(`AHK brand assets → ${OUT_DIR}/`);
console.log(`favicon ${FAVICON_OUT}`);
console.log(`OG ${OG_OUT}`);
