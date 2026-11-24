const Store = require("../lib/store");
const createApp = require("../app");
const { hashPassword } = require("../lib/security");

describe("HTTP forms against a real SQLite test database", () => {
  let store, server, root, adminId, userId, listId;
  let adminCookie, userCookie, adminCsrf, userCsrf;

  const send = (url, cookie, data) =>
    fetch(root + url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...(cookie ? { cookie } : {}),
      },
      body: new URLSearchParams(data).toString(),
      redirect: "manual",
    });

  async function login(name, password) {
    const response = await send("/login", "", { username: name, password });
    expect(response.status).toBe(302);
    const cookie = response.headers.get("set-cookie").split(";")[0];
    const page = await fetch(root + "/", { headers: { cookie } });
    const html = await page.text();
    const match = html.match(/name="_csrf" value="([0-9a-f]+)"/);
    expect(match).not.toBeNull();
    return [cookie, match[1]];
  }

  beforeAll(async () => {
    store = new Store({ dbPath: ":memory:" });
    await store.ready;
    adminId = await store.createUser(
      "Admin",
      "admin@example.com",
      hashPassword("SicheresAdminPasswort123!"),
      "ADMIN",
    );
    userId = await store.createUser(
      "Lea",
      "lea@example.com",
      hashPassword("SicheresBenutzerPasswort123!"),
      "USER",
    );
    listId = await store.createList({
      title: "Private Liste",
      dueDate: null,
      responsibleUserId: adminId,
      memberIds: [adminId],
    });
    const app = createApp({
      store,
      sessionSecret: "testing-secret-that-is-longer-than-32-characters",
    });
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    root = "http://127.0.0.1:" + server.address().port;
    [adminCookie, adminCsrf] = await login(
      "Admin",
      "SicheresAdminPasswort123!",
    );
    [userCookie, userCsrf] = await login("Lea", "SicheresBenutzerPasswort123!");
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await store.close();
  });

  test("creation forms display validation error feedback", async () => {
    const list = await fetch(root + "/lists/new?error=Listenname%20fehlt", {
      headers: { cookie: adminCookie },
    });
    expect(await list.text()).toContain("Listenname fehlt");
    const user = await fetch(root + "/admin/users/new?error=Passwort%20ungueltig", {
      headers: { cookie: adminCookie },
    });
    expect(await user.text()).toContain("Passwort ungueltig");
  });

  test("redirects unauthenticated users to login", async () => {
    const response = await fetch(root + "/", { redirect: "manual" });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
  });

  test("enforces admin-only users page and private lists", async () => {
    expect(
      (await fetch(root + "/admin/users", { headers: { cookie: userCookie } }))
        .status,
    ).toBe(403);
    expect(
      (
        await fetch(root + "/lists/" + listId, {
          headers: { cookie: userCookie },
        })
      ).status,
    ).toBe(404);
    expect(
      (await fetch(root + "/admin/users", { headers: { cookie: adminCookie } }))
        .status,
    ).toBe(200);
  });

  test("rejects requests without CSRF token", async () => {
    const response = await send("/lists", userCookie, {
      title: "Failed",
      responsibleUserId: String(userId),
    });
    expect(response.status).toBe(403);
  });

  test("creates list and item from actual HTML form submissions", async () => {
    const response = await send("/lists", userCookie, {
      _csrf: userCsrf,
      title: "Familieneinkauf",
      responsibleUserId: String(userId),
      memberIds: String(userId),
    });
    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(location).toMatch(/^\/lists\/\d+$/);
    const product = await send(location + "/items", userCookie, {
      _csrf: userCsrf,
      name: "Brot",
      quantity: "2",
    });
    expect(product.status).toBe(302);
    const itemId = (await store.items(Number(location.split("/").pop())))[0].id;
    const edited = await send(
      location + "/items/" + itemId + "/edit",
      userCookie,
      {
        _csrf: userCsrf,
        name: "Vollkornbrot",
        quantity: "3",
      },
    );
    expect(edited.status).toBe(302);
    const page = await fetch(root + location, {
      headers: { cookie: userCookie },
    });
    expect(await page.text()).toContain("Vollkornbrot");
  });

  test("allows Admin to see all lists", async () => {
    const page = await fetch(root + "/", { headers: { cookie: adminCookie } });
    expect(await page.text()).toContain("Private Liste");
    const failed = await send("/lists/" + listId + "/toggle", userCookie, {
      _csrf: userCsrf,
    });
    expect(failed.status).toBe(404);
    const success = await send("/lists/" + listId + "/toggle", adminCookie, {
      _csrf: adminCsrf,
    });
    expect(success.status).toBe(302);
  });
});
