/**
 * Liens créateurs / parrainage : suivi des inscriptions et paiements par code.
 *
 * Stockage dans la table `app_settings` (key TEXT / value TEXT) — pas de migration SQL :
 *   creator_links                       → JSON { CODE: { name, active, createdAt } }
 *   creator_user:<userId>               → CODE   (premier contact, jamais écrasé)
 *   creator_signup:<CODE>:<userId>      → date ISO d'inscription
 *   creator_conv:<CODE>:<eventId>       → JSON { userId, cents, at } (1 ligne par paiement, idempotent)
 */

const REGISTRY_KEY = "creator_links";
const CODE_RE = /^[A-Z0-9]{3,24}$/;

function normalizeCode(raw) {
  const code = String(raw || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return CODE_RE.test(code) ? code : null;
}

async function readRegistry(supabase) {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", REGISTRY_KEY)
    .maybeSingle();
  if (error) throw error;
  if (!data?.value) return {};
  try {
    const parsed = JSON.parse(data.value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeRegistry(supabase, registry) {
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: REGISTRY_KEY,
      value: JSON.stringify(registry),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw error;
}

async function createCreatorLink(supabase, { name, code }) {
  const cleanName = String(name || "").trim().slice(0, 60);
  if (!cleanName) {
    throw Object.assign(new Error("Nom requis"), { status: 400 });
  }
  const finalCode =
    normalizeCode(code) ||
    normalizeCode(cleanName.slice(0, 12) + Math.floor(100 + Math.random() * 900));
  if (!finalCode) {
    throw Object.assign(new Error("Code invalide (3 à 24 lettres/chiffres)"), {
      status: 400,
    });
  }
  const registry = await readRegistry(supabase);
  if (registry[finalCode]) {
    throw Object.assign(new Error("Ce code existe déjà"), { status: 409 });
  }
  registry[finalCode] = {
    name: cleanName,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await writeRegistry(supabase, registry);
  return { code: finalCode, ...registry[finalCode] };
}

async function setCreatorActive(supabase, code, active) {
  const c = normalizeCode(code);
  const registry = await readRegistry(supabase);
  if (!c || !registry[c]) {
    throw Object.assign(new Error("Code introuvable"), { status: 404 });
  }
  registry[c].active = Boolean(active);
  await writeRegistry(supabase, registry);
  return { code: c, ...registry[c] };
}

/**
 * Premier contact : un utilisateur n'est attribué qu'à UN créateur (le premier).
 * @returns {Promise<{ok: boolean, reason?: string, code?: string}>}
 */
async function claimCreatorReferral(supabase, userId, rawCode) {
  const code = normalizeCode(rawCode);
  if (!code || !userId) return { ok: false, reason: "invalid" };

  const registry = await readRegistry(supabase);
  if (!registry[code] || registry[code].active === false) {
    return { ok: false, reason: "unknown_code" };
  }

  const { data: existing } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", `creator_user:${userId}`)
    .maybeSingle();
  if (existing?.value) return { ok: true, reason: "already", code: existing.value };

  const now = new Date().toISOString();
  const { error } = await supabase.from("app_settings").upsert(
    [
      { key: `creator_user:${userId}`, value: code, updated_at: now },
      { key: `creator_signup:${code}:${userId}`, value: now, updated_at: now },
    ],
    { onConflict: "key" },
  );
  if (error) throw error;
  return { ok: true, code };
}

/** Appelé par le webhook Stripe : ne doit JAMAIS casser le paiement. */
async function recordCreatorConversion(supabase, { userId, cents, eventId }) {
  try {
    if (!userId || !eventId) return { recorded: false };
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", `creator_user:${userId}`)
      .maybeSingle();
    const code = data?.value;
    if (!code) return { recorded: false };
    const now = new Date().toISOString();
    const { error } = await supabase.from("app_settings").upsert(
      {
        key: `creator_conv:${code}:${eventId}`,
        value: JSON.stringify({
          userId,
          cents: Math.max(0, Math.round(Number(cents) || 0)),
          at: now,
        }),
        updated_at: now,
      },
      { onConflict: "key" },
    );
    if (error) throw error;
    return { recorded: true, code };
  } catch (err) {
    console.error("[creator-links] recordCreatorConversion failed", err?.message || err);
    return { recorded: false };
  }
}

async function fetchRowsByPrefix(supabase, prefix) {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .like("key", `${prefix}%`)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/** Stats par créateur : inscrits, payants (distincts), revenu. */
async function fetchCreatorStats(supabase) {
  const [registry, signups, convs] = await Promise.all([
    readRegistry(supabase),
    fetchRowsByPrefix(supabase, "creator_signup:"),
    fetchRowsByPrefix(supabase, "creator_conv:"),
  ]);

  const stats = {};
  for (const [code, meta] of Object.entries(registry)) {
    stats[code] = {
      code,
      name: meta.name,
      active: meta.active !== false,
      createdAt: meta.createdAt,
      signups: 0,
      payers: 0,
      payments: 0,
      revenueCents: 0,
      lastSignupAt: null,
      _payerIds: new Set(),
    };
  }
  for (const row of signups) {
    const [, code] = row.key.split(":");
    const s = stats[code];
    if (!s) continue;
    s.signups += 1;
    if (!s.lastSignupAt || row.value > s.lastSignupAt) s.lastSignupAt = row.value;
  }
  for (const row of convs) {
    const code = row.key.split(":")[1];
    const s = stats[code];
    if (!s) continue;
    try {
      const v = JSON.parse(row.value);
      s.payments += 1;
      s.revenueCents += Number(v.cents) || 0;
      if (v.userId) s._payerIds.add(v.userId);
    } catch {
      /* ligne corrompue ignorée */
    }
  }
  return Object.values(stats)
    .map(({ _payerIds, ...s }) => ({ ...s, payers: _payerIds.size }))
    .sort((a, b) => b.revenueCents - a.revenueCents || b.signups - a.signups);
}

module.exports = {
  normalizeCode,
  readRegistry,
  createCreatorLink,
  setCreatorActive,
  claimCreatorReferral,
  recordCreatorConversion,
  fetchCreatorStats,
};
