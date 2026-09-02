const express = require("express");
const nunjucks = require("nunjucks");
const path = require("path");
const createRepository = require("./repositoryFactory");
const { normalizeShoppingItem } = require("./shoppingItem");

function createApp(options = {}) {
  const app = express();
  const repository = options.repository || createRepository();

  nunjucks.configure(path.join(__dirname, "views"), {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV !== "production",
  });

  app.set("view engine", "html");
  app.set("views", path.join(__dirname, "views"));
  app.use(express.urlencoded({ extended: false }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/", async (req, res, next) => {
    try {
      const items = await repository.getAll();
      res.render("index.html", {
        items,
        error: req.query.error || null,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/items", async (req, res, next) => {
    let item;
    try {
      item = normalizeShoppingItem(req.body.name, req.body.quantity);
    } catch (error) {
      return res.redirect("/?error=" + encodeURIComponent(error.message));
    }

    try {
      await repository.create(item.name, item.quantity);
      return res.redirect("/");
    } catch (error) {
      return next(error);
    }
  });

  app.post("/items/:id/toggle", async (req, res, next) => {
    try {
      await repository.toggle(Number(req.params.id));
      return res.redirect("/");
    } catch (error) {
      return next(error);
    }
  });

  app.post("/items/:id/delete", async (req, res, next) => {
    try {
      await repository.remove(Number(req.params.id));
      return res.redirect("/");
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).send("Internal server error");
  });

  app.locals.repository = repository;
  return app;
}

module.exports = createApp;
