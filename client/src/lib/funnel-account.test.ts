import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

const localStore = new Map<string, string>();
const sessionStore = new Map<string, string>();

function installStorageMocks() {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem(key: string) {
        return localStore.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        localStore.set(key, value);
      },
      removeItem(key: string) {
        localStore.delete(key);
      },
      clear() {
        localStore.clear();
      },
    },
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem(key: string) {
        return sessionStore.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        sessionStore.set(key, value);
      },
      removeItem(key: string) {
        sessionStore.delete(key);
      },
      clear() {
        sessionStore.clear();
      },
    },
  });
}

describe("funnel-account", () => {
  beforeEach(() => {
    localStore.clear();
    sessionStore.clear();
    installStorageMocks();
  });

  it("clears quiz when switching to a new account without guest draft", async () => {
    const { isOnboardingQuizComplete } = await import("./onboarding-quiz");
    const { getLastAuthUserId, handleAuthUserChange, setLastAuthUserId } =
      await import("./funnel-account");

    localStorage.setItem(
      "luxeflexia_onboarding_quiz",
      JSON.stringify({
        goal: "fun",
        vibe: "dubai",
        format: "image",
        completedAt: Date.now(),
      }),
    );
    setLastAuthUserId("user-a");

    handleAuthUserChange("user-b");

    assert.equal(isOnboardingQuizComplete(), false);
    assert.equal(getLastAuthUserId(), "user-b");
  });

  it("ignores fake paywall session from another user", async () => {
    const { markFakePaywallReached, hasReachedFakePaywall } = await import(
      "./fake-paywall-state"
    );

    markFakePaywallReached("user-a");
    assert.equal(hasReachedFakePaywall("user-b"), false);
    assert.equal(hasReachedFakePaywall("user-a"), true);
  });

  it("resetFunnelForNewAccount clears stale quiz", async () => {
    const { isOnboardingQuizComplete } = await import("./onboarding-quiz");
    const { resetFunnelForNewAccount } = await import("./funnel-account");

    localStorage.setItem(
      "luxeflexia_onboarding_quiz",
      JSON.stringify({
        goal: "social",
        vibe: "yacht",
        format: "image",
        completedAt: Date.now(),
      }),
    );
    resetFunnelForNewAccount();
    assert.equal(isOnboardingQuizComplete(), false);
  });
});
