#!/usr/bin/env node
/**
 * Icon generation script using sharp (Node.js fallback for environments without ImageMagick).
 * Generates all required favicon and app icon assets from the source logo (SVG or PNG).
 */

const path = require('path');
const fs = require('fs');

const SOURCE = path.resolve('documentation/static/img/soroban-logo.png');
const OUT_IMG = path.resolve('documentation/static/img');
const ICONS_DIR = path.resolve('documentation/static/img/icons');

const SIZES = [
  { size: 16,  name: 'favicon-16x16.png' },
  { size: 32,  name: 'favicon-32x32.png' },
  { size: 48,  name: 'favicon-48x48.png' },
  { size: 120, name: 'apple-touch-icon-120x120.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 167, name: 'apple-touch-icon-167x167.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
];

const PWA_SIZES = [
  { size: 192, name: 'pwa-icon-192x192.png' },
  { size: 512, name: 'pwa-icon-512x512.png' },
];

const PNG_OPTS = { compressionLevel: 9, effort: 10 };

function resizeLogo(sharp, sourceBuffer, size) {
  return sharp(sourceBuffer)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png(PNG_OPTS);
}

async function generatePNGs(sharp) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
  const sourceBuffer = fs.readFileSync(SOURCE);

  for (const { size, name } of SIZES) {
    const outFile = path.join(ICONS_DIR, name);
    await resizeLogo(sharp, sourceBuffer, size).toFile(outFile);
    console.log(`  Generated ${size}x${size}: ${outFile}`);
  }
}

async function generatePwaIcons(sharp) {
  const sourceBuffer = fs.readFileSync(SOURCE);
  for (const { size, name } of PWA_SIZES) {
    const outFile = path.join(OUT_IMG, name);
    await resizeLogo(sharp, sourceBuffer, size).toFile(outFile);
    console.log(`  Generated PWA ${size}x${size}: ${outFile}`);
  }
}

/**
 * Build a minimal ICO file from PNG buffers.
 * ICO format: ICONDIR header + ICONDIRENTRY[] + image data
 */
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + 16 * count;
  let dataOffset = headerSize;

  const entries = [];
  for (const buf of pngBuffers) {
    entries.push({ buf, offset: dataOffset });
    dataOffset += buf.length;
  }

  const totalSize = dataOffset;
  const ico = Buffer.alloc(totalSize);

  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(count, 4);

  for (let i = 0; i < count; i++) {
    const { buf, offset } = entries[i];
    const base = 6 + i * 16;
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    ico.writeUInt8(w >= 256 ? 0 : w, base);
    ico.writeUInt8(h >= 256 ? 0 : h, base + 1);
    ico.writeUInt8(0, base + 2);
    ico.writeUInt8(0, base + 3);
    ico.writeUInt16LE(1, base + 4);
    ico.writeUInt16LE(32, base + 6);
    ico.writeUInt32LE(buf.length, base + 8);
    ico.writeUInt32LE(offset, base + 12);
  }

  for (const { buf, offset } of entries) {
    buf.copy(ico, offset);
  }

  return ico;
}

async function generateIco(sharp) {
  const icoSizes = [16, 32, 48];
  const sourceBuffer = fs.readFileSync(SOURCE);
  const pngBuffers = [];

  for (const size of icoSizes) {
    const buf = await resizeLogo(sharp, sourceBuffer, size).toBuffer();
    pngBuffers.push(buf);
  }

  const icoBuffer = buildIco(pngBuffers);
  const outFile = path.join(OUT_IMG, 'favicon.ico');
  fs.writeFileSync(outFile, icoBuffer);
  console.log(`  Generated favicon.ico: ${outFile}`);
}

async function generateFaviconSvg(sharp) {
  const outFile = path.join(OUT_IMG, 'favicon.svg');

  if (SOURCE.endsWith('.svg')) {
    const svgContent = fs.readFileSync(SOURCE, 'utf8');
    const cleaned = svgContent
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s*xmlns:inkscape="[^"]*"/g, '')
      .replace(/\s*xmlns:sodipodi="[^"]*"/g, '')
      .replace(/<metadata[\s\S]*?<\/metadata>/g, '')
      .trim();
    fs.writeFileSync(outFile, cleaned, 'utf8');
  } else {
    const size = 32;
    const pngBuf = await resizeLogo(sharp, fs.readFileSync(SOURCE), size).toBuffer();
    const b64 = pngBuf.toString('base64');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${size} ${size}"><image width="${size}" height="${size}" xlink:href="data:image/png;base64,${b64}"/></svg>`;
    fs.writeFileSync(outFile, svg, 'utf8');
  }

  console.log(`  Generated favicon.svg: ${outFile}`);
}

function logFileSizes(label, files) {
  console.log(`\n${label}:`);
  let total = 0;
  for (const f of files) {
    if (fs.existsSync(f)) {
      const bytes = fs.statSync(f).size;
      total += bytes;
      console.log(`  ${String(bytes).padStart(8)} bytes  ${f}`);
    } else {
      console.warn(`  MISSING: ${f}`);
    }
  }
  console.log(`  ${'--------'}`);
  console.log(`  ${String(total).padStart(8)} bytes  total`);
  return total;
}

function checkSizes() {
  const faviconBundle = [
    path.join(OUT_IMG, 'favicon.ico'),
    path.join(ICONS_DIR, 'favicon-16x16.png'),
    path.join(ICONS_DIR, 'favicon-32x32.png'),
    path.join(ICONS_DIR, 'favicon-48x48.png'),
  ];
  if (fs.existsSync(path.join(OUT_IMG, 'favicon.svg'))) {
    faviconBundle.push(path.join(OUT_IMG, 'favicon.svg'));
  }

  const touchAndPwa = [
    ...SIZES.filter(({ size }) => size > 48).map(({ name }) => path.join(ICONS_DIR, name)),
    ...PWA_SIZES.map(({ name }) => path.join(OUT_IMG, name)),
  ];

  const faviconTotal = logFileSizes('Favicon bundle (100KB budget)', faviconBundle);
  logFileSizes('Touch / PWA icons (excluded from favicon budget)', touchAndPwa);

  if (faviconTotal >= 102400) {
    console.error(
      `\nWARNING: Favicon bundle size (${faviconTotal} bytes) exceeds 100KB limit (102400 bytes).`,
    );
    process.exit(1);
  }
}

async function main() {
  const sharpPath = path.resolve('documentation/node_modules/sharp');
  let sharp;
  try {
    sharp = require(sharpPath);
  } catch {
    try {
      sharp = require('sharp');
    } catch {
      console.error('ERROR: sharp module not found. Run: cd documentation && npm install --save-dev sharp');
      process.exit(1);
    }
  }

  if (!fs.existsSync(SOURCE)) {
    console.error(`ERROR: Source logo not found at '${SOURCE}'`);
    process.exit(1);
  }

  console.log(`Generating icons from ${SOURCE}...`);
  await generatePNGs(sharp);
  await generatePwaIcons(sharp);
  await generateIco(sharp);
  await generateFaviconSvg(sharp);
  checkSizes();
  console.log('\nDone. All icons generated successfully.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
