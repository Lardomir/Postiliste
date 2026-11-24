const createApp = require("./app");
const { hashPassword } = require("./lib/security");
const { username, email } = require("./lib/validation");

async function main() {
  const app = createApp();
  const store = app.locals.store;
  await store.ready;
  const { total } = await store.userCount();
  if (Number(total) === 0) {
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      throw new Error("Erststart: ADMIN_USERNAME und ADMIN_PASSWORD setzen (mind. 12 Zeichen).");
    }
    await store.createUser(
      username(process.env.ADMIN_USERNAME),
      email(process.env.ADMIN_EMAIL),
      hashPassword(process.env.ADMIN_PASSWORD),
      "ADMIN"
    );
    console.log("Initialer Admin-Benutzer erstellt.");
  }

  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => {
    console.log(`Poschtilischte erreichbar unter http://localhost:${port}`);
  });

  async function shutdown() {
    server.close(async () => {
      try {
        await store.close();
        process.exit(0);
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    });
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (require.main === module) main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

module.exports = { main };
