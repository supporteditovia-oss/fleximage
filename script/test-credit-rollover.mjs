/**
 * Capped rollover tests against live Supabase RPCs.
 * Discovery quota 250 → cap 500; unused rolls; over-cap skipped; 3-month lots.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv() {
  const text = fs.readFileSync(path.join(root, ".env"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

loadEnv();

async function main() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const stamp = Date.now();
  const email = `rollover-e2e-${stamp}@luxeflexia.test`;
  const password = `Roll!${stamp}Aa1`;
  let userId = null;

  try {
    const { data: created, error: createErr } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    assert(!createErr && created?.user?.id, createErr?.message || "no user");
    userId = created.user.id;

    for (let i = 0; i < 15; i++) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      if (p) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    console.log("1) First month grant 250…");
    const { data: g1, error: e1 } = await supabase.rpc(
      "grant_subscription_credits",
      {
        p_user_id: userId,
        p_monthly_quota: 250,
        p_idempotency_key: `test:rollover:${stamp}:m1`,
        p_metadata: { source: "test" },
        p_cap_multiplier: 2,
      },
    );
    assert(!e1, e1?.message);
    assert(g1.granted === 250, `granted=${g1.granted}`);
    assert(g1.balance_after === 250, `bal=${g1.balance_after}`);
    assert(g1.balance_cap === 500, `cap=${g1.balance_cap}`);

    console.log("2) Spend 50 (FIFO)…");
    const { error: spendErr } = await supabase.rpc("apply_credit_delta", {
      p_user_id: userId,
      p_delta: -50,
      p_reason: "generation_charge",
      p_idempotency_key: `test:rollover:${stamp}:spend`,
      p_metadata: { source: "test" },
    });
    assert(!spendErr, spendErr?.message);

    const { data: mid } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();
    assert(mid.credits === 200, `after spend ${mid.credits}`);

    console.log("3) Renewal +250 → balance 450 (under cap 500)…");
    const { data: g2, error: e2 } = await supabase.rpc(
      "grant_subscription_credits",
      {
        p_user_id: userId,
        p_monthly_quota: 250,
        p_idempotency_key: `test:rollover:${stamp}:m2`,
        p_metadata: { source: "test" },
        p_cap_multiplier: 2,
      },
    );
    assert(!e2, e2?.message);
    assert(g2.granted === 250, `m2 granted=${g2.granted}`);
    assert(g2.balance_after === 450, `m2 bal=${g2.balance_after}`);

    console.log("4) Renewal again at high balance → only room to 500…");
    // Spend nothing; balance 450; room = 50
    const { data: g3, error: e3 } = await supabase.rpc(
      "grant_subscription_credits",
      {
        p_user_id: userId,
        p_monthly_quota: 250,
        p_idempotency_key: `test:rollover:${stamp}:m3`,
        p_metadata: { source: "test" },
        p_cap_multiplier: 2,
      },
    );
    assert(!e3, e3?.message);
    assert(g3.granted === 50, `m3 granted=${g3.granted} (expected 50)`);
    assert(g3.balance_after === 500, `m3 bal=${g3.balance_after}`);

    console.log("5) Renewal at cap → grant 0…");
    const { data: g4, error: e4 } = await supabase.rpc(
      "grant_subscription_credits",
      {
        p_user_id: userId,
        p_monthly_quota: 250,
        p_idempotency_key: `test:rollover:${stamp}:m4`,
        p_metadata: { source: "test" },
        p_cap_multiplier: 2,
      },
    );
    assert(!e4, e4?.message);
    assert(g4.granted === 0, `m4 granted=${g4.granted}`);
    assert(g4.balance_after === 500, `m4 bal=${g4.balance_after}`);

    const { data: lots } = await supabase
      .from("credit_lots")
      .select("amount_remaining, expires_at")
      .eq("user_id", userId)
      .gt("amount_remaining", 0);
    assert(lots && lots.length > 0, "expected active lots");
    for (const lot of lots) {
      const exp = new Date(lot.expires_at).getTime();
      const min = Date.now() + 80 * 24 * 3600 * 1000; // ~2.5 months
      assert(exp > min, "lot should expire ~3 months out");
    }

    console.log("6) Cancel wipe…");
    await supabase.rpc("clear_user_credit_lots", { p_user_id: userId });
    const { error: wipeErr } = await supabase.rpc("apply_credit_delta", {
      p_user_id: userId,
      p_delta: -500,
      p_reason: "system_adjustment",
      p_idempotency_key: `test:rollover:${stamp}:cancel`,
      p_metadata: { source: "test" },
    });
    assert(!wipeErr, wipeErr?.message);
    const { data: after } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();
    assert(after.credits === 0, `after cancel ${after.credits}`);

    console.log("\nROLLOVER CHECKS PASSED");
  } finally {
    if (userId) {
      await supabase.auth.admin.deleteUser(userId).catch(() => {});
    }
  }
}

main().catch((err) => {
  console.error("FAILED", err);
  process.exitCode = 1;
});
