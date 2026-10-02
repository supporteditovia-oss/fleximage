/**
 * When OneShot is unavailable, DeepInfra edits accept only one file.
 * Side-by-side composite: LEFT = scene, RIGHT = target reference (e.g. RS3).
 */
async function fetchImageBuffer(url) {
  const res = await fetch(String(url).trim(), {
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`dual_ref_fetch_${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 256) throw new Error("dual_ref_empty");
  return buf;
}

async function buildDualReferenceCompositePng(sceneUrl, targetUrl) {
  const sharp = require("sharp");
  const panelHeight = 640;
  const panelWidth = 480;
  const gap = 12;

  const [sceneBuf, targetBuf] = await Promise.all([
    fetchImageBuffer(sceneUrl),
    fetchImageBuffer(targetUrl),
  ]);

  const left = await sharp(sceneBuf)
    .resize(panelWidth, panelHeight, { fit: "contain", background: "#1a1a1a" })
    .png()
    .toBuffer();
  const right = await sharp(targetBuf)
    .resize(panelWidth, panelHeight, { fit: "contain", background: "#1a1a1a" })
    .png()
    .toBuffer();

  const totalWidth = panelWidth * 2 + gap;
  const labelSvg = (text, x) =>
    Buffer.from(
      `<svg width="${panelWidth}" height="36"><text x="${x}" y="26" fill="#ffffff" font-size="22" font-family="sans-serif">${text}</text></svg>`,
    );

  return sharp({
    create: {
      width: totalWidth,
      height: panelHeight + 40,
      channels: 3,
      background: "#0d0d0d",
    },
  })
    .composite([
      { input: labelSvg("SCENE (image 1)", 12), top: 4, left: 0 },
      {
        input: labelSvg("TARGET CAR (image 2)", 12),
        top: 4,
        left: panelWidth + gap,
      },
      { input: left, top: 40, left: 0 },
      { input: right, top: 40, left: panelWidth + gap },
    ])
    .png()
    .toBuffer();
}

const DUAL_REF_COMPOSITE_PROMPT_PREFIX =
  "INPUT is one wide reference sheet: LEFT panel labeled SCENE = the photo to edit; RIGHT panel labeled TARGET CAR = the exact vehicle to copy. " +
  "OUTPUT must be a SINGLE photoreal photo: the LEFT scene with ONLY the car replaced by the TARGET CAR (color, body, wheels, badges from RIGHT). " +
  "Do NOT output a split-screen. Keep LEFT background, pose, camera, lighting, plate/decals. ";

function wrapPromptForDualReferenceComposite(prompt) {
  const p = String(prompt || "").trim();
  return `${DUAL_REF_COMPOSITE_PROMPT_PREFIX}${p}`.slice(0, 2900);
}

module.exports = {
  buildDualReferenceCompositePng,
  wrapPromptForDualReferenceComposite,
  DUAL_REF_COMPOSITE_PROMPT_PREFIX,
};
