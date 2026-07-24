/**
 * Billing hardening E2E against live Stripe + Supabase.
 *
 * Flow (trial = €0, no card charge):
 * 1) Throwaway Auth user + Stripe customer
 * 2) Trial subscription (real Stripe object)
 * 3) reconcilePaidCheckoutSession (same path as webhook checkout.session.completed)
 * 4) Assert is_subscriber + credits
 * 5) assertCustomerCanStartCheckout must block
 * 6) Webhook handler: bad signature → 400; processing failure contract → 500
 * 7) Cancel + clear credits (deleted handler parity)
 * 8) Cleanup Stripe + Auth user
 */
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

function loadEnv() {
  const envPath = path.join(root, ".env");
  const text = fs.readFileSync(envPath, "utf8");
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

loadEnv();

const {
  reconcilePaidCheckoutSession,
  PLAN_CREDITS,
} = require("../api/_lib/stripe-billing.js");
const { assertCustomerCanStartCheckout } = require("../api/_lib/checkout-guard.js");
const webhookHandler = require("../api/stripe/webhook.js");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const priceId = process.env.STRIPE_DISCOVERY_PRICE_ID;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  assert(secretKey, "STRIPE_SECRET_KEY missing");
  assert(supabaseUrl && serviceRole, "Supabase env missing");
  assert(priceId, "STRIPE_DISCOVERY_PRICE_ID missing");
  assert(webhookSecret, "STRIPE_WEBHOOK_SECRET missing");

  const stripe = new Stripe(secretKey, { apiVersion: "2026-02-25.clover" });
  const supabase = createClient(supabaseUrl, serviceRole);

  const stamp = Date.now();
  const email = `billing-e2e-${stamp}@luxeflexia.test`;
  const password = `E2e!${stamp}Aa1`;
  let userId = null;
  let customerId = null;
  let subscriptionId = null;
  const sessionId = `cs_test_e2e_${stamp}`;

  try {
    console.log("1) Create throwaway Auth user…");
    const { data: created, error: createErr } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Billing E2E" },
      });
    assert(
      !createErr && created?.user?.id,
      `createUser failed: ${createErr?.message}`,
    );
    userId = created.user.id;

    for (let i = 0; i < 15; i++) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      if (profile) break;
      await new Promise((r) => setTimeout(r, 400));
    }

    const { data: before } = await supabase
      .from("profiles")
      .select("credits, is_subscriber")
      .eq("id", userId)
      .single();
    assert(before, "profile missing after auth trigger");
    const creditsBefore = before.credits ?? 0;
    console.log("   profile ok, credits=", creditsBefore);

    console.log("2) Create Stripe customer + trial subscription (no charge)…");
    const customer = await stripe.customers.create({
      email,
      metadata: { user_id: userId, purpose: "billing_e2e" },
    });
    customerId = customer.id;

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 1,
      metadata: {
        user_id: userId,
        plan_type: "discovery",
        credits_per_cycle: String(PLAN_CREDITS.discovery),
        brand: "LuxeFlexIA",
        purpose: "billing_e2e",
      },
    });
    subscriptionId = subscription.id;
    assert(
      subscription.status === "trialing" || subscription.status === "active",
      `unexpected sub status ${subscription.status}`,
    );
    console.log("   subscription", subscriptionId, subscription.status);

    console.log("3) reconcilePaidCheckoutSession (webhook grant path)…");
    const fakeSession = {
      id: sessionId,
      object: "checkout.session",
      mode: "subscription",
      status: "complete",
      payment_status: "paid",
      customer: customerId,
      subscription: subscriptionId,
      amount_total: 0,
      currency: "eur",
      metadata: {
        user_id: userId,
        price_id: priceId,
        plan_type: "discovery",
        credits_per_cycle: String(PLAN_CREDITS.discovery),
        billing_interval: "month",
        brand: "LuxeFlexIA",
      },
    };

    const grant = await reconcilePaidCheckoutSession(
      supabase,
      stripe,
      fakeSession,
      "billing_e2e",
    );
    assert(grant.ok, `grant failed: ${JSON.stringify(grant)}`);

    const { data: afterGrant } = await supabase
      .from("profiles")
      .select(
        "credits, is_subscriber, stripe_customer_id, stripe_subscription_id",
      )
      .eq("id", userId)
      .single();

    assert(afterGrant?.is_subscriber === true, "is_subscriber not true after grant");
    assert(
      afterGrant?.credits === creditsBefore + PLAN_CREDITS.discovery,
      `credits expected ${creditsBefore + PLAN_CREDITS.discovery}, got ${afterGrant?.credits}`,
    );
    assert(afterGrant?.stripe_customer_id === customerId, "customer id mismatch");
    assert(
      afterGrant?.stripe_subscription_id === subscriptionId,
      "subscription id mismatch",
    );
    console.log("   credits=", afterGrant.credits, "subscriber=true");

    console.log("4) Idempotent re-grant must not double credits…");
    await reconcilePaidCheckoutSession(
      supabase,
      stripe,
      fakeSession,
      "billing_e2e",
    );
    const { data: afterIdem } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();
    assert(
      afterIdem?.credits === afterGrant.credits,
      `idempotency broken: ${afterIdem?.credits} vs ${afterGrant.credits}`,
    );

    console.log("5) Double-checkout guard must block…");
    const guard = await assertCustomerCanStartCheckout(stripe, customerId);
    assert(
      !guard.ok && guard.code === "already_subscribed",
      `guard should block: ${JSON.stringify(guard)}`,
    );
    console.log("   blocked status=", guard.status);

    console.log("6) Webhook HTTP status codes…");
    {
      const req = {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=deadbeef" },
        body: Buffer.from(JSON.stringify({ type: "ping" })),
      };
      const res = mockRes();
      await webhookHandler(req, res);
      assert(
        res.statusCode === 400,
        `expected 400 for bad signature, got ${res.statusCode}`,
      );
      assert(
        res.body?.code === "stripe_signature_invalid",
        `expected signature code, got ${JSON.stringify(res.body)}`,
      );
      console.log("   bad signature →", res.statusCode, res.body.code);
    }
    {
      const src = fs.readFileSync(
        path.join(root, "api/stripe/webhook.js"),
        "utf8",
      );
      assert(
        src.includes("constructEventAsync"),
        "webhook must use constructEventAsync",
      );
      assert(
        src.includes("stripe_webhook_processing_failed"),
        "webhook.js must tag processing failures as 500",
      );
      assert(
        src.includes("clear_credits"),
        "webhook deleted handler must clear credits",
      );
      assert(
        !src.includes("events.retrieve"),
        "insecure events.retrieve fallback must be removed",
      );
      console.log("   processing-failure + signature contracts ok");
    }

    console.log("7) Signed webhook customer.subscription.deleted clears credits…");
    {
      const payload = JSON.stringify({
        id: `evt_e2e_${stamp}`,
        object: "event",
        api_version: "2026-02-25.clover",
        created: Math.floor(Date.now() / 1000),
        type: "customer.subscription.deleted",
        livemode: true,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        data: {
          object: {
            id: subscriptionId,
            object: "subscription",
            status: "canceled",
            metadata: {
              user_id: userId,
              plan_type: "discovery",
            },
          },
        },
      });
      const header = await stripe.webhooks.generateTestHeaderStringAsync({
        payload,
        secret: webhookSecret,
      });
      const res = mockRes();
      await webhookHandler(
        {
          method: "POST",
          headers: { "stripe-signature": header },
          body: Buffer.from(payload),
        },
        res,
      );
      assert(
        res.statusCode === 200,
        `deleted webhook expected 200, got ${res.statusCode} ${JSON.stringify(res.body)}`,
      );

      await stripe.subscriptions.cancel(subscriptionId).catch(() => {});
      subscriptionId = null;

      const { data: afterCancel } = await supabase
        .from("profiles")
        .select("credits, is_subscriber")
        .eq("id", userId)
        .single();
      assert(
        afterCancel?.is_subscriber === false,
        "still subscriber after deleted webhook",
      );
      assert(
        afterCancel?.credits === 0,
        `credits not cleared by webhook: ${afterCancel?.credits}`,
      );
      console.log("   webhook deleted → credits=0 subscriber=false");
    }

    console.log("8) Rate limiter skip contract…");
    const limiterSrc = fs.readFileSync(
      path.join(root, "server/lib/rate-limiter.ts"),
      "utf8",
    );
    assert(
      limiterSrc.includes("/stripe/webhook"),
      "apiLimiter must skip webhook",
    );

    console.log("\nALL BILLING HARDENING CHECKS PASSED");
  } finally {
    console.log("cleanup…");
    try {
      if (subscriptionId) {
        await stripe.subscriptions.cancel(subscriptionId).catch(() => {});
      }
    } catch {
      // ignore
    }
    try {
      if (customerId) {
        await stripe.customers.del(customerId).catch(() => {});
      }
    } catch {
      // ignore
    }
    try {
      if (userId) {
        await supabase.auth.admin.deleteUser(userId);
      }
    } catch (err) {
      console.warn("cleanup user failed", err?.message || err);
    }
  }
}

main().catch((err) => {
  console.error("\nE2E FAILED:", err);
  process.exitCode = 1;
});
