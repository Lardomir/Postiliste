const crypto = require("node:crypto");
const express = require("express");
const nunjucks = require("nunjucks");
const path = require("node:path");
const Store = require("./lib/store");
const {
  SESSION_COOKIE, SESSION_SECONDS, hashPassword, verifyPassword, newSessionToken,
  csrfToken, secureEquals, readCookie,
} = require("./lib/security");
const { requiredText, optionalText, optionalDate, integerId, memberIds, username, email } = require("./lib/validation");
const { sendMail } = require("./lib/mailer");

function createApp(options = {}) {
  const app = express();
  const store = options.store || new Store(options);
  const secret = options.sessionSecret || process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === "production" ? null : crypto.randomBytes(32).toString("hex"));
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET muss mindestens 32 Zeichen lang sein.");
  }
  const attempts = new Map();

  nunjucks.configure(path.join(__dirname, "views"), {
    autoescape: true, express: app, noCache: process.env.NODE_ENV !== "production",
  });
  app.set("view engine", "html");
  app.use(express.urlencoded({ extended: false, limit: "16kb" }));
  app.use(express.static(path.join(__dirname, "public")));
  app.disable("x-powered-by");

  function cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS * 1000,
    };
  }

  app.use(async (req, res, next) => {
    try {
      const token = readCookie(req.headers.cookie);
      req.sessionToken = token;
      req.user = await store.sessionUser(token);
      res.locals.me = req.user;
      res.locals.isAdmin = req.user?.role === "ADMIN";
      res.locals.csrf = req.user && token ? csrfToken(token, secret) : "";
      next();
    } catch (error) { next(error); }
  });

  const requireLogin = (req, res, next) => req.user ? next() : res.redirect("/login");
  const requireAdmin = (req, res, next) => req.user?.role === "ADMIN"
    ? next() : res.status(403).send("Kein Zugriff.");

  function csrf(req, res, next) {
    const expected = csrfToken(req.sessionToken, secret);
    if (!secureEquals(req.body._csrf, expected)) return res.status(403).send("Ungültiges Formular-Token.");
    next();
  }

  function redirectError(res, target, error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.redirect(target + (target.includes("?") ? "&" : "?") + "error=" + encodeURIComponent(message));
  }

  async function listAccess(req, res, next) {
    try {
      const id = integerId(req.params.id);
      const list = await store.getList(id, req.user);
      if (!list) return res.status(404).send("Liste nicht gefunden.");
      req.list = list;
      next();
    } catch (error) { next(error); }
  }

  function parseListForm(body, fallback) {
    const title = requiredText(body.title, "Listenname", 200);
    const dueDate = optionalDate(body.dueDate);
    const responsibleUserId = integerId(body.responsibleUserId || fallback);
    const ids = memberIds(body.memberIds);
    return { title, dueDate, responsibleUserId, memberIds: [...new Set([...ids, responsibleUserId])] };
  }

  async function notifyUsers(ids, actor, listTitle, change) {
    const uniqueIds = [...new Set(ids)].filter((id) => id !== actor.id);
    for (const id of uniqueIds) {
      try {
        const user = await store.findUser(id);
        if (!user?.email) continue;
        await sendMail({
          to: user.email,
          subject: "Poschtilischte: " + listTitle,
          text: `Hallo ${user.username},\n\n${actor.username} hat ${change}.\nListe: ${listTitle}\n`,
        });
      } catch (error) { console.error("Benachrichtigung fehlgeschlagen:", error.message); }
    }
  }

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/login", (req, res) => req.user ? res.redirect("/") : res.render("login.html", { error: req.query.error }));

  app.post("/login", async (req, res, next) => {
    try {
      const ip = req.ip || "unknown";
      const now = Date.now();
      const entry = attempts.get(ip) || { count: 0, since: now };
      if (now - entry.since > 10 * 60 * 1000) { entry.count = 0; entry.since = now; }
      if (entry.count >= 10) return res.status(429).send("Zu viele Versuche. Bitte später erneut versuchen.");
      const candidate = await store.findUserByName(String(req.body.username || "").trim());
      if (!candidate || !verifyPassword(req.body.password, candidate.password_hash)) {
        entry.count++;
        attempts.set(ip, entry);
        return redirectError(res, "/login", new Error("Benutzername oder Passwort falsch."));
      }
      attempts.delete(ip);
      if (req.sessionToken) await store.revokeSession(req.sessionToken);
      const token = newSessionToken();
      await store.createSession(token, candidate.id, Math.floor(now / 1000) + SESSION_SECONDS);
      await store.setLastLogin(candidate.id);
      res.cookie(SESSION_COOKIE, token, cookieOptions());
      res.redirect("/");
    } catch (error) { next(error); }
  });

  app.post("/logout", requireLogin, csrf, async (req, res, next) => {
    try {
      await store.revokeSession(req.sessionToken);
      res.clearCookie(SESSION_COOKIE, { path: "/", sameSite: "lax", secure: process.env.COOKIE_SECURE === "true" });
      res.redirect("/login");
    } catch (error) { next(error); }
  });

  app.use(requireLogin);
  app.get("/", async (req, res, next) => {
    try {
      res.render("overview.html", {
        lists: await store.listLists(req.user),
        error: req.query.error,
      });
    } catch (error) { next(error); }
  });

  app.get("/lists/new", async (req, res, next) => {
    try {
      res.render("list-form.html", {
        heading: "Neue Einkaufsliste", action: "/lists",
        users: await store.users(), list: { responsible_user_id: req.user.id }, memberIds: [req.user.id],
      });
    } catch (error) { next(error); }
  });

  app.post("/lists", csrf, async (req, res, next) => {
    try {
      const data = parseListForm(req.body, req.user.id);
      if (!await store.validUsers(data.memberIds)) throw new Error("Ungültige Benutzerzuweisung.");
      const id = await store.createList(data);
      await notifyUsers(data.memberIds, req.user, data.title, "dich zu einer Einkaufsliste hinzugefügt");
      res.redirect("/lists/" + id);
    } catch (error) { redirectError(res, "/lists/new", error); }
  });

  app.get("/lists/:id", listAccess, async (req, res, next) => {
    try {
      res.render("detail.html", {
        list: req.list, items: await store.items(req.list.id),
        members: await store.members(req.list.id), error: req.query.error,
      });
    } catch (error) { next(error); }
  });

  app.get("/lists/:id/edit", listAccess, async (req, res, next) => {
    try {
      res.render("list-form.html", {
        heading: "Einkaufsliste bearbeiten",
        action: "/lists/" + req.list.id + "/edit",
        users: await store.users(), list: req.list,
        memberIds: (await store.memberIds(req.list.id)).map((m) => m.user_id),
        error: req.query.error,
      });
    } catch (error) { next(error); }
  });

  app.post("/lists/:id/edit", csrf, listAccess, async (req, res, next) => {
    try {
      const oldMembers = await store.memberIds(req.list.id);
      const before = new Set(oldMembers.map((member) => member.user_id));
      const data = parseListForm(req.body, req.list.responsible_user_id);
      if (!await store.validUsers(data.memberIds)) throw new Error("Ungültige Benutzerzuweisung.");
      await store.updateList(req.list.id, data);
      await notifyUsers(data.memberIds.filter((id) => !before.has(id)), req.user, data.title, "dich zur Liste hinzugefügt");
      await notifyUsers(data.memberIds.filter((id) => before.has(id)), req.user, data.title, "die Liste aktualisiert");
      res.redirect("/lists/" + req.list.id);
    } catch (error) { redirectError(res, "/lists/" + req.list.id + "/edit", error); }
  });

  app.post("/lists/:id/toggle", csrf, listAccess, async (req, res, next) => {
    try {
      await store.toggleList(req.list.id);
      await notifyUsers((await store.memberIds(req.list.id)).map((m) => m.user_id),
        req.user, req.list.title, "die Liste als erledigt/offen markiert");
      res.redirect("/");
    } catch (error) { next(error); }
  });

  app.post("/lists/:id/delete", csrf, listAccess, async (req, res, next) => {
    try {
      const memberIdsForNotice = (await store.memberIds(req.list.id)).map((m) => m.user_id);
      await store.deleteList(req.list.id);
      await notifyUsers(memberIdsForNotice, req.user, req.list.title, "die Liste gelöscht");
      res.redirect("/");
    } catch (error) { next(error); }
  });

  app.post("/lists/:id/items", csrf, listAccess, async (req, res, next) => {
    try {
      await store.addItem(req.list.id,
        requiredText(req.body.name, "Produktname", 200),
        optionalText(req.body.quantity, 50));
      await notifyUsers((await store.memberIds(req.list.id)).map((m) => m.user_id),
        req.user, req.list.title, "einen Artikel hinzugefügt");
      res.redirect("/lists/" + req.list.id);
    } catch (error) { redirectError(res, "/lists/" + req.list.id, error); }
  });

  app.post("/lists/:id/items/:itemId/toggle", csrf, listAccess, async (req, res, next) => {
    try {
      await store.toggleItem(req.list.id, integerId(req.params.itemId));
      await notifyUsers((await store.memberIds(req.list.id)).map((m) => m.user_id),
        req.user, req.list.title, "einen Artikel als gekauft/offen markiert");
      res.redirect("/lists/" + req.list.id);
    } catch (error) { next(error); }
  });

  app.post("/lists/:id/items/:itemId/delete", csrf, listAccess, async (req, res, next) => {
    try {
      await store.deleteItem(req.list.id, integerId(req.params.itemId));
      await notifyUsers((await store.memberIds(req.list.id)).map((m) => m.user_id),
        req.user, req.list.title, "einen Artikel entfernt");
      res.redirect("/lists/" + req.list.id);
    } catch (error) { next(error); }
  });

  app.get("/admin/users", requireAdmin, async (req, res, next) => {
    try { res.render("users.html", { users: await store.users(), error: req.query.error }); }
    catch (error) { next(error); }
  });

  app.get("/admin/users/new", requireAdmin, (_req, res) =>
    res.render("user-form.html", { heading: "Benutzer erstellen", action: "/admin/users", user: {} }));

  app.post("/admin/users", requireAdmin, csrf, async (req, res, next) => {
    try {
      const name = username(req.body.username);
      const mail = email(req.body.email);
      if (!mail) throw new Error("E-Mail-Adresse wird für Benachrichtigungen benötigt.");
      const role = req.body.role === "ADMIN" ? "ADMIN" : "USER";
      if (req.body.password !== req.body.confirmPassword) throw new Error("Passwörter stimmen nicht überein.");
      if (await store.findUserByName(name)) throw new Error("Benutzername ist bereits vergeben.");
      await store.createUser(name, mail, hashPassword(req.body.password), role);
      res.redirect("/admin/users");
    } catch (error) { redirectError(res, "/admin/users/new", error); }
  });

  app.get("/admin/users/:id/edit", requireAdmin, async (req, res, next) => {
    try {
      const user = await store.findUser(integerId(req.params.id));
      if (!user) return res.status(404).send("Benutzer nicht gefunden.");
      res.render("user-form.html", {
        heading: "Benutzer bearbeiten", action: "/admin/users/" + user.id,
        user, error: req.query.error,
      });
    } catch (error) { next(error); }
  });

  app.post("/admin/users/:id", requireAdmin, csrf, async (req, res, next) => {
    try {
      const id = integerId(req.params.id);
      const user = await store.findUser(id);
      if (!user) return res.status(404).send("Benutzer nicht gefunden.");
      const name = username(req.body.username);
      const mail = email(req.body.email);
      if (!mail) throw new Error("E-Mail-Adresse wird für Benachrichtigungen benötigt.");
      const role = req.body.role === "ADMIN" ? "ADMIN" : "USER";
      if (id === req.user.id && role !== "ADMIN") throw new Error("Eigene Admin-Rolle darf nicht entfernt werden.");
      const other = await store.findUserByName(name);
      if (other && other.id !== id) throw new Error("Benutzername ist bereits vergeben.");
      let passwordHash = null;
      if (req.body.password) {
        if (req.body.password !== req.body.confirmPassword) throw new Error("Passwörter stimmen nicht überein.");
        passwordHash = hashPassword(req.body.password);
      }
      await store.updateUser(id, name, mail, role, passwordHash);
      res.redirect("/admin/users");
    } catch (error) { redirectError(res, "/admin/users/" + req.params.id + "/edit", error); }
  });

  app.post("/admin/users/:id/delete", requireAdmin, csrf, async (req, res, next) => {
    try {
      const id = integerId(req.params.id);
      if (id === req.user.id) throw new Error("Eigenes Konto kann nicht gelöscht werden.");
      const references = await store.responsibleCount(id);
      if (Number(references.total) > 0) {
        throw new Error("Benutzer ist für Einkaufslisten verantwortlich. Verantwortung zuerst ändern.");
      }
      await store.deleteUser(id);
      res.redirect("/admin/users");
    } catch (error) { redirectError(res, "/admin/users", error); }
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).send("Interner Serverfehler.");
  });
  app.locals.store = store;
  return app;
}

module.exports = createApp;
