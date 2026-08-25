const { Pool } = require("pg");

class PostgresRepository {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
    this.ready = this.migrate();
  }

  async migrate() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY
      )
    `);

    const result = await this.pool.query(
      "SELECT version FROM schema_migrations WHERE version = $1",
      [1]
    );

    if (result.rowCount === 0) {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.pool.query("INSERT INTO schema_migrations(version) VALUES ($1)", [1]);
    }
  }

  async getAll() {
    await this.ready;
    const result = await this.pool.query(
      "SELECT id, title, completed, created_at FROM posts ORDER BY completed, id DESC"
    );
    return result.rows;
  }

  async create(title) {
    await this.ready;
    const cleanTitle = String(title || "").trim();
    if (!cleanTitle) throw new Error("Post title must not be empty");
    const result = await this.pool.query(
      "INSERT INTO posts(title) VALUES ($1) RETURNING id",
      [cleanTitle]
    );
    return { id: result.rows[0].id, changes: 1 };
  }

  async toggle(id) {
    await this.ready;
    const result = await this.pool.query(
      "UPDATE posts SET completed = NOT completed WHERE id = $1",
      [id]
    );
    return { changes: result.rowCount };
  }

  async remove(id) {
    await this.ready;
    const result = await this.pool.query("DELETE FROM posts WHERE id = $1", [id]);
    return { changes: result.rowCount };
  }

  async close() {
    await this.ready;
    await this.pool.end();
  }
}

module.exports = PostgresRepository;
