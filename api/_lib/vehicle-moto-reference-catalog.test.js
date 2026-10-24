const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  detectCatalogModel,
  enrichImageUrlsWithVehicleCatalog,
} = require("./vehicle-moto-reference-catalog");

test("detects Yamaha YZ125 catalog entry", () => {
  assert.equal(detectCatalogModel("Remplace la moto par une Yamaha 125 YZ")?.id, "yamaha-yz125");
});

test("enriches image urls with catalog angles", () => {
  const resolveUrl = (p) => `https://example.com${p}`;
  const { urls, promptInject, catalogId, addedCount } =
    enrichImageUrlsWithVehicleCatalog(
      "Remplace la moto par une Yamaha YZ125",
      ["https://example.com/user.jpg"],
      resolveUrl,
    );
  assert.equal(catalogId, "yamaha-yz125");
  assert.ok(addedCount >= 1);
  assert.ok(urls.length > 1);
  assert.match(promptInject, /YZ125|YZ graphics/i);
});
