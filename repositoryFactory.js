const path = require("path");

function createRepository() {
  if (process.env.DATABASE_URL) {
    const PostgresRepository = require("./postgresRepository");
    return new PostgresRepository(process.env.DATABASE_URL);
  }

  const PostRepository = require("./postRepository");
  return new PostRepository(
    process.env.DB_PATH || path.join(__dirname, "data", "postiliste.db")
  );
}

module.exports = createRepository;
