function requiredText(value, label, max = 200) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > max) {
    throw new Error(`${label} muss zwischen 1 und ${max} Zeichen enthalten.`);
  }
  return text;
}

function optionalText(value, max = 60) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > max) throw new Error(`Maximal ${max} Zeichen erlaubt.`);
  return text || null;
}

function optionalDate(value) {
  if (value === "" || (value === null || value === undefined)) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Ungültiges Datum.");
  }
  const parsed = new Date(value + "T00:00:00Z");
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Ungültiges Datum.");
  }
  return value;
}

function integerId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Ungültige ID.");
  return id;
}

function memberIds(raw) {
  const values = (raw === null || raw === undefined) ? [] : Array.isArray(raw) ? raw : [raw];
  return [...new Set(values.map(integerId))];
}

function username(value) {
  const name = requiredText(value, "Benutzername", 60);
  if (!/^[\p{L}\p{N}_.-]+$/u.test(name)) {
    throw new Error("Benutzername darf nur Buchstaben, Zahlen, _, . und - enthalten.");
  }
  return name;
}

function email(value) {
  const text = optionalText(value, 254);
  if (text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    throw new Error("Ungültige E-Mail-Adresse.");
  }
  return text;
}

module.exports = { requiredText, optionalText, optionalDate, integerId, memberIds, username, email };
