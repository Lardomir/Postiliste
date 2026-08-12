const { encodeHTML } = require("../library.js");

test('encodeHTML: empty input returns empty output', () => {
	expect(encodeHTML([])).toEqual([]);
});