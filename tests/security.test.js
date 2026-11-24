const {
  hashPassword, verifyPassword, newSessionToken, tokenHash, csrfToken, secureEquals, readCookie,
} = require("../lib/security");

describe("Authentication security", () => {
  test("hashes a password with a random salt and verifies it", () => {
    const password = "meinSicheresPasswort123!";
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);
    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toContain(password);
    expect(verifyPassword(password, hash1)).toBe(true);
    expect(verifyPassword("wrong-password", hash1)).toBe(false);
  });
  test("rejects weak and malformed credentials", () => {
    expect(() => hashPassword("123")).toThrow();
    expect(verifyPassword("abc", "bad-hash")).toBe(false);
  });
  test("generates unguessable session and CSRF tokens", () => {
    const token = newSessionToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash(token)).not.toBe(token);
    expect(csrfToken(token, "secret")).not.toBe(csrfToken("different", "secret"));
    expect(secureEquals("abc", "abc")).toBe(true);
    expect(secureEquals("abc", "abcd")).toBe(false);
  });
  test("reads only the selected cookie", () => {
    expect(readCookie("other=abc; postiliste_session=xyz")).toBe("xyz");
    expect(readCookie("other=abc")).toBeNull();
  });
});
