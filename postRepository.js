const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");

const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
];

class PostRepository {
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
        if (error) {
          reject(error);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
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
      "SELECT id, title, completed, created_at FROM posts ORDER BY completed, id DESC"
    );
  }

  async create(title) {
    await this.ready;
    const cleanTitle = String(title || "").trim();
    if (!cleanTitle) throw new Error("Post title must not be empty");
    return this.run("INSERT INTO posts(title) VALUES (?)", [cleanTitle]);
  }

  async toggle(id) {
    await this.ready;
    return this.run(
      "UPDATE posts SET completed = CASE completed WHEN 0 THEN 1 ELSE 0 END WHERE id = ?",
      [id]
    );
  }

  async remove(id) {
    await this.ready;
    return this.run("DELETE FROM posts WHERE id = ?", [id]);
  }

  async close() {
    await this.ready;
    return new Promise((resolve, reject) => {
      this.db.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

module.exports = PostRepository;
