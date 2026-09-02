const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { normalizeShoppingItem } = require("./shoppingItem");

const migrations = [
  {
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS shopping_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        quantity TEXT,
        purchased INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
];

class ShoppingRepository {
  constructor(databasePath) {
    this.databasePath = databasePath;
    if (databasePath !== ":memory:") {
      fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    }
    this.db = new sqlite3.Database(databasePath);
    this.ready = this.migrate();
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function onRun(error) {
        if (error) reject(error);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (error, rows) => {
        if (error) reject(error);
        else resolve(rows);
      });
    });
  }

  async migrate() {
    await this.run(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)"
    );
    const appliedRows = await this.all("SELECT version FROM schema_migrations");
    const applied = new Set(appliedRows.map((row) => row.version));

    for (const migration of migrations) {
      if (!applied.has(migration.version)) {
        await this.run(migration.sql);
        await this.run("INSERT INTO schema_migrations(version) VALUES (?)", [migration.version]);
      }
    }
  }

  async getAll() {
    await this.ready;
    return this.all(
      "SELECT id, name, quantity, purchased, created_at FROM shopping_items ORDER BY purchased, id DESC"
    );
  }

  async create(name, quantity = "") {
    await this.ready;
    const item = normalizeShoppingItem(name, quantity);
    return this.run("INSERT INTO shopping_items(name, quantity) VALUES (?, ?)", [
      item.name,
      item.quantity,
    ]);
  }

  async toggle(id) {
    await this.ready;
    return this.run(
      "UPDATE shopping_items SET purchased = CASE purchased WHEN 0 THEN 1 ELSE 0 END WHERE id = ?",
      [id]
    );
  }

  async remove(id) {
    await this.ready;
    return this.run("DELETE FROM shopping_items WHERE id = ?", [id]);
  }

  async close() {
    await this.ready;
    return new Promise((resolve, reject) => {
      this.db.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

module.exports = ShoppingRepository;
