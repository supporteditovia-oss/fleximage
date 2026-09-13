import { describe, expect, it } from "vitest";
import {
  LANDING_V2_COMPARE_PAIRS,
  pickLandingEditorialGrid,
} from "./landing-v2-pairs";

describe("pickLandingEditorialGrid", () => {
  it("returns 4 unique tiles from the pool", () => {
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

  it("can surface pairs beyond the old static four", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i += 1) {
      pickLandingEditorialGrid(4).forEach((item) => seen.add(item.id));
    }
    expect(seen.has("esso")).toBe(true);
    expect(seen.has("portrait-car")).toBe(true);
  });

  it("keeps compare pairs pool size stable", () => {
    expect(LANDING_V2_COMPARE_PAIRS.length).toBeGreaterThanOrEqual(5);
  });
});
