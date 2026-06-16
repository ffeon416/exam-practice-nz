// Generates the StudyAce browser favicon — a compact monogram that stays legible
// at 16-32px tab size (the full "studyace" wordmark turns to mush that small).
//
// Mark: bold lowercase "a" in the indigo accent (#818cf8) — the same accent that
// colours "ace" in the wordmark — on the brand near-black #06060a with the indigo +
// purple radial glow from the OG image. Square mark scales cleanly to any size.
//
// Run: node scripts/generate-favicon.mjs
// Outputs:
//   src/app/favicon.ico   (16 + 32 + 48, multi-resolution — browser tab)
//   src/app/icon.png      (512, high-DPI tab icon, Next file convention)
//
// NOTE: home-screen / PWA icons stay the full WORDMARK on purpose (they have room);
// regenerate those with scripts/generate-pwa-icons.mjs.

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

function svg(size) {
  const fs0 = Math.round(size * 0.74); // big single glyph for small-size legibility
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#06060a"/>
  <text x="50%" y="51%" font-family="Helvetica, Arial, sans-serif" font-weight="800"
        font-size="${fs0}" letter-spacing="${-(fs0 * 0.03)}" fill="#818cf8"
        text-anchor="middle" dominant-baseline="central">a</text>
</svg>`;
}

const root = path.resolve(".");
const png = (size) => sharp(Buffer.from(svg(size))).png().toBuffer();

// Assemble a multi-resolution .ico (container of PNG-compressed entries).
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach((e, i) => {
    const b = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b + 0); // width
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, b + 1); // height
    dir.writeUInt8(0, b + 2); // palette
    dir.writeUInt8(0, b + 3); // reserved
    dir.writeUInt16LE(1, b + 4); // colour planes
    dir.writeUInt16LE(32, b + 6); // bits per pixel
    dir.writeUInt32LE(e.data.length, b + 8); // bytes in resource
    dir.writeUInt32LE(offset, b + 12); // offset
    offset += e.data.length;
  });

  return Buffer.concat([header, dir, ...entries.map((e) => e.data)]);
}

async function write(rel, buf) {
  const out = path.join(root, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  console.log("wrote", rel, `${buf.length} bytes`);
}

const icoSizes = [16, 32, 48];
const icoEntries = await Promise.all(
  icoSizes.map(async (size) => ({ size, data: await png(size) }))
);
await write("src/app/favicon.ico", buildIco(icoEntries));
await write("src/app/icon.png", await png(512));
console.log("done");
