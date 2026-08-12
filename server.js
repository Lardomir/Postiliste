const express = require("express");
const nunjucks = require("nunjucks");
const sqlite_pkg = require("sqlite3");
const { encodeHTML } = require("./library.js");

// Express-JS App konfigurieren:
const app = express();
const port = 3000;

// Instanz des SQLite-DB-Treibers initialisieren:
const sqlite3 = sqlite_pkg.verbose();

// Wir konfigurieren die DB-Connection zur Demo-DB "chinook":
const db = new sqlite3.Database("./chinook.db");

// Wir loggen alle SQL-Statements:
db.on("trace", (sql) => {
  console.log(`DEBUG SQL: ${sql}`);
});

// Template-Engine (Nunjucks) konfigurieren:
// Doku siehe https://mozilla.github.io/nunjucks/api.html#configure
nunjucks.configure("views", {
  express: app,
  autoescape: true,
  noCache: true,
});

// Wo sind unsere Nunjucks-HTML-Templates?
app.set("view engine", "njk");
app.set("views", "./views");

// Unsere Default-Route ('/' -> Index-Seite)
app.get("/", (req, res) => {
  // Wir laden ein paar Beispieldaten aus unserer Beispiel-DB:
  const stm = db.all(
    "SELECT * FROM artists WHERE Name LIKE ? order by Random()",
    ["A%"],
    (err, rows) => {
      // wir rendern das Nunjucks-Template 'hello.html':
      res.render("hello.html", {
        today: new Date(),
        err: err,
        rows: rows,
      });
    }
  );
});

// Eine weitere Beispiel-Route: '/json-demo'
app.get("/json-demo", (req, res) => {
  // Wir laden ein paar Beispieldaten aus unserer Beispiel-DB:
  const stm = db.all("SELECT * FROM artists LIMIT 10", (err, rows) => {
    // wir liefern eine JSON-Antwort:
    res.json({
      today: new Date(),
      rows: rows,
    });
  });
});

// ... und schlussendlich wird der App-Server hochgefahren:
app.listen(port, () => {
  console.log(`Encode HTML: ${encodeHTML(["<script>alert('fooo')</script>"])}`);
  console.log(`Example app listening at http://localhost:${port}`);
});
