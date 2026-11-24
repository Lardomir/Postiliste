const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
process.chdir(root);
const envFile = path.join(root, ".env");

function randomSecret() {
  return crypto.randomBytes(32).toString("base64url");
}

if (!fs.existsSync(envFile)) {
  const databasePassword = randomSecret();
  const adminPassword = randomSecret();
  const sessionSecret = randomSecret();
  const env = [
    "PORT=3000",
    "POSTGRES_PASSWORD=" + databasePassword,
    "ADMIN_USERNAME=admin",
    "ADMIN_PASSWORD=" + adminPassword,
    "ADMIN_EMAIL=admin@example.test",
    "SESSION_SECRET=" + sessionSecret,
    "COOKIE_SECURE=false",
    "SMTP4DEV_WEB_PORT=8025",
    "MAIL_FROM=postiliste@example.test",
    "",
  ].join("\n");
  fs.writeFileSync(envFile, env, { mode: 0o600, flag: "wx" });
  console.log(
    "Local .env generated. Open it to find the initial admin credentials.",
  );
} else {
  console.log("Using existing .env (credentials are not overwritten).");
}

function run(program, args) {
  execFileSync(program, args, {
    stdio: "inherit",
    cwd: root,
    shell: process.platform === "win32",
  });
}

run("npm", ["install"]);
run("docker", ["compose", "up", "--build", "-d"]);
if (process.argv.includes("--jenkins")) {
  run("docker", [
    "compose",
    "-f",
    "docker/jenkins/docker-compose.yml",
    "up",
    "--build",
    "-d",
  ]);
}
console.log(
  "Poschtilischte: http://localhost:3000 | smtp4dev: http://localhost:8025",
);
