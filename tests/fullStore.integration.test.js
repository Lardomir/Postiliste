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
    const owner = await store.createUser("Lea", "lea@example.com", hashPassword("sicheresPasswort123!"), "USER");
    const guest = await store.createUser("Alex", "alex@example.com", hashPassword("zweitesPasswort123!"), "USER");
    const outsider = await store.createUser("Mona", "mona@example.com", hashPassword("drittesPasswort123!"), "USER");
    const admin = await store.createUser("Admin", "admin@example.com", hashPassword("adminpasswort123!"), "ADMIN");
    const id = await store.createList({
      title: "Wocheneinkauf", dueDate: "2026-12-01", responsibleUserId: owner, memberIds: [owner, guest],
    });
    const product = await store.addItem(id, "Milch", "2 l");
    await store.toggleItem(id, product);

    await store.close();
    store = new Store({ dbPath: filename });
    await store.ready;

    expect((await store.listLists({ id: owner, role: "USER" })).map((list) => list.id)).toContain(id);
    expect((await store.listLists({ id: guest, role: "USER" })).map((list) => list.id)).toContain(id);
    expect(await store.getList(id, { id: outsider, role: "USER" })).toBeNull();
    expect(await store.getList(id, { id: admin, role: "ADMIN" })).not.toBeNull();
    const products = await store.items(id);
    expect(products[0]).toMatchObject({ name: "Milch", quantity: "2 l", purchased: 1 });
    await store.toggleList(id);
    expect((await store.getList(id, { id: owner, role: "USER" })).completed).toBe(1);
    await store.deleteItem(id, product);
    expect(await store.items(id)).toEqual([]);
  });

  test("automatically creates only one version-3 schema migration", async () => {
    await store.close();
    store = new Store({ dbPath: filename });
    await store.ready;
    const rows = await store.all("SELECT version FROM schema_migrations WHERE version=3");
    expect(rows).toHaveLength(1);
  });

  test("protects responsible user from deletion until reassignment", async () => {
    const owner = await store.createUser("Owner", "owner@example.com", hashPassword("sicheresPasswort123!"));
    const id = await store.createList({ title: "Testliste", dueDate: null, responsibleUserId: owner, memberIds: [owner] });
    expect((await store.responsibleCount(owner)).total).toBe(1);
    await expect(store.deleteUser(owner)).rejects.toThrow();
    await store.deleteList(id);
    await store.deleteUser(owner);
    expect(await store.findUser(owner)).toBeNull();
  });
});
