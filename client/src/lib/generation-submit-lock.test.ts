import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem(key: string) {
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
      removeItem(key: string) {
        store.delete(key);
      },
    },
  });
});

describe("generation-submit-lock", () => {
  it("blocks a second acquire while lock is held", async () => {
    const { tryAcquireGenerationSubmitLock } = await import(
      "./generation-submit-lock"
    );
    assert.equal(tryAcquireGenerationSubmitLock(), true);
    assert.equal(tryAcquireGenerationSubmitLock(), false);
  });

  it("allows re-acquire after explicit error release", async () => {
    const {
      tryAcquireGenerationSubmitLock,
      releaseGenerationSubmitLockOnError,
    } = await import("./generation-submit-lock");
    assert.equal(tryAcquireGenerationSubmitLock(), true);
    releaseGenerationSubmitLockOnError();
    assert.equal(tryAcquireGenerationSubmitLock(), true);
  });
});
