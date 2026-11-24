const assert = require("node:assert/strict");
const fs = require("node:fs");

const base = "http://localhost:3000";
async function post(path, cookie, body) {
  return fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}) },
    body: new URLSearchParams(body).toString(),
    redirect: "manual",
  });
}
async function login(username, password) {
  const response = await post("/login", null, { username, password });
  assert.equal(response.status, 302, "login must redirect");
  const cookie = response.headers.get("set-cookie").split(";")[0];
  const html = await (await fetch(base + "/", { headers: { cookie } })).text();
  const token = html.match(/name="_csrf" value="([0-9a-f]+)"/);
  assert.ok(token, "CSRF token must exist");
  return { cookie, csrf: token[1] };
}
async function create() {
  const { cookie, csrf } = await login("admin", "CI_Admin_Password_123");
  let response = await post("/admin/users", cookie, {
    _csrf: csrf, username: "smokeuser", email: "smoke@example.test",
    password: "SmokePassword123456!", confirmPassword: "SmokePassword123456!", role: "USER",
  });
  assert.equal(response.status, 302, "admin creates user");
  const html = await (await fetch(base + "/lists/new", { headers: { cookie } })).text();
  const match = html.match(/<option value="(\d+)"[^>]*>\s*smokeuser\s*<\/option>/);
  assert.ok(match, "new user listed in assignment dropdown");
  response = await post("/lists", cookie, {
    _csrf: csrf, title: "Smoke Einkauf", responsibleUserId: match[1], memberIds: match[1],
  });
  assert.equal(response.status, 302, "create list");
  const path = response.headers.get("location");
  assert.match(path, /^\/lists\/\d+$/);
  response = await post(path + "/items", cookie, { _csrf: csrf, name: "Milch", quantity: "2 l" });
  assert.equal(response.status, 302, "add product");
  const detail = await (await fetch(base + path, { headers: { cookie } })).text();
  assert.ok(detail.includes("Milch") && detail.includes("2 l"), "item is rendered");
  const normal = await login("smokeuser", "SmokePassword123456!");
  assert.equal((await fetch(base + path, { headers: { cookie: normal.cookie } })).status, 200);
  assert.equal((await fetch(base + "/admin/users", { headers: { cookie: normal.cookie } })).status, 403);
  let delivered = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch("http://localhost:8025/api/messages");
    if (response.ok) {
      const json = await response.json();
      const messages = Array.isArray(json) ? json : json.results || json.Results || [];
      if (messages.some((message) => JSON.stringify(message).includes("Smoke Einkauf"))) {
        delivered = true;
        break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(delivered, "smtp4dev captured the list notification");
  fs.writeFileSync("smoke-state.json", JSON.stringify({ path }));
  console.log("Functional Docker smoke creation passed");
}
async function verify() {
  const { cookie } = await login("admin", "CI_Admin_Password_123");
  const { path } = JSON.parse(fs.readFileSync("smoke-state.json", "utf8"));
  const response = await fetch(base + path, { headers: { cookie } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes("Smoke Einkauf") && html.includes("Milch"));
  console.log("PostgreSQL persistence after restart passed");
}
(async () => {
  if (process.argv[2] === "create") await create();
  else if (process.argv[2] === "verify") await verify();
  else throw new Error("Use create or verify");
})().catch((error) => { console.error(error); process.exitCode = 1; });
