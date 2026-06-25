// Generates the StudyAce browser favicon — the "ace" of studyace, drawn as a
// clean spade pip that stays legible at 16-32px tab size (the full "studyace"
// wordmark, and even a letter monogram, turn to mush that small).
//
// Mark: a single spade (the card-suit symbol — an original vector, not stock art)
// in the indigo accent #818cf8, the same accent that colours "ace" in the wordmark.
// TRANSPARENT background ("clear") so it sits on light or dark browser chrome and
// shows the suit silhouette cleanly. Centred in a 100-unit box, scales to any size.
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

// Spade pip, apex up, with the classic flared stem — drawn in a 100×100 box.
const SPADE = `M50 11
  C 50 31 78 44 78 63 C 78 74 70 80 61 78 C 56 77 52 73 50.5 69
  C 51 78 54 86 60 90 L 40 90 C 46 86 49 78 49.5 69
  C 48 73 44 77 39 78 C 30 80 22 74 22 63 C 22 44 50 31 50 11 Z`;

function svg(size) {
  // Transparent background; spade in the indigo "ace" accent.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <path d="${SPADE}" fill="#818cf8"/>
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
