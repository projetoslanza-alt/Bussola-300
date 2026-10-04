const XLSX = require("xlsx");
const { fold } = require("../text");

function rowsOf(worksheet) {
  return XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });
}

function priorityCode(value) {
  const match = String(value || "").toUpperCase().match(/P[1-4]/);
  return match ? match[0] : null;
}

function isRestricted(reason) {
  const blob = fold(`${reason.title} ${reason.whenToUse || ""} ${reason.defaultType || ""}`);
  return ["DESLIG", "ETICA", "LGPD", "RESTRIT", "SENSIV"].some((token) => blob.includes(token));
}

function parseCatalog(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const reasons = [];
  const policies = [];
  const matrix = [];
  const rules = [];
  const meta = { declaredTotal: null };

  const validation = workbook.Sheets.Validação || workbook.Sheets[workbook.SheetNames[0]];
  const table = rowsOf(validation);
  let header = -1;
  table.forEach((row, index) => {
    const joined = fold((row || []).join(" "));
    if (joined.includes("TOTAL DE MOTIVOS") && table[index + 1]) meta.declaredTotal = Number(table[index + 1][0]) || null;
    if (header < 0 && joined.includes("AREA RESPONSAVEL") && joined.includes("MOTIVO")) header = index;
  });
  if (header >= 0) {
    for (let i = header + 1; i < table.length; i += 1) {
      const row = table[i] || [];
      const joined = fold(row.join(" "));
      if (joined.includes("AREA RESPONSAVEL") && joined.includes("MOTIVO")) continue;
      const area = row[0] ? String(row[0]).trim() : "";
      const title = row[2] ? String(row[2]).trim() : "";
      if (!area || !title) continue;
      if (fold(area).includes("CATALOGO") || fold(area).includes("TOTAL DE")) continue;
      const reason = {
        area,
        code: row[1] ? String(row[1]).trim() : null,
        title,
        whenToUse: row[3] ? String(row[3]).trim() : null,
        defaultType: row[4] ? String(row[4]).trim() : null,
        slaText: row[5] ? String(row[5]).trim() : null,
        defaultPriority: priorityCode(row[5]),
        slaOwner: row[6] ? String(row[6]).trim() : null,
        validationStatus: row[7] ? String(row[7]).trim() : null,
        adjustmentNote: row[8] ? String(row[8]).trim() : null,
        sourceSheet: "Validação",
        sourceRow: i + 1
      };
      const pending = [];
      if (!reason.code) pending.push("código");
      if (!reason.whenToUse) pending.push("quando usar");
      if (!reason.defaultType) pending.push("tipo");
      if (!reason.defaultPriority) pending.push("SLA");
      if (!reason.slaOwner) pending.push("dono do SLA");
      reason.pendingFields = pending;
      reason.configPending = pending.length > 0;
      reason.isRestricted = isRestricted(reason);
      reasons.push(reason);
    }
  }

  const slaSheet = workbook.Sheets["Escala SLA"];
  if (slaSheet) {
    for (const row of rowsOf(slaSheet)) {
      const level = String(row[0] || "");
      const code = priorityCode(level);
      if (code && fold(level).includes("P")) {
        policies.push({
          code,
          label: level.trim(),
          whenText: row[1] ? String(row[1]) : null,
          firstResponseText: row[3] ? String(row[3]) : null,
          resolutionText: row[4] ? String(row[4]) : null,
          countingText: row[5] ? String(row[5]) : null,
          firstResponseMinutes: minutesFromText(row[3]),
          resolutionMinutes: minutesFromText(row[4]),
          useBusinessHours: true
        });
      }
      const impact = String(row[0] || "");
      if (fold(impact).startsWith("UMA PESSOA") || fold(impact).startsWith("UMA EQUIPE") || fold(impact).startsWith("CLIENTE")) {
        ["Planejada", "Prazo próximo", "Trabalho parado"].forEach((urgency, index) => {
          const priority = priorityCode(row[index + 1]);
          if (priority) matrix.push({ impact: impact.trim(), urgency, priority });
        });
      }
    }
  }

  const rulesSheet = workbook.Sheets["Regras de uso"];
  if (rulesSheet) {
    rowsOf(rulesSheet).forEach((row, index) => {
      if (row[1] && fold(row[0]) !== "TEMA" && fold(row[0]) !== "OBRIGATORIOS" && fold(row[0]) !== "CONTROLE" && fold(row[0]) !== "QUANDO APLICAVEL") {
        if (String(row[1]).length > 8) {
          rules.push({
            theme: row[0] ? String(row[0]) : null,
            ruleText: String(row[1]),
            reason: row[2] ? String(row[2]) : null,
            validationStatus: row[3] ? String(row[3]) : null,
            sourceSheet: "Regras de uso",
            sourceRow: index + 1
          });
        }
      }
    });
  }

  return { reasons, policies, matrix, rules, meta };
}

function minutesFromText(value) {
  const text = fold(value);
  if (!text) return null;
  const minutes = text.match(/(\d+)\s*MIN/);
  if (minutes) return Number(minutes[1]);
  const hours = text.match(/(\d+)\s*HORA/);
  if (hours) return Number(hours[1]) * 60;
  const days = text.match(/(\d+)\s*DIA/);
  if (days) return Number(days[1]) * 8 * 60;
  return null;
}

module.exports = { parseCatalog, minutesFromText };
