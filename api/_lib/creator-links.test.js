const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("./creator-links");

/** Faux client Supabase minimal pour la table app_settings. */
function fakeSupabase() {
  const rows = new Map();
  const api = {
    rows,
    from() {
      let like = null;
      let eq = null;
      const q = {
        select() { return q; },
        eq(_c, v) { eq = v; return q; },
        like(_c, pat) { like = pat.replace(/%$/, ""); return q; },
        range() { return q; },
        maybeSingle: async () => ({ data: rows.has(eq) ? { value: rows.get(eq) } : null, error: null }),
        upsert: async (v) => {
          for (const r of Array.isArray(v) ? v : [v]) rows.set(r.key, r.value);
          return { error: null };
        },
        then(resolve) {
          const data = [...rows].filter(([k]) => k.startsWith(like)).map(([key, value]) => ({ key, value }));
          resolve({ data, error: null });
        },
      };
      return q;
    },
  };
  return api;
}

test("normalizeCode", () => {
  assert.equal(L.normalizeCode(" karim-01 "), "KARIM01");
  assert.equal(L.normalizeCode("ab"), null);
});

test("créer lien, inscription (1er contact), paiements idempotents, stats", async () => {
  const db = fakeSupabase();
  const c = await L.createCreatorLink(db, { name: "Karim TikTok", code: "karim" });
  assert.equal(c.code, "KARIM");
  await assert.rejects(L.createCreatorLink(db, { name: "x", code: "KARIM" }), /existe/);

  assert.equal((await L.claimCreatorReferral(db, "u1", "karim")).ok, true);
  await L.createCreatorLink(db, { name: "Autre", code: "AUTRE1" });
  const second = await L.claimCreatorReferral(db, "u1", "AUTRE1");
  assert.equal(second.code, "KARIM"); // premier contact conservé
  assert.equal((await L.claimCreatorReferral(db, "u2", "INCONNU")).ok, false);
  await L.claimCreatorReferral(db, "u3", "KARIM");

  await L.recordCreatorConversion(db, { userId: "u1", cents: 990, eventId: "cs_1" });
  await L.recordCreatorConversion(db, { userId: "u1", cents: 990, eventId: "cs_1" }); // doublon
  await L.recordCreatorConversion(db, { userId: "u1", cents: 799, eventId: "cs_2" });
  assert.equal((await L.recordCreatorConversion(db, { userId: "u9", cents: 500, eventId: "cs_3" })).recorded, false);

  const stats = await L.fetchCreatorStats(db);
  const k = stats.find((s) => s.code === "KARIM");
  assert.equal(k.signups, 2);
  assert.equal(k.payers, 1);
  assert.equal(k.payments, 2);
  assert.equal(k.revenueCents, 1789);
});

test("code désactivé : pas d'attribution", async () => {
  const db = fakeSupabase();
  await L.createCreatorLink(db, { name: "Off", code: "OFFCODE" });
  await L.setCreatorActive(db, "OFFCODE", false);
  assert.equal((await L.claimCreatorReferral(db, "u1", "OFFCODE")).ok, false);
});
