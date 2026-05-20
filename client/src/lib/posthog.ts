import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

export const LANDING_EXPERIMENT_FLAG_KEY = "landing-simple-hero-experiment";
export const LANDING_EXPERIMENT_SIMPLE_VARIANT = "simple";
export const isPostHogConfigured = Boolean(POSTHOG_KEY);

if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false,
    loaded: (client) => {
      client.reloadFeatureFlags();

      if (import.meta.env.DEV) {
        client.debug();
      }
    },
  });
}

export { posthog };
