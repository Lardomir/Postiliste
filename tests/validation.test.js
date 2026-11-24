const {
  requiredText,
  optionalText,
  optionalDate,
  integerId,
  memberIds,
  username,
  email,
} = require("../lib/validation");

describe("Input validation", () => {
  test("accepts and trims valid required text", () => {
    expect(requiredText("  Milch  ", "Produkt")).toBe("Milch");
  });
  test("rejects empty, invalid and oversized required input", () => {
    expect(() => requiredText("  ", "Produkt")).toThrow();
    expect(() => requiredText("a".repeat(201), "Produkt")).toThrow();
    expect(() => requiredText(null, "Produkt")).toThrow();
  });
  test("handles optional quantity and boundary values", () => {
    expect(optionalText("", 50)).toBeNull();
    expect(optionalText("2 kg", 50)).toBe("2 kg");
    expect(optionalText("a".repeat(50), 50)).toHaveLength(50);
    expect(() => optionalText("a".repeat(51), 50)).toThrow();
  });
  test("rejects invalid dates and calendar overflow", () => {
    expect(optionalDate("2026-12-03")).toBe("2026-12-03");
    expect(optionalDate("")).toBeNull();
    expect(() => optionalDate("2026-02-31")).toThrow();
    expect(() => optionalDate("tomorrow")).toThrow();
  });
  test("validates IDs and collapses duplicate membership entries", () => {
    expect(integerId("42")).toBe(42);
    expect(memberIds(["1", "2", "1"])).toEqual([1, 2]);
    expect(() => integerId("-2")).toThrow();
    expect(() => memberIds(["abc"])).toThrow();
  });
  test("validates usernames and e-mail", () => {
    expect(username(" Lea.Loender ")).toBe("Lea.Loender");
    expect(() => username("bad user")).toThrow();
    expect(email("lea@example.com")).toBe("lea@example.com");
    expect(() => email("invalid-email")).toThrow();
  });
});
