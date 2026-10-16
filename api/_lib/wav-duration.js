/** Durée approximative d’un buffer WAV PCM (44-byte header + chunks). */

function estimateWavDurationSec(buffer) {
  if (!buffer || buffer.length < 44) return 0;
  try {
    if (buffer.toString("ascii", 0, 4) !== "RIFF") return 0;
    if (buffer.toString("ascii", 8, 12) !== "WAVE") return 0;

    const numChannels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const bitsPerSample = buffer.readUInt16LE(34);
    if (!sampleRate || !numChannels || !bitsPerSample) return 0;

    let offset = 12;
    while (offset + 8 <= buffer.length) {
      const chunkId = buffer.toString("ascii", offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);
      if (chunkId === "data") {
        const bytesPerSec = sampleRate * numChannels * (bitsPerSample / 8);
        if (bytesPerSec <= 0) return 0;
        return chunkSize / bytesPerSec;
      }
      offset += 8 + chunkSize + (chunkSize % 2);
    }
  } catch {
    return 0;
  }
  return 0;
}

module.exports = { estimateWavDurationSec };
