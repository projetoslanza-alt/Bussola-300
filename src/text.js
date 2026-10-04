function fold(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function cleanName(value) {
  return String(value ?? "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchKey(value) {
  return fold(cleanName(value));
}

const TEAM_ALIASES = new Map([
  ["MANIACOS", "MANÍACOS"],
  ["NEGOCIADORES", "NEGOCIADORES"],
  ["NEGOC", "NEGOCIADORES"],
  ["NEGOC.", "NEGOCIADORES"],
  ["ELITE", "ELITE"],
  ["BOPE", "BOPE"],
  ["B.O.P.E", "BOPE"],
  ["B O P E", "BOPE"],
  ["MERCENARIOS", "MERCENÁRIOS"],
  ["VINGADORES", "VINGADORES"]
]);

function canonicalTeam(value) {
  const key = fold(value).replace(/\./g, "").trim();
  if (TEAM_ALIASES.has(fold(value))) return TEAM_ALIASES.get(fold(value));
  if (key === "BOPE" || key === "B O P E") return "BOPE";
  if (key === "NEGOC") return "NEGOCIADORES";
  if (TEAM_ALIASES.has(key)) return TEAM_ALIASES.get(key);
  for (const [alias, name] of TEAM_ALIASES) {
    if (fold(alias) === key) return name;
  }
  return null;
}

const MONTHS = {
  JAN: 1, JANEIRO: 1, FEV: 2, FEVEREIRO: 2, MAR: 3, MARCO: 3,
  ABR: 4, ABRIL: 4, MAI: 5, MAIO: 5, JUN: 6, JUNHO: 6,
  JUL: 7, JULHO: 7, AGO: 8, AGOSTO: 8, SET: 9, SETEMBRO: 9,
  OUT: 10, OUTUBRO: 10, NOV: 11, NOVEMBRO: 11, DEZ: 12, DEZEMBRO: 12
};

function monthFromToken(token) {
  const key = fold(token).replace(/[^A-Z]/g, "");
  if (MONTHS[key]) return MONTHS[key];
  for (const [name, month] of Object.entries(MONTHS)) {
    if (key.startsWith(name) && name.length >= 3) return month;
  }
  return null;
}

function parseMonthYearFromTitle(title) {
  const text = fold(title);
  const match = text.match(/(JAN(?:EIRO)?|FEV(?:EREIRO)?|MAR(?:CO)?|ABR(?:IL)?|MAI(?:O)?|JUN(?:HO)?|JUL(?:HO)?|AGO(?:STO)?|SET(?:EMBRO)?|OUT(?:UBRO)?|NOV(?:EMBRO)?|DEZ(?:EMBRO)?)\s*['']?\s*(\d{2})\b/);
  if (!match) return null;
  const month = monthFromToken(match[1]);
  const year = 2000 + Number(match[2]);
  return { month, year };
}

function cycleRange(month, year) {
  const startMonth = month === 1 ? 12 : month - 1;
  const startYear = month === 1 ? year - 1 : year;
  const starts = new Date(Date.UTC(startYear, startMonth - 1, 16));
  const ends = new Date(Date.UTC(year, month - 1, 15));
  return {
    startsOn: starts.toISOString().slice(0, 10),
    endsOn: ends.toISOString().slice(0, 10)
  };
}

function parseExplicitRange(text, yearHint) {
  const raw = String(text || "");
  const match = raw.match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?\s*[^\d]{1,6}\s*(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/);
  if (!match || !yearHint) return null;
  const year = Number(yearHint);
  const start = isoDate(year, Number(match[2]), Number(match[1]));
  let endYear = year;
  const endMonth = Number(match[5]);
  const startMonth = Number(match[2]);
  if (endMonth < startMonth) endYear += 1;
  const end = isoDate(endYear, endMonth, Number(match[4]));
  return { startsOn: start, endsOn: end };
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isExcelError(value) {
  return typeof value === "string" && /^#(DIV\/0!|REF!|VALUE!|N\/A|NAME\?|NULL!|NUM!|GETTING_DATA)/i.test(value.trim());
}

function toNumber(value) {
  if (value == null || value === "") return { value: null };
  if (typeof value === "number") return Number.isFinite(value) ? { value } : { value: null };
  const text = String(value).trim();
  if (!text || text === "-" || text.toLowerCase() === "x") return { value: null, skip: true };
  if (isExcelError(text)) return { value: null, error: text };
  const normalized = text.replace(/\s/g, "").replace("%", "");
  const numeric = normalized.includes(",") && !normalized.includes(".")
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized.replace(/,/g, "");
  const parsed = Number(numeric);
  if (!Number.isFinite(parsed)) return { value: null, skip: true };
  return { value: parsed };
}

module.exports = {
  fold, cleanName, matchKey, canonicalTeam, parseMonthYearFromTitle,
  cycleRange, parseExplicitRange, isoDate, isExcelError, toNumber, TEAM_ALIASES
};
