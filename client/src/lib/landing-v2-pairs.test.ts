import { describe, expect, it } from "vitest";
import {
  createLandingEditorialSlots,
  editorialPairAt,
  LANDING_EDITORIAL_PAIRS,
  LANDING_EDITORIAL_POOL,
  LANDING_V2_COMPARE_PAIRS,
  pickLandingEditorialGrid,
  rotateEditorialPairIndices,
} from "./landing-v2-pairs";

describe("pickLandingEditorialGrid", () => {
  it("returns 4 unique pairs", () => {
    const grid = pickLandingEditorialGrid(4);
    expect(grid).toHaveLength(4);
    const ids = grid.map((item) => item.id);
    expect(new Set(ids).size).toBe(4);
  });

  it("assigns editorial positions and numbering", () => {
    const grid = pickLandingEditorialGrid(4);
    expect(grid[0]?.position).toBe("editorial-position-1");
    expect(grid[0]?.n).toBe("01");
    expect(grid[3]?.position).toBe("editorial-position-4");
  });

  it("uses the new landing editorial assets", () => {
    const ids = new Set(LANDING_EDITORIAL_PAIRS.map((pair) => pair.id));
    expect(ids.has("resort-celebrity")).toBe(true);
    expect(ids.has("ronaldo")).toBe(true);
    expect(ids.has("maldives")).toBe(true);
    expect(ids.has("paris")).toBe(true);
    for (const pair of LANDING_EDITORIAL_PAIRS) {
      expect(pair.original).toContain("/assets/landing-editorial/");
      expect(pair.generated).toContain("/assets/landing-editorial/");
    }
  });

  it("keeps compare pairs pool size stable", () => {
    expect(LANDING_V2_COMPARE_PAIRS.length).toBeGreaterThanOrEqual(5);
  });
});

describe("landing editorial synchronized rotation", () => {
  it("creates four slots with unique pair indices", () => {
    const slots = createLandingEditorialSlots();
    expect(slots).toHaveLength(4);
    const indices = slots.map((slot) => slot.pairIndex);
    expect(new Set(indices).size).toBe(4);
  });

  it("rotates to new random indices without duplicates", () => {
    const initial = [0, 1, 2, 3];
    const rotated = rotateEditorialPairIndices(initial);
    expect(rotated).toHaveLength(4);
    expect(new Set(rotated).size).toBe(4);
  });

  it("can pick indices outside the initial editorial set", () => {
    const initial = [0, 1, 2, 3];
    let sawExtended = false;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const rotated = rotateEditorialPairIndices(initial);
      if (rotated.some((index) => index >= LANDING_EDITORIAL_PAIRS.length)) {
        sawExtended = true;
        break;
      }
    }
    expect(sawExtended).toBe(true);
  });

  it("returns a pair for every pool index", () => {
    expect(LANDING_EDITORIAL_POOL.length).toBeGreaterThan(
      LANDING_EDITORIAL_PAIRS.length,
    );
    for (let i = 0; i < LANDING_EDITORIAL_POOL.length; i += 1) {
      expect(editorialPairAt(i).id).toBeTruthy();
    }
  });
});
