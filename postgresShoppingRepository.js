const { Pool } = require("pg");
const { normalizeShoppingItem } = require("./shoppingItem");

class PostgresShoppingRepository {
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
      [2]
    );

    if (result.rowCount === 0) {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS shopping_items (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          quantity TEXT,
          purchased BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.pool.query("INSERT INTO schema_migrations(version) VALUES ($1)", [2]);
    }
  }

  async getAll() {
    await this.ready;
    const result = await this.pool.query(
      "SELECT id, name, quantity, purchased, created_at FROM shopping_items ORDER BY purchased, id DESC"
    );
    return result.rows;
  }

  async create(name, quantity = "") {
    await this.ready;
    const item = normalizeShoppingItem(name, quantity);
    const result = await this.pool.query(
      "INSERT INTO shopping_items(name, quantity) VALUES ($1, $2) RETURNING id",
      [item.name, item.quantity]
    );
    return { id: result.rows[0].id, changes: 1 };
  }

  async toggle(id) {
    await this.ready;
    const result = await this.pool.query(
      "UPDATE shopping_items SET purchased = NOT purchased WHERE id = $1",
      [id]
    );
    return { changes: result.rowCount };
  }

  async remove(id) {
    await this.ready;
    const result = await this.pool.query("DELETE FROM shopping_items WHERE id = $1", [id]);
    return { changes: result.rowCount };
  }

  async close() {
    await this.ready;
    await this.pool.end();
  }
}

module.exports = PostgresShoppingRepository;
