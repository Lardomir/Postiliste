function normalizeShoppingItem(name, quantity = "") {
  const cleanName = String(name ?? "").trim();
  const cleanQuantity = String(quantity ?? "").trim();

  if (!cleanName) {
    throw new Error("Item name must not be empty");
  }
  if (cleanName.length > 200) {
    throw new Error("Item name must not be longer than 200 characters");
  }
  if (cleanQuantity.length > 50) {
    throw new Error("Quantity must not be longer than 50 characters");
  }

  return {
    name: cleanName,
    quantity: cleanQuantity || null,
  };
}

module.exports = {
  normalizeShoppingItem,
};
