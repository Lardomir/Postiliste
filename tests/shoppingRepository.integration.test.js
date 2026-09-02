const fs = require("fs");
const os = require("os");
const path = require("path");
const ShoppingRepository = require("../shoppingRepository");

describe("ShoppingRepository integration", () => {
  let tempDirectory;
  let databasePath;
  let repository;

  beforeEach(() => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "postiliste-test-"));
    databasePath = path.join(tempDirectory, "test.db");
    repository = new ShoppingRepository(databasePath);
  });

  afterEach(async () => {
    await repository.close();
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  test("stores a shopping item with quantity in the real SQLite test database", async () => {
    await repository.create("Milch", "2 l");
    const items = await repository.getAll();

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Milch");
    expect(items[0].quantity).toBe("2 l");
    expect(items[0].purchased).toBe(0);
  });

  test("rejects an empty shopping item", async () => {
    await expect(repository.create("   ")).rejects.toThrow("must not be empty");
  });

  test("marks a shopping item as purchased and deletes it", async () => {
    const created = await repository.create("Brot", "1");
    await repository.toggle(created.id);

    let items = await repository.getAll();
    expect(items[0].purchased).toBe(1);

    await repository.remove(created.id);
    items = await repository.getAll();
    expect(items).toEqual([]);
  });
});
