const createApp = require("./app");

const port = Number(process.env.PORT || 3000);
const app = createApp();
const server = app.listen(port, () => {
  console.log(`Postiliste listening at http://localhost:${port}`);
});

async function shutdown() {
  server.close(async () => {
    try {
      await app.locals.repository.close();
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
