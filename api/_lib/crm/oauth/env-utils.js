/** Lecture env CRM sans exposer les valeurs (diagnostic masqué uniquement). */

function readCrmEnv(name) {
  let raw = process.env[name];
  if (raw == null || raw === "") return { value: "", rawPresent: false, rawLength: 0 };
  const rawString = String(raw);
  let value = rawString.replace(/^\uFEFF/, "").trim();
  const hadOuterQuotes =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  if (hadOuterQuotes) value = value.slice(1, -1).trim();
  value = value.replace(/\r?\n/g, "");
  return {
    value,
    rawPresent: true,
    rawLength: rawString.length,
    hadOuterQuotes,
    hadEdgeWhitespace: rawString !== rawString.trim(),
    hadNewline: /[\r\n]/.test(rawString),
    hasNonAscii: /[^\x21-\x7E]/.test(value),
  };
}

function maskCredential(value) {
  const s = String(value || "");
  if (!s) return { present: false, length: 0, masked: null };
  if (s.length <= 8) return { present: true, length: s.length, masked: "****" };
  return { present: true, length: s.length, masked: `${s.slice(0, 4)}…${s.slice(-4)}` };
}

module.exports = { readCrmEnv, maskCredential };
