const { normalizeShoppingItem } = require("../shoppingItem");

describe("normalizeShoppingItem", () => {
  test("normalizes a product name and optional quantity", () => {
    expect(normalizeShoppingItem("  Milch  ", "  2 l  ")).toEqual({
      name: "Milch",
      quantity: "2 l",
    });
  });

  test("allows an item without a quantity", () => {
    expect(normalizeShoppingItem("Brot")).toEqual({
      name: "Brot",
      quantity: null,
    });
  });

  test("rejects an empty product name", () => {
    expect(() => normalizeShoppingItem("   ", "1")).toThrow("must not be empty");
  });

  test("accepts the maximum product-name length", () => {
    expect(normalizeShoppingItem("a".repeat(200)).name).toHaveLength(200);
  });

  test("rejects a product name above the maximum length", () => {
    expect(() => normalizeShoppingItem("a".repeat(201))).toThrow("200 characters");
  });

  test("rejects a quantity above the maximum length", () => {
    expect(() => normalizeShoppingItem("Milch", "a".repeat(51))).toThrow("50 characters");
  });
});
