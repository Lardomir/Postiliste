const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Store = require("../lib/store");
const { hashPassword } = require("../lib/security");

describe("Multi-user real SQLite integration", () => {
  let directory, filename, store;
  beforeEach(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "postiliste-full-"));
    filename = path.join(directory, "test.db");
    store = new Store({ dbPath: filename });
    await store.ready;
  });
  afterEach(async () => {
    await store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test("persists lists, memberships and products across database reopening", async () => {
    const owner = await store.createUser(
      "Lea",
      "lea@example.com",
      hashPassword("sicheresPasswort123!"),
      "USER",
    );
    const guest = await store.createUser(
      "Alex",
      "alex@example.com",
      hashPassword("zweitesPasswort123!"),
      "USER",
    );
    const outsider = await store.createUser(
      "Mona",
      "mona@example.com",
      hashPassword("drittesPasswort123!"),
      "USER",
    );
    const admin = await store.createUser(
      "Admin",
      "admin@example.com",
      hashPassword("adminpasswort123!"),
      "ADMIN",
    );
    const id = await store.createList({
      title: "Wocheneinkauf",
      dueDate: "2026-12-01",
      responsibleUserId: owner,
      memberIds: [owner, guest],
    });
    const product = await store.addItem(id, "Milch", "2 l");
    await store.toggleItem(id, product);
    await store.updateItem(id, product, "Vollmilch", "3 l");

    await store.close();
    store = new Store({ dbPath: filename });
    await store.ready;

    expect(
      (await store.listLists({ id: owner, role: "USER" })).map(
        (list) => list.id,
      ),
    ).toContain(id);
    expect(
      (await store.listLists({ id: guest, role: "USER" })).map(
        (list) => list.id,
      ),
    ).toContain(id);
    expect(await store.getList(id, { id: outsider, role: "USER" })).toBeNull();
    expect(
      await store.getList(id, { id: admin, role: "ADMIN" }),
    ).not.toBeNull();
    const products = await store.items(id);
    expect(products[0]).toMatchObject({
      name: "Vollmilch",
      quantity: "3 l",
      purchased: 1,
    });
    await store.toggleList(id);
    expect(
      (await store.getList(id, { id: owner, role: "USER" })).completed,
    ).toBe(1);
    await store.deleteItem(id, product);
    expect(await store.items(id)).toEqual([]);
  });

  test("automatically creates only one version-3 schema migration", async () => {
    await store.close();
    store = new Store({ dbPath: filename });
    await store.ready;
    const rows = await store.all(
      "SELECT version FROM schema_migrations WHERE version=3",
    );
    expect(rows).toHaveLength(1);
  });

  test("rolls back list and assignment updates on invalid membership", async () => {
    const owner = await store.createUser(
      "Owner", "owner@example.com", hashPassword("ownerPassword1234!")
    );
    const listId = await store.createList({
      title: "Original", dueDate: null, responsibleUserId: owner, memberIds: [owner],
    });
    await expect(store.updateList(listId, {
      title: "Should roll back", dueDate: null, responsibleUserId: owner,
      memberIds: [owner, 999999],
    })).rejects.toThrow();
    const list = await store.getList(listId, { id: owner, role: "USER" });
    expect(list.title).toBe("Original");
    expect((await store.memberIds(listId)).map(m => m.user_id)).toEqual([owner]);

    await expect(store.createList({
      title: "Invalid", dueDate: null, responsibleUserId: owner,
      memberIds: [999999],
    })).rejects.toThrow();
    expect((await store.listLists({ id: owner, role: "USER" }))).toHaveLength(1);
  });

  test("upgrades an existing v2 database without deleting older data", async () => {
    const sqlite3 = require("sqlite3");
    const oldPath = path.join(directory, "legacy.db");
    const db = new sqlite3.Database(oldPath);
    await new Promise((resolve, reject) => db.exec(
      "CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY);" +
      "INSERT INTO schema_migrations(version) VALUES (2);" +
      "CREATE TABLE shopping_items (id INTEGER PRIMARY KEY, name TEXT);" +
      "INSERT INTO shopping_items(id,name) VALUES (1,'Legacy product');",
      error => error ? reject(error) : resolve()
    ));
    await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
    const upgrade = new Store({ dbPath: oldPath });
    try {
      await upgrade.ready;
      const versions = await upgrade.all("SELECT version FROM schema_migrations ORDER BY version");
      expect(versions.map(row => row.version)).toEqual([2, 3]);
      expect(await upgrade.all("SELECT name FROM shopping_items")).toEqual([{ name: "Legacy product" }]);
      expect(await upgrade.all("SELECT * FROM shopping_lists")).toEqual([]);
    } finally {
      await upgrade.close();
    }
  });

  test("creates, updates and safely deletes users", async () => {
    const id = await store.createUser(
      "Testuser", "test@example.com", hashPassword("firstPassword1234!"), "USER"
    );
    await store.updateUser(id, "Testuser2", "new@example.com", "ADMIN",
      hashPassword("changedPassword1234!"));
    const user = await store.findUserByName("Testuser2");
    expect(user.email).toBe("new@example.com");
    expect(user.role).toBe("ADMIN");
    expect(user.password_hash).not.toContain("changedPassword1234!");
    await store.deleteUser(id);
    expect(await store.findUser(id)).toBeNull();
  });

  test("protects responsible user from deletion until reassignment", async () => {
    const owner = await store.createUser(
      "Owner",
      "owner@example.com",
      hashPassword("sicheresPasswort123!"),
    );
    const id = await store.createList({
      title: "Testliste",
      dueDate: null,
      responsibleUserId: owner,
      memberIds: [owner],
    });
    expect((await store.responsibleCount(owner)).total).toBe(1);
    await expect(store.deleteUser(owner)).rejects.toThrow();
    await store.deleteList(id);
    await store.deleteUser(owner);
    expect(await store.findUser(owner)).toBeNull();
  });
});
