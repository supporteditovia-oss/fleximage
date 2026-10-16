const {
  createKlingMotionTask,
  getKlingMotionStatus,
  mapKlingMotionState,
  extractKlingMotionVideoUrl,
  buildKlingMotionPrompt,
} = require("./kie-kling-motion");
const { ensureKieAccessibleMediaUrl } = require("./kie-file-upload");
const { resolveKlingMotionSourceVideoUrl } = require("./prepare-kling-source-video");
const {
  prepareMotionCleanCompositeImage,
} = require("./motion-control-composite");
const {
  resolveKlingBackgroundSource,
} = require("./video-user-errors");

const AB_VARIANTS = ["video", "image"];

async function prepareSharedMotionAbInputs({
  userId,
  subjectImageUrl,
  sourceVideoUrl,
  userPrompt = "",
}) {
  const uid = String(userId || "ab-test").trim() || "ab-test";
  const motionVideoUrl = await resolveKlingMotionSourceVideoUrl(
    sourceVideoUrl,
    uid,
    { preserveSourceAudio: false },
  );
  const compositeUrl = await prepareMotionCleanCompositeImage({
    userId: uid,
    subjectImageUrl,
    videoUrl: motionVideoUrl,
  });
  const kieVideoUrl = await ensureKieAccessibleMediaUrl(motionVideoUrl, "video");
  const kieImageUrl = await ensureKieAccessibleMediaUrl(compositeUrl, "image");
  const klingPrompt = buildKlingMotionPrompt(
    userPrompt ||
      "Replace the dancer with the person from my photo. Full body, same room.",
  );
  const backgroundSource = resolveKlingBackgroundSource({
    motionCleanCompositeApplied: true,
  });

  return {
    kieVideoUrl,
    kieImageUrl,
    compositeUrl,
    klingPrompt,
    backgroundSource,
    motionVideoUrl,
  };
}

async function submitMotionOrientationAbTasks(shared, mode = "720p") {
  const tasks = {};
  for (const orientation of AB_VARIANTS) {
    const kling = await createKlingMotionTask({
      prompt: shared.klingPrompt,
      inputUrls: [shared.kieImageUrl],
      videoUrls: [shared.kieVideoUrl],
      characterOrientation: orientation,
      backgroundSource: shared.backgroundSource,
      mode,
    });
    tasks[orientation] = {
      taskId: kling.taskId,
      externalTaskId: `kling_${kling.taskId}`,
    };
  }
  return tasks;
}

async function pollMotionAbTasks(tasks, options = {}) {
  const timeoutMs = options.timeoutMs ?? 12 * 60 * 1000;
  const intervalMs = options.intervalMs ?? 12_000;
  const started = Date.now();
  const results = {
    video: { ...tasks.video, state: "waiting", videoUrl: null, failMsg: null },
    image: { ...tasks.image, state: "waiting", videoUrl: null, failMsg: null },
  };

  while (Date.now() - started < timeoutMs) {
    let allDone = true;
    for (const orientation of AB_VARIANTS) {
      const row = results[orientation];
      if (row.state === "success" || row.state === "fail") continue;
      allDone = false;
      const data = await getKlingMotionStatus(row.taskId);
      const state = mapKlingMotionState(data);
      row.state = state;
      if (state === "success") {
        row.videoUrl = extractKlingMotionVideoUrl(data);
        if (!row.videoUrl) row.state = "fail";
      } else if (state === "fail") {
        const { extractKlingFailMessage } = require("./kie-kling-motion");
        row.failMsg = extractKlingFailMessage(data);
      }
    }
    if (allDone) break;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return results;
}

function buildMotionAbCompareHtml(payload) {
  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  const card = (label, row) => {
    if (row.videoUrl) {
      return `<section><h2>${esc(label)}</h2><video controls playsinline src="${esc(row.videoUrl)}" style="width:100%;max-width:360px;border-radius:12px"></video><p><a href="${esc(row.videoUrl)}">Télécharger</a></p></section>`;
    }
    return `<section><h2>${esc(label)}</h2><p>Échec ou timeout — ${esc(row.failMsg || row.state)}</p></section>`;
  };
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Motion A/B orientation</title>
<style>body{font-family:system-ui;background:#0f0f12;color:#eee;padding:24px}main{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:960px;margin:0 auto}h1{font-size:1.1rem}section{background:#1a1a22;padding:16px;border-radius:12px}p{font-size:0.85rem;color:#aaa}</style></head>
<body><h1>Motion Control A/B — character_orientation</h1>
<p>Même composite frame 0 · même vidéo motion · seul character_orientation change.</p>
<main>
${card("character_orientation: video (défaut Kling)", payload.results.video)}
${card("character_orientation: image (prod actuelle photo upload)", payload.results.image)}
</main>
<p>Composite: ${esc(payload.shared.compositeUrl)}</p>
</body></html>`;
}

async function runMotionOrientationAbTest(input) {
  const shared = await prepareSharedMotionAbInputs(input);
  const tasks = await submitMotionOrientationAbTasks(shared, input.mode || "720p");
  const results = await pollMotionAbTasks(tasks, input.pollOptions);
  return { shared, tasks, results };
}

module.exports = {
  AB_VARIANTS,
  prepareSharedMotionAbInputs,
  submitMotionOrientationAbTasks,
  pollMotionAbTasks,
  buildMotionAbCompareHtml,
  runMotionOrientationAbTest,
};
