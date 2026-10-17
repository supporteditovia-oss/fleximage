/**
 * Profils timbre Mode C — grave (Kaaris) vs incisif (Niska) vs neutre.
 */

const { readWavPcm16Mono } = require("./voice-deep-chest-wav");

function analyzeWavTimbre(wavBuffer) {
  const samples = readWavPcm16Mono(wavBuffer);
  if (!samples || samples.length < 8000) {
    return { rms: 0, zcr: 0, peak: 0, crest: 0 };
  }

  let sumSq = 0;
  let peak = 0;
  let zeroCross = 0;
  let prev = samples[0];
  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i];
    const abs = Math.abs(s);
    if (abs > peak) peak = abs;
    sumSq += s * s;
    if ((prev >= 0 && s < 0) || (prev < 0 && s >= 0)) zeroCross += 1;
    prev = s;
  }

  const rms = Math.sqrt(sumSq / samples.length);
  const zcr = zeroCross / samples.length;
  const crest = rms > 0 ? peak / rms : 0;
  return { rms, zcr, peak, crest };
}

function estimateDeepChestFromWav(wavBuffer) {
  const { rms, zcr } = analyzeWavTimbre(wavBuffer);
  return rms >= 520 && zcr <= 0.088;
}

/** Voix percutantes / consonnes vives (Niska, PLK interview…). */
function estimateIncisivePunchFromWav(wavBuffer) {
  const { rms, zcr, crest } = analyzeWavTimbre(wavBuffer);
  if (estimateDeepChestFromWav(wavBuffer)) return false;
  if (zcr >= 0.1 && rms >= 380) return true;
  if (crest >= 5.2 && rms >= 420) return true;
  return false;
}

function voiceNameHintsIncisive(voiceName) {
  const n = String(voiceName || "").trim().toLowerCase();
  if (!n) return false;
  return /\bniska\b|plk|gazo|tiakola|sdm/.test(n);
}

function shouldUseDeepChestClone({
  generationMode,
  cloneSourceType,
  hasInstantImport,
  referenceWavBuffer,
} = {}) {
  if (referenceWavBuffer && estimateDeepChestFromWav(referenceWavBuffer)) return true;
  const modeC =
    generationMode === "C" || hasInstantImport || cloneSourceType === "import";
  if (!modeC || !referenceWavBuffer) return false;
  return estimateDeepChestFromWav(referenceWavBuffer);
}

function shouldUseIncisiveClone({
  generationMode,
  cloneSourceType,
  hasInstantImport,
  referenceWavBuffer,
  voiceName,
  deliveryStyle,
} = {}) {
  const modeC =
    generationMode === "C" || hasInstantImport || cloneSourceType === "import";
  if (!modeC) return false;
  if (referenceWavBuffer && estimateDeepChestFromWav(referenceWavBuffer)) return false;
  if (voiceNameHintsIncisive(voiceName)) return true;
  if (deliveryStyle === "rap" && referenceWavBuffer && estimateIncisivePunchFromWav(referenceWavBuffer)) {
    return true;
  }
  if (referenceWavBuffer && estimateIncisivePunchFromWav(referenceWavBuffer)) return true;
  return false;
}

module.exports = {
  analyzeWavTimbre,
  estimateDeepChestFromWav,
  estimateIncisivePunchFromWav,
  voiceNameHintsIncisive,
  shouldUseDeepChestClone,
  shouldUseIncisiveClone,
};
