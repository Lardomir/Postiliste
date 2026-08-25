const express = require("express");
const nunjucks = require("nunjucks");
const path = require("path");
const PostRepository = require("./postRepository");

function createApp(options = {}) {
  const app = express();
  const repository =
    options.repository ||
    new PostRepository(process.env.DB_PATH || path.join(__dirname, "data", "postiliste.db"));

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
      const posts = await repository.getAll();
      res.render("index.html", {
        posts,
        error: req.query.error || null,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/posts", async (req, res, next) => {
    try {
      const title = String(req.body.title || "").trim();
      if (!title) {
        return res.redirect("/?error=" + encodeURIComponent("Please enter a title."));
      }

      await repository.create(title);
      return res.redirect("/");
    } catch (error) {
      return next(error);
    }
  });

  app.post("/posts/:id/toggle", async (req, res, next) => {
    try {
      await repository.toggle(Number(req.params.id));
      res.redirect("/");
    } catch (error) {
      next(error);
    }
  });

  app.post("/posts/:id/delete", async (req, res, next) => {
    try {
      await repository.remove(Number(req.params.id));
      res.redirect("/");
    } catch (error) {
      next(error);
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
