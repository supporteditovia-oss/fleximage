import posthog from 'posthog-js';

// VITE_PUBLIC_POSTHOG_KEY and VITE_PUBLIC_POSTHOG_HOST should be defined in .env
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false, // We'll manage views manually if needed, or let wouter changes trigger it
    loaded: (posthog) => {
      if (import.meta.env.DEV) {
        posthog.debug();
      }
    }
  });
}

export { posthog };
