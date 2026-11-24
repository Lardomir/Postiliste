const crypto = require("node:crypto");

const SESSION_COOKIE = "postiliste_session";
const SESSION_SECONDS = 60 * 60 * 12;

function hashPassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 256
  ) {
    throw new Error("Passwort muss zwischen 12 und 256 Zeichen lang sein.");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, encoded) {
  if (
    typeof password !== "string" ||
    !encoded ||
    !encoded.startsWith("scrypt$")
  )
    return false;
  const parts = encoded.split("$");
  if (
    parts.length !== 3 ||
    !/^[0-9a-f]{32}$/.test(parts[1]) ||
    !/^[0-9a-f]{128}$/.test(parts[2])
  )
    return false;
  const actual = crypto.scryptSync(password, parts[1], 64);
  return crypto.timingSafeEqual(actual, Buffer.from(parts[2], "hex"));
}

function newSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function csrfToken(token, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update("csrf:" + token)
    .digest("hex");
}

function secureEquals(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function readCookie(header, name = SESSION_COOKIE) {
  const pair = (header || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(name + "="));
  return pair ? pair.slice(name.length + 1) : null;
}

module.exports = {
  SESSION_COOKIE,
  SESSION_SECONDS,
  hashPassword,
  verifyPassword,
  newSessionToken,
  tokenHash,
  csrfToken,
  secureEquals,
  readCookie,
};
