const { getClientIp } = require("./client-ip");

function normalizeIp(ip) {
  if (!ip) return "";
  return String(ip).trim().replace(/^::ffff:/i, "");
}

function parseV2IpAllowlist() {
  const raw = process.env.V2_PREVIEW_IP_ALLOWLIST || "";
  return raw
    .split(/[,;\s]+/)
    .map((entry) => normalizeIp(entry))
    .filter(Boolean);
}

function isIpAllowedForV2(ip, req) {
  const clientIp = normalizeIp(ip || (req ? getClientIp(req) : ""));
  const allowlist = parseV2IpAllowlist();

  if (allowlist.length === 0) {
    return false;
  }

  if (allowlist.includes("*")) {
    return true;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    (clientIp === "127.0.0.1" || clientIp === "::1" || clientIp === "unknown")
  ) {
    return true;
  }

  return allowlist.some(
    (entry) => entry === clientIp || normalizeIp(entry) === clientIp,
  );
}

module.exports = {
  parseV2IpAllowlist,
  isIpAllowedForV2,
  normalizeIp,
};
