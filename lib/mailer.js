const net = require("node:net");

function cleanHeader(value) {
  return String(value || "")
    .replace(/[\r\n]/g, " ")
    .trim();
}

// Minimal SMTP transport intentionally restricted to local, unauthenticated smtp4dev.
// For real SMTP providers use a library supporting TLS and authentication.
function sendMail({ to, subject, text }, options = {}) {
  const host = options.host || process.env.SMTP_HOST;
  if (!host) return Promise.resolve(false);
  const port = Number(options.port || process.env.SMTP_PORT || 25);
  const from = cleanHeader(
    options.from || process.env.MAIL_FROM || "postiliste@example.test",
  );
  const recipient = cleanHeader(to);
  if (
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient) ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from)
  ) {
    return Promise.reject(new Error("Ungültige E-Mail-Adresse."));
  }
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    socket.setTimeout(5000);
    let buffer = "";
    const lines = [];
    let waiting = null;
    let finished = false;
    function done(error) {
      if (finished) return;
      finished = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(true);
    }
    function onLine(line) {
      if (waiting) {
        const cb = waiting;
        waiting = null;
        cb(line);
      } else lines.push(line);
    }
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, "");
        buffer = buffer.slice(index + 1);
        onLine(line);
      }
    });
    socket.on("error", done);
    socket.on("timeout", () => done(new Error("SMTP timeout")));
    socket.on("close", () => {
      if (!finished) done(new Error("SMTP connection closed"));
    });
    function nextLine() {
      if (lines.length) return Promise.resolve(lines.shift());
      return new Promise((resolveLine) => {
        waiting = resolveLine;
      });
    }
    async function response(code) {
      let line = await nextLine();
      while (/^\d{3}-/.test(line)) line = await nextLine();
      if (!line.startsWith(String(code) + " "))
        throw new Error("SMTP response: " + line);
    }
    async function command(line, code) {
      socket.write(line + "\r\n");
      await response(code);
    }
    socket.once("connect", async () => {
      try {
        await response(220);
        await command("EHLO postiliste.local", 250);
        await command("MAIL FROM:<" + from + ">", 250);
        await command("RCPT TO:<" + recipient + ">", 250);
        await command("DATA", 354);
        const safeText = String(text || "")
          .replace(/\r?\n/g, "\r\n")
          .replace(/^\./gm, "..");
        socket.write(
          "From: " +
            from +
            "\r\nTo: " +
            recipient +
            "\r\nSubject: " +
            cleanHeader(subject) +
            "\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n" +
            safeText +
            "\r\n.\r\n",
        );
        await response(250);
        done();
      } catch (error) {
        done(error);
      }
    });
  });
}

module.exports = { sendMail };
