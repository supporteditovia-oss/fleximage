const crypto = require("crypto");

function encryptionKey() {
  const material = String(
    process.env.CRM_OAUTH_ENCRYPTION_KEY || process.env.SESSION_SECRET || "",
  ).trim();
  if (!material) {
    throw Object.assign(new Error("CRM_OAUTH_ENCRYPTION_KEY ou SESSION_SECRET requis"), {
      status: 503,
    });
  }
  return crypto.createHash("sha256").update(material).digest();
}

function encryptSecret(plain) {
  if (!plain) return null;
  const key = encryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decryptSecret(payload) {
  if (!payload) return null;
  const key = encryptionKey();
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

module.exports = { encryptSecret, decryptSecret };
