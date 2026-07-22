import type { Express } from "express";
import { api } from "@shared/routes";
import { z } from "zod";

import { requireAuth, type AuthenticatedRequest } from "./lib/auth-middleware";
import { tBackend, resolveLocaleFromRequest } from "./lib/i18n";
import { logger } from "./lib/logger";
import { getSupabaseAdmin } from "./lib/supabase-admin";
import { validateRequest } from "./lib/validate";
import {
  getStripe,
  getStripePlanConfig,
  getStripeWebhookSecret,
  normalizeStripePlanType,
  validateStripeRuntimeConfig,
} from "./lib/stripe";
import { assertCustomerCanStartCheckout } from "./lib/checkout-guard";
import {
  handleCheckoutCompleted,
  handleInvoicePaid,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "./lib/stripe-webhooks";
import { resolvePublicAppUrl } from "@shared/site-seo";

const createCheckoutBodySchema = z.object({
  plan: z
    .enum(["discovery", "essential", "ultimate", "weekly", "monthly", "image", "video"])
    .optional()
    .default("essential"),
});

const verifySessionBodySchema = z
  .object({
    session_id: z.string().min(1).optional(),
  })
  .optional()
  .default({});

type CurrentSubscriptionSnapshot = {
  status: string;
  plan_type: string;
  credits_per_cycle: number | null;
  billing_interval: "week" | "month" | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

export function registerStripeRoutes(app: Express): void {
  validateStripeRuntimeConfig();

  app.get(api.stripe.currentPlan.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const locale = resolveLocaleFromRequest(req);
      const supabaseAdmin = getSupabaseAdmin();

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, role, credits, is_subscriber, subscription_status, stripe_customer_id, stripe_subscription_id")
        .eq("id", authReq.userId)
        .single();

      if (profileError || !profile) {
        logger.warn({ err: profileError, userId: authReq.userId }, "Profile not found for current plan");
        return res
          .status(404)
          .json({ message: tBackend(locale, "profiles.notFound") });
      }

      let subscription: CurrentSubscriptionSnapshot | null = null;

      if (profile.stripe_subscription_id) {
        const { data, error } = await supabaseAdmin
          .from("subscriptions")
          .select("status, plan_type, credits_per_cycle, billing_interval, current_period_end, cancel_at_period_end")
          .eq("user_id", authReq.userId)
          .eq("stripe_subscription_id", profile.stripe_subscription_id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          logger.warn({ err: error, userId: authReq.userId }, "Could not load current subscription");
        } else {
          subscription = data as CurrentSubscriptionSnapshot | null;
        }
      }

      const isAdmin = profile.role === "admin";
      const hasStripeCustomer = Boolean(profile.stripe_customer_id);
      const isSubscriber = Boolean(profile.is_subscriber || isAdmin);
      let planType: "free" | "admin" | "unknown" | ReturnType<typeof normalizeStripePlanType> = "free";
      let creditsPerCycle: number | null = null;
      let billingInterval: "week" | "month" | null = null;
      let subscriptionStatus =
        profile.subscription_status || (profile.is_subscriber ? "active" : "inactive");

      if (isAdmin) {
        planType = "admin";
        subscriptionStatus = "admin";
      } else if (subscription) {
        const normalizedPlanType = normalizeStripePlanType(subscription.plan_type);
        const planConfig = getStripePlanConfig(normalizedPlanType);
        planType = planConfig.planType;
        subscriptionStatus = subscription.status || subscriptionStatus;
        creditsPerCycle = planConfig.creditsPerCycle;
        billingInterval = subscription.billing_interval || planConfig.billingInterval;
      } else if (profile.is_subscriber) {
        planType = "unknown";
      }

      res.json({
        credits: profile.credits ?? 0,
        planType,
        subscriptionStatus,
        isSubscriber,
        creditsPerCycle,
        billingInterval,
        currentPeriodEnd: subscription?.current_period_end ?? null,
        cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
        canManageSubscription: hasStripeCustomer,
      });
    } catch (error: any) {
      logger.error({ err: error }, "Error loading current Stripe plan");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  app.post(api.stripe.createCheckout.path, requireAuth, validateRequest(createCheckoutBodySchema), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const locale = resolveLocaleFromRequest(req);
      const stripe = getStripe();
      const planConfig = getStripePlanConfig(req.body.plan);
      const priceId = planConfig.priceId;
      const supabaseAdmin = getSupabaseAdmin();

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id, email, is_subscriber")
        .eq("id", authReq.userId)
        .single();

      if (profile?.is_subscriber) {
        return res
          .status(400)
          .json({ message: tBackend(locale, "stripe.alreadySubscribed") });
      }

      if (profile?.stripe_customer_id) {
        const guard = await assertCustomerCanStartCheckout(
          stripe,
          profile.stripe_customer_id,
        );
        if (!guard.ok) {
          return res.status(400).json({
            message: tBackend(locale, "stripe.alreadySubscribed"),
            code: guard.code,
          });
        }
      }

      const appOrigin = "https://www.luxeflexia.com";
      const sessionParams: Record<string, any> = {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appOrigin}/resultat?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appOrigin}/generate?checkout=cancel`,
        branding_settings: {
          display_name: "LuxeFlexIA",
        },
        custom_text: {
          submit: {
            message: "Abonnement LuxeFlexIA — paiement sécurisé",
          },
        },
        metadata: {
          user_id: authReq.userId,
          price_id: priceId,
          plan_type: planConfig.planType,
          credits_per_cycle: String(planConfig.creditsPerCycle),
          billing_interval: planConfig.billingInterval,
          brand: "LuxeFlexIA",
        },
        subscription_data: {
          description: planConfig.name,
          metadata: {
            user_id: authReq.userId,
            price_id: priceId,
            plan_type: planConfig.planType,
            credits_per_cycle: String(planConfig.creditsPerCycle),
            billing_interval: planConfig.billingInterval,
            brand: "LuxeFlexIA",
          },
        },
      };

      if (profile?.stripe_customer_id) {
        sessionParams.customer = profile.stripe_customer_id;
      } else {
        sessionParams.customer_email = profile?.email || undefined;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      res.json({ url: session.url });
    } catch (error: any) {
      logger.error({ err: error }, "Error creating checkout session");
      const locale = resolveLocaleFromRequest(req);
      const isAuthError =
        error?.type === "StripeAuthenticationError" ||
        error?.statusCode === 401 ||
        /Invalid API Key/i.test(String(error?.message || ""));
      const isMissingPrice =
        /must be set/i.test(String(error?.message || "")) ||
        error?.code === "resource_missing";

      if (process.env.NODE_ENV !== "production" && isAuthError) {
        return res.status(500).json({
          message:
            "Clé Stripe invalide. Mets ta vraie STRIPE_SECRET_KEY (Dashboard Stripe → Developers → API keys) dans .env, puis redémarre le serveur.",
          code: "stripe_invalid_api_key",
        });
      }
      if (isMissingPrice) {
        return res.status(500).json({
          message:
            "Price ID Stripe introuvable pour ce plan. Vérifie STRIPE_*_PRICE_ID et que la clé API est du même mode (test/live).",
          code: "stripe_price_missing",
        });
      }
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  app.post(api.stripe.createPortal.path, requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const locale = resolveLocaleFromRequest(req);
      const stripe = getStripe();
      const supabaseAdmin = getSupabaseAdmin();

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id, stripe_subscription_id")
        .eq("id", authReq.userId)
        .single();

      if (!profile?.stripe_customer_id) {
        return res
          .status(400)
          .json({ message: tBackend(locale, "stripe.noStripeSubscription") });
      }

      const returnUrl = `${resolvePublicAppUrl(
        typeof req.headers.origin === "string" ? req.headers.origin : null,
        process.env.SITE_URL,
        process.env.APP_URL,
      )}${req.body?.returnPath === "/generate" ? "/generate" : "/settings"}`;
      const sessionParams: any = {
        customer: profile.stripe_customer_id,
        return_url: returnUrl,
      };

      logger.info({ hasCustomer: !!profile.stripe_customer_id }, "Creating Stripe portal session");

      const portalSession = await stripe.billingPortal.sessions.create(sessionParams);

      res.json({ url: portalSession.url });
    } catch (error: any) {
      logger.error({ err: error }, "Error creating portal session");
      const locale = resolveLocaleFromRequest(req);
      res
        .status(500)
        .json({ message: tBackend(locale, "common.internalServerError") });
    }
  });

  app.post(api.stripe.verifySession.path, requireAuth, validateRequest(verifySessionBodySchema), async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const supabaseAdmin = getSupabaseAdmin();
    const sessionId = req.body?.session_id;

    if (sessionId) {
      try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const sessionUserId = session.metadata?.user_id;

        if (sessionUserId !== authReq.userId) {
          logger.warn(
            { sessionId, userId: authReq.userId, sessionUserId },
            "Checkout session verification user mismatch",
          );
          return res.status(403).json({ message: "Invalid checkout session" });
        }

        if (
          session.mode === "subscription" &&
          session.status === "complete" &&
          session.payment_status === "paid"
        ) {
          await handleCheckoutCompleted(session as any);
        }
      } catch (error: any) {
        logger.warn(
          { err: error, sessionId, userId: authReq.userId },
          "Could not reconcile checkout session during verification",
        );
      }
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_subscriber, subscription_status, credits")
      .eq("id", authReq.userId)
      .single();

    res.json({
      status: profile?.subscription_status || "pending_webhook",
      active: !!profile?.is_subscriber,
      credits: profile?.credits ?? 0,
    });
  });

  app.post(api.stripe.webhook.path, async (req, res) => {
    try {
      const stripe = getStripe();
      const sig = req.headers["stripe-signature"];

      if (!sig) {
        return res
          .status(400)
          .json({ message: "Missing stripe-signature header" });
      }

      let event;
      try {
        event = await stripe.webhooks.constructEventAsync(
          req.body,
          sig,
          getStripeWebhookSecret(),
        );
      } catch (err: any) {
        logger.warn({ err }, "Webhook signature verification failed");
        return res
          .status(400)
          .json({ message: `Webhook Error: ${err.message}` });
      }

      logger.info(
        { type: event.type, id: event.id },
        "Stripe webhook received",
      );

      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(event.data.object as any);
          break;
        case "invoice.paid":
          await handleInvoicePaid(event.data.object as any);
          break;
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(event.data.object as any);
          break;
        case "customer.subscription.updated":
          await handleSubscriptionUpdated(event.data.object as any);
          break;
        default:
          logger.info({ type: event.type }, "Unhandled webhook event type");
      }

      res.json({ received: true });
    } catch (error: any) {
      logger.error({ err: error }, "Error processing webhook");
      res.status(500).json({ message: error.message });
    }
  });
}
