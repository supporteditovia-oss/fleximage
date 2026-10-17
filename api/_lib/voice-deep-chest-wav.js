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

module.exports = { readWavPcm16Mono };
