/**
 * Heuristique voix grave / coffre (interviews Kaaris, SCH…) pour Mode C.
 */

function readWavPcm16Mono(wavBuffer) {
  if (!wavBuffer || wavBuffer.length < 48) return null;
  if (wavBuffer.toString("ascii", 0, 4) !== "RIFF") return null;
  let offset = 12;
  let dataOffset = -1;
  let dataLen = 0;
  while (offset + 8 <= wavBuffer.length) {
    const id = wavBuffer.toString("ascii", offset, offset + 4);
    const size = wavBuffer.readUInt32LE(offset + 4);
    if (id === "data") {
      dataOffset = offset + 8;
      dataLen = size;
      break;
    }
    offset += 8 + size;
  }
  if (dataOffset < 0 || dataOffset + 4 > wavBuffer.length) return null;
  const samples = [];
  const end = Math.min(wavBuffer.length, dataOffset + dataLen);
  for (let i = dataOffset; i + 1 < end; i += 2) {
    samples.push(wavBuffer.readInt16LE(i));
  }
  return samples.length > 0 ? samples : null;
}

function estimateDeepChestFromWav(wavBuffer) {
  const samples = readWavPcm16Mono(wavBuffer);
  if (!samples || samples.length < 8000) return false;

  let sumSq = 0;
  let zeroCross = 0;
  let prev = samples[0];
  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i];
    sumSq += s * s;
    if ((prev >= 0 && s < 0) || (prev < 0 && s >= 0)) zeroCross += 1;
    prev = s;
  }

  const rms = Math.sqrt(sumSq / samples.length);
  const zcr = zeroCross / samples.length;
  /** Seuil bas + ZCR élargi : voix lourdes nasal-graves (Jul) et très graves (Kaaris). */
  return rms >= 480 && zcr <= 0.115;
}

function shouldUseDeepChestClone({
  generationMode,
  cloneSourceType,
  hasInstantImport,
  referenceWavBuffer,
} = {}) {
  if (generationMode === "C" || hasInstantImport) return true;
  if (cloneSourceType === "import") return true;
  if (referenceWavBuffer && estimateDeepChestFromWav(referenceWavBuffer)) return true;
  return false;
}

module.exports = {
  estimateDeepChestFromWav,
  shouldUseDeepChestClone,
};
