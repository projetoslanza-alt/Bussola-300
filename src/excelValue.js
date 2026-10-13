const { isExcelError } = require("./text");

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

function isBlankToken(value) {
  if (value == null) return true;
  const text = String(value).trim();
  if (!text) return true;
  if (text === "-" || text === "—" || text === "–") return true;
  return /^n\/?a$/i.test(text);
}

function excelSerialToIso(value) {
  if (isBlankToken(value)) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const text = value.trim();
    if (isExcelError(text)) return null;
    const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const numeric = Number(text.replace(",", "."));
    if (!Number.isFinite(numeric)) return null;
    return excelSerialToIso(numeric);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const utc = new Date(EXCEL_EPOCH + Math.round(value) * 86400000);
  return utc.toISOString().slice(0, 10);
}

function parseAmount(value) {
  if (isBlankToken(value)) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const original = value.trim();
  if (isExcelError(original)) return null;
  let text = original.replace(/\s/g, "").replace(/^R\$/i, "").replace(/%$/, "");
  if (isBlankToken(text)) return null;
  if (text.includes(",") && text.includes(".")) {
    text = text.lastIndexOf(",") > text.lastIndexOf(".")
      ? text.replace(/\./g, "").replace(",", ".")
      : text.replace(/,/g, "");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function periodLabel(iso) {
  if (!iso) return null;
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [year, month] = String(iso).slice(0, 10).split("-");
  const index = Number(month) - 1;
  if (!year || index < 0 || index > 11) return String(iso).slice(0, 10);
  return `${months[index]}/${year}`;
}

module.exports = { isBlankToken, excelSerialToIso, parseAmount, periodLabel };
