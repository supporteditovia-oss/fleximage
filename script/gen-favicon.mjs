import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "../client/public");

function gemSvg(size, withBg = true) {
  const pad = size * 0.12;
  const scale = (size - pad * 2) / 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${withBg ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#f7f4ed"/>` : ""}
  <g transform="translate(${pad},${pad}) scale(${scale})">
    <path d="M6 3h12l4 6-10 13L2 9Z" fill="none" stroke="#c9a227" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M11 3 8 9l4 13 4-13-3-6" fill="none" stroke="#c9a227" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M2 9h20" fill="none" stroke="#c9a227" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

async function main() {
  await sharp(Buffer.from(gemSvg(180))).png().toFile(path.join(out, "apple-touch-icon.png"));
  await sharp(Buffer.from(gemSvg(32))).png().toFile(path.join(out, "favicon-32.png"));
  await sharp(Buffer.from(gemSvg(16))).png().toFile(path.join(out, "favicon-16.png"));
  // Safari / Chrome request /favicon.ico — ship a real PNG-based ICO via 32px PNG bytes
  // (modern browsers accept PNG data inside .ico containers poorly; use png-to-ico if present)
  let wroteIco = false;
  try {
    const pngToIco = (await import("png-to-ico")).default;
    const ico = await pngToIco([
      path.join(out, "favicon-16.png"),
      path.join(out, "favicon-32.png"),
    ]);
    fs.writeFileSync(path.join(out, "favicon.ico"), ico);
    fs.writeFileSync(path.join(out, "logo.ico"), ico);
    wroteIco = true;
  } catch {
    // Fallback: copy 32px PNG as favicon.ico is wrong; keep PNG and point HTML to it
    const png32 = fs.readFileSync(path.join(out, "favicon-32.png"));
    fs.writeFileSync(path.join(out, "favicon.ico"), png32);
    fs.writeFileSync(path.join(out, "logo.ico"), png32);
  }
  console.log("favicon assets written", { wroteIco });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
