const path = require("path");

function createRepository() {
  if (process.env.DATABASE_URL) {
    const PostgresShoppingRepository = require("./postgresShoppingRepository");
    return new PostgresShoppingRepository(process.env.DATABASE_URL);
  }

  const ShoppingRepository = require("./shoppingRepository");
  return new ShoppingRepository(
    process.env.DB_PATH || path.join(__dirname, "data", "postiliste.db")
  );
}

module.exports = createRepository;
