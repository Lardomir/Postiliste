const { encodeHTML } = require("../library.js");

describe("encodeHTML", () => {
  test("empty input returns empty output", () => {
    expect(encodeHTML([])).toEqual([]);
  });

  test("escapes dangerous HTML characters", () => {
    expect(encodeHTML(["<script>alert('x')</script>"])).toEqual([
      "&lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt;",
    ]);
  });

  test("converts non-string values safely", () => {
    expect(encodeHTML([42, true])).toEqual(["42", "true"]);
  });

  test("rejects non-array input", () => {
    expect(() => encodeHTML("<b>wrong</b>")).toThrow(TypeError);
  });
});
