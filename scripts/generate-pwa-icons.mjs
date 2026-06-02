// Generates the PWA / home-screen icons from the StudyAce wordmark, on brand
// with the OG image: near-black #06060a background, indigo + purple radial
// glow, "study" in white + "ace" in indigo (#818cf8), stacked.
//
// Run: node scripts/generate-pwa-icons.mjs
// Outputs:
//   public/icon-192.png            (manifest, any)
//   public/icon-512.png            (manifest, any)
//   public/icon-maskable-512.png   (manifest, maskable — extra safe-zone padding)
//   src/app/icon.png               (browser/tab icon, Next file convention)
//   src/app/apple-icon.png         (iOS home screen, Next file convention)

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

// mode: "full" packs the wordmark larger; "safe" shrinks it into the centre
// ~80% so it survives Android's circular/rounded maskable crop and iOS rounding.
function svg(size, mode) {
  const fs0 = Math.round(size * (mode === "safe" ? 0.205 : 0.265));
  const cap = fs0 * 0.72;
  const gap = Math.round(fs0 * 0.9);
  const b1 = Math.round((size - fs0 * 0.18) / 2);
  const b2 = b1 + gap;
  const ls = -(fs0 * 0.03); // tight letter-spacing like the wordmark
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="g1" cx="30%" cy="22%" r="80%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.40"/>
      <stop offset="55%" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="78%" cy="82%" r="75%">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.30"/>
      <stop offset="55%" stop-color="#a855f7" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="#06060a"/>
  <rect width="${size}" height="${size}" fill="url(#g1)"/>
  <rect width="${size}" height="${size}" fill="url(#g2)"/>
  <g font-family="Helvetica, Arial, sans-serif" font-weight="800" text-anchor="middle" letter-spacing="${ls}">
    <text x="50%" y="${b1}" font-size="${fs0}" fill="#ffffff">study</text>
    <text x="50%" y="${b2}" font-size="${fs0}" fill="#818cf8">ace</text>
  </g>
</svg>`;
  void cap;
}

const root = path.resolve(".");
async function write(rel, size, mode) {
  const out = path.join(root, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(Buffer.from(svg(size, mode))).png().toFile(out);
  console.log("wrote", rel, `${size}x${size}`, mode);
}

await write("public/icon-192.png", 192, "full");
await write("public/icon-512.png", 512, "full");
await write("public/icon-maskable-512.png", 512, "safe");
await write("src/app/icon.png", 512, "full");
await write("src/app/apple-icon.png", 180, "safe");
console.log("done");
