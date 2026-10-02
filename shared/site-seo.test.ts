import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isIndexableSitePath,
  isUnknownGenerateurPath,
  shouldCrawlerNoindexPathname,
} from "./site-seo";

describe("site-seo crawler policy", () => {
  it("indexable: home, directory, known niche", () => {
    assert.equal(isIndexableSitePath("/"), true);
    assert.equal(isIndexableSitePath("/tous-les-generateurs"), true);
    assert.equal(isIndexableSitePath("/generateur/vacances-dubai"), true);
  });

  it("noindex: studios and app shell (video/voice not GA for SEO)", () => {
    for (const path of [
      "/create",
      "/modeles",
      "/video-ia",
      "/generate",
      "/pricing",
      "/image-prete",
    ]) {
      assert.equal(shouldCrawlerNoindexPathname(path), true, path);
      assert.equal(isIndexableSitePath(path), false, path);
    }
  });

  it("soft 404: unknown generateur slug", () => {
    assert.equal(isUnknownGenerateurPath("/generateur/page-inventee-xyz"), true);
    assert.equal(isUnknownGenerateurPath("/generateur/vacances-dubai"), false);
    assert.equal(isUnknownGenerateurPath("/create"), false);
  });
});
