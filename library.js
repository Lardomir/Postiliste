function encodeHTML(inputArr) {
  if (!Array.isArray(inputArr)) {
    throw new TypeError("encodeHTML expects an array");
  }

  return inputArr.map((value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;")
  );
}

module.exports = {
  encodeHTML,
};
