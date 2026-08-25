const path = require("path");
const PostRepository = require("./postRepository");
const PostgresRepository = require("./postgresRepository");

function createRepository() {
  if (process.env.DATABASE_URL) {
    return new PostgresRepository(process.env.DATABASE_URL);
  }

  return new PostRepository(
    process.env.DB_PATH || path.join(__dirname, "data", "postiliste.db")
  );
}

module.exports = createRepository;
