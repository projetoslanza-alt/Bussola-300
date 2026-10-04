const XLSX = require("xlsx");
const {
  fold, cleanName, matchKey, canonicalTeam, parseMonthYearFromTitle,
  cycleRange, parseExplicitRange, isoDate, toNumber
} = require("../text");

const METRIC_ORDER = ["ligacoes", "aberturas", "formularios", "onlines", "calls_agendadas", "calls_realizadas", "teste_vocacional", "vendas"];

function metricCode(label) {
  const text = fold(label);
  if (!text || text.includes(" PARA ")) return null;
  if (text.includes("LIGAC")) return "ligacoes";
  if (text.includes("ABERT")) return "aberturas";
  if (text.includes("FORMUL")) return "formularios";
  if (text === "ONLINES" || text.startsWith("ONLINES")) return "onlines";
  if (text.includes("CALL") && text.includes("AGEND")) return "calls_agendadas";
  if (text.includes("CALL") && text.includes("REALIZ")) return "calls_realizadas";
  if (text.includes("VOCAC")) return "teste_vocacional";
  if (text === "VENDAS" || text === "VENDA") return "vendas";
  return null;
}

function sheetRows(worksheet) {
  const ref = worksheet["!ref"];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const maxRow = Math.min(range.e.r, 160);
  const maxCol = Math.min(range.e.c, 36);
  const rows = [];
  for (let r = range.s.r; r <= maxRow; r += 1) {
    const row = [];
    for (let c = range.s.c; c <= maxCol; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[addr];
      if (!cell) {
        row.push(null);
        continue;
      }
      if (cell.t === "e") {
        row.push({ error: cell.w || String(cell.v || "#ERR"), row: r + 1, col: c + 1, addr });
        continue;
      }
      let value = cell.v;
      if (value instanceof Date) value = value.toISOString().slice(0, 10);
      row.push({ value, row: r + 1, col: c + 1, addr });
    }
    rows.push(row);
  }
  return rows;
}

function textOf(cell) {
  if (!cell || cell.error) return "";
  return cell.value == null ? "" : String(cell.value).trim();
}

function classify(title) {
  const folded = fold(title);
  if (/^\d{4}\s*[A]\s*\d{4}$/.test(folded.replace(/Á/g, "A"))) return "week";
  if (folded.includes("GERAL")) return "consolidated";
  if (folded.includes("RESULTADO") && folded.includes("ACUMUL")) return "accumulated";
  if (canonicalTeam(teamToken(title))) return "team";
  return "other";
}

function teamToken(title) {
  let text = fold(title)
    .replace(/\bADP\b/g, " ")
    .replace(/\bGERAL\b/g, " ")
    .replace(/\(\s*(SP|BH)\s*\)/g, " ")
    .replace(/\b(JAN(?:EIRO)?|FEV(?:EREIRO)?|MAR(?:CO)?|ABR(?:IL)?|MAI(?:O)?|JUN(?:HO)?|JUL(?:HO)?|AGO(?:STO)?|SET(?:EMBRO)?|OUT(?:UBRO)?|NOV(?:EMBRO)?|DEZ(?:EMBRO)?)\s*\d{2}\b/g, " ")
    .replace(/[^A-Z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return canonicalTeam(text) || canonicalTeam(text.replace(/\./g, ""));
}

function weekParts(title) {
  const folded = fold(title).replace(/Á/g, "A");
  const match = folded.match(/^(\d{2})(\d{2})\s*A\s*(\d{2})(\d{2})$/);
  if (!match) return null;
  return {
    startDay: Number(match[1]), startMonth: Number(match[2]),
    endDay: Number(match[3]), endMonth: Number(match[4])
  };
}

function headerMap(rows, start) {
  const map = {};
  for (const offset of [0, 1]) {
    const row = rows[start + offset] || [];
    row.forEach((cell, index) => {
      const code = metricCode(textOf(cell));
      if (code && map[code] == null) map[code] = index;
    });
  }
  return Object.keys(map).length >= 3 ? map : null;
}

function readMetric(cell, warnings, sheet) {
  if (!cell) return null;
  if (cell.error) {
    warnings.push({ level: "warning", sheet, cell: cell.addr, message: `Erro de fórmula ${cell.error} tratado como ausência de valor.` });
    return null;
  }
  const parsed = toNumber(cell.value);
  if (parsed.error) {
    warnings.push({ level: "warning", sheet, cell: cell.addr, message: `Erro de fórmula ${parsed.error} tratado como ausência de valor.` });
    return null;
  }
  return parsed.skip ? null : parsed.value;
}

function isPersonName(value) {
  const text = cleanName(value);
  const folded = fold(text);
  if (!text || text === "-" || folded.startsWith("TOTAL") || folded === "NOME") return false;
  if (["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO", "DOMINGO"].includes(folded)) return false;
  if (metricCode(text) || canonicalTeam(text)) return false;
  return /[A-ZÁÉÍÓÚÃÕÂÊÔ]/.test(text.toUpperCase());
}

function blankName(value) {
  const text = cleanName(value);
  return !text || text === "-";
}

function parseConsolidated(sheet, rows, warnings, filename) {
  const monthYear = parseMonthYearFromTitle(sheet) || { month: null, year: null };
  let range = null;
  const joined = rows.slice(0, 3).map((row) => row.map(textOf).join(" ")).join(" ");
  if (monthYear.year) range = parseExplicitRange(joined, monthYear.year);
  if (!range && monthYear.month && monthYear.year) range = cycleRange(monthYear.month, monthYear.year);
  const cycle = {
    name: monthYear.month && monthYear.year ? cycleLabel(monthYear) : sheet.trim(),
    month: monthYear.month,
    year: monthYear.year,
    startsOn: range?.startsOn || null,
    endsOn: range?.endsOn || null,
    source: filename
  };
  const facts = [];
  const templates = [];
  const parameters = [];
  let sectionTeam = null;
  let inTeam = false;
  for (let i = 0; i < rows.length; i += 1) {
    const map = headerMap(rows, i);
    if (!map) continue;
    const nameCell = textOf(rows[i][0]);
    if (fold(nameCell) !== "NOME" && !metricCode(textOf(rows[i][map.ligacoes])) && fold(textOf(rows[i + 1]?.[0])) !== "") {
      /* header may sit on the slogan row */
    }
    for (let r = i + 1; r < rows.length; r += 1) {
      if (headerMap(rows, r) && r > i + 1) break;
      const row = rows[r];
      const rawName = textOf(row[0]);
      const teamName = canonicalTeam(rawName);
      const metricSample = map.ligacoes != null ? textOf(row[map.ligacoes]) : "";
      if (teamName && !metricSample) {
        sectionTeam = teamName;
        inTeam = true;
        continue;
      }
      if (blankName(rawName)) continue;
      const folded = fold(rawName);
      if (folded.startsWith("TOTAL")) {
        const grain = folded === "TOTAL" ? "consolidado_total" : "consolidado_equipe_total";
        pushMetrics(facts, row, map, {
          cycleName: cycle.name, person: null, team: grain === "consolidado_total" ? null : sectionTeam,
          grain, period: cycle.startsOn, sheet, warnings, filename
        });
        if (folded === "TOTAL") inTeam = false;
        continue;
      }
      if (!isPersonName(rawName)) continue;
      pushMetrics(facts, row, map, {
        cycleName: cycle.name,
        person: cleanName(rawName),
        team: inTeam ? sectionTeam : null,
        grain: inTeam ? "consolidado_equipe" : "consolidado",
        period: cycle.startsOn,
        sheet, warnings, filename
      });
    }
  }
  collectTemplates(rows, templates, parameters, cycle.name, sheet);
  return { cycle, facts, templates, parameters, teams: [...new Set(facts.map((item) => item.team).filter(Boolean))] };
}

function pushMetrics(facts, row, map, meta) {
  for (const code of METRIC_ORDER) {
    const index = map[code];
    if (index == null) continue;
    const cell = row[index];
    const value = readMetric(cell, meta.warnings, meta.sheet);
    if (value == null && !(cell && cell.error)) {
      if (!cell || textOf(cell) === "") continue;
    }
    facts.push({
      cycleName: meta.cycleName,
      person: meta.person,
      team: meta.team,
      metric: code,
      grain: meta.grain,
      period: meta.period,
      value,
      sourceFile: meta.filename,
      sourceSheet: meta.sheet,
      sourceRow: cell?.row || row[0]?.row || null,
      sourceCell: cell?.addr || null
    });
  }
}

function collectTemplates(rows, templates, parameters, cycleName, sheet) {
  rows.forEach((row) => {
    row.forEach((cell, index) => {
      const label = fold(textOf(cell));
      if (label === "01 VENDA" || label === "1 VENDA" || label === "02 VENDAS" || label === "2 VENDAS") {
        const scope = label.startsWith("02") || label.startsWith("2") ? "referencia_2_vendas" : "referencia_1_venda";
        for (let r = rows.indexOf(row) + 1; r < Math.min(rows.length, rows.indexOf(row) + 6); r += 1) {
          const name = fold(textOf(rows[r][index]));
          const valueCell = rows[r][index + 2] || rows[r][index + 1];
          const parsed = valueCell ? toNumber(valueCell.error ? valueCell.error : valueCell.value) : { value: null };
          const goalType = name.includes("ABERT") ? "aberturas"
            : name.includes("FORM") ? "formularios"
            : name.includes("ONLINE") || name.includes("AGEND") ? "onlines_agendadas"
            : name.includes("REALIZ") ? "calls_realizadas"
            : null;
          if (!goalType || parsed.value == null) continue;
          templates.push({ cycleName, goalType, target: parsed.value, scope, sourceSheet: sheet, sourceCell: valueCell.addr });
        }
      }
      if (label.includes("CONVERSAO DE LEADS") || label.includes("CONV. DE OPORTUN") || label.includes("CONVERSAO DE ONLINE") || label.includes("CONVERSAO DE CALL")) {
        const next = row[index + 1];
        const parsed = next ? toNumber(next.error ? next.error : next.value) : { value: null };
        if (parsed.value != null && parsed.value > 0 && parsed.value < 1) {
          parameters.push({
            cycleName, kind: "projecao", label: textOf(cell), value: parsed.value,
            code: label.includes("LEAD") ? "conversao_leads"
              : label.includes("OPORT") ? "conversao_oportunidades"
              : label.includes("ONLINE") ? "conversao_onlines"
              : "conversao_calls",
            sourceSheet: sheet
          });
        }
      }
      if (label.includes("ABERTURA PARA FORMULARIO") || label.includes("FORMULARIO PARA ONLINE") || label.includes("ONLINE PARA CALL") || label.includes("CALL AGENDADA PARA REALIZADA")) {
        const next = row[index + 1];
        const parsed = next ? toNumber(next.error ? next.error : next.value) : { value: null };
        if (parsed.value != null) {
          parameters.push({
            cycleName, kind: "referencia_minima", label: textOf(cell), value: parsed.value,
            code: label.includes("ABERTURA PARA") ? "abertura_formulario"
              : label.includes("FORMULARIO PARA") ? "formulario_online"
              : label.includes("ONLINE PARA") ? "online_call_agendada"
              : "call_agendada_realizada",
            sourceSheet: sheet
          });
        }
      }
    });
  });
}

function parseTeamSheet(sheet, rows, warnings, filename) {
  const team = teamToken(sheet);
  const monthYear = parseMonthYearFromTitle(sheet);
  const joined = rows.slice(0, 2).map((row) => row.map(textOf).join(" ")).join(" ");
  const explicit = monthYear ? parseExplicitRange(joined, monthYear.year) : null;
  const range = explicit || (monthYear ? cycleRange(monthYear.month, monthYear.year) : null);
  const cycle = {
    name: monthYear ? cycleLabel(monthYear) : sheet.trim(),
    month: monthYear?.month || null,
    year: monthYear?.year || null,
    startsOn: range?.startsOn || null,
    endsOn: range?.endsOn || null,
    source: filename,
    team
  };
  const goals = [];
  const funnel = [];
  const parameters = [];
  const people = [];
  const anchors = [];
  const first = rows[0] || [];
  first.forEach((cell, index) => {
    if (!isPersonName(textOf(cell))) return;
    const nearby = [1, 2, 3, 4].some((offset) => fold(textOf(rows[offset]?.[index])).includes("META"));
    if (nearby) anchors.push(index);
  });
  if (!anchors.length) {
    rows.forEach((row) => row.forEach((cell, index) => {
      if (fold(textOf(cell)).includes("META FATURAMENTO") && isPersonName(textOf(rows[rows.indexOf(row) - 1]?.[index]))) {
        anchors.push(index);
      }
    }));
  }
  for (const col of anchors) {
    const person = cleanName(textOf(rows[0][col]));
    if (!person) continue;
    people.push(person);
    for (let r = 1; r < Math.min(rows.length, 8); r += 1) {
      const label = fold(textOf(rows[r][col]));
      const goalType = label.includes("FATURAMENTO") ? "faturamento" : label.includes("META VENDA") ? "venda" : null;
      if (!goalType) continue;
      const target = readMetric(rows[r][col + 1], warnings, sheet);
      const actual = readMetric(rows[r][col + 2], warnings, sheet);
      goals.push({
        cycleName: cycle.name, person, team, goalType, target, actual, scope: "individual",
        sourceSheet: sheet, sourceCell: rows[r][col + 1]?.addr || rows[r][col]?.addr || null
      });
    }
    for (let r = 5; r < Math.min(rows.length, 24); r += 1) {
      const stage = textOf(rows[r][col]);
      const folded = fold(stage);
      if (!stage || folded.startsWith("CONVERSAO") || folded.includes("FORMULARIOS") || folded === "VENDAS") {
        if (folded.startsWith("CONVERSAO") || folded === "VENDAS") continue;
        if (!stage) continue;
      }
      if (folded.includes("TOTAL DO MES")) continue;
      const percent = readMetric(rows[r][col + 1], warnings, sheet);
      const quantity = readMetric(rows[r][col + 2], warnings, sheet);
      if (percent == null && quantity == null) continue;
      if (folded.includes("PARA ")) continue;
      funnel.push({
        cycleName: cycle.name, person, team, stage: stage.trim(), quantity, percent,
        sourceSheet: sheet, sourceRow: rows[r][col]?.row || r + 1, sourceCell: rows[r][col]?.addr || null
      });
    }
  }
  collectTemplates(rows, [], parameters, cycle.name, sheet);
  return { cycle, goals, funnel, parameters, people, team, warnings };
}

function parseWeek(sheet, rows, warnings, filename, cycles) {
  const parts = weekParts(sheet);
  const facts = [];
  const dayNames = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO", "DOMINGO"];
  for (let i = 0; i < rows.length; i += 1) {
    const map = headerMap(rows, i);
    if (!map) continue;
    let period = null;
    for (let r = i + 1; r < rows.length; r += 1) {
      if (headerMap(rows, r) && r > i + 1) break;
      const row = rows[r];
      const rawName = textOf(row[0]);
      const dateCell = row.find((cell) => cell && !cell.error && /^\d{4}-\d{2}-\d{2}/.test(String(cell.value)));
      if (dateCell) period = String(dateCell.value).slice(0, 10);
      if (fold(rawName).startsWith("TOTAL")) {
        pushMetrics(facts, row, map, {
          cycleName: null, person: null, team: null, grain: "diario_total", period, sheet, warnings, filename
        });
        continue;
      }
      if (!isPersonName(rawName)) continue;
      pushMetrics(facts, row, map, {
        cycleName: null, person: cleanName(rawName), team: null, grain: "diario", period, sheet, warnings, filename
      });
    }
  }
  const sample = facts.find((item) => item.period)?.period;
  let year = sample ? Number(sample.slice(0, 4)) : null;
  if (!year && parts) {
    const candidates = [2025, 2026, 2027];
    year = candidates.find((item) => cycles.some((cycle) => {
      if (!cycle.startsOn || !cycle.endsOn) return false;
      const probe = isoDate(item, parts.startMonth, parts.startDay);
      return probe >= cycle.startsOn && probe <= cycle.endsOn;
    })) || 2026;
  }
  const startsOn = parts && year ? isoDate(year, parts.startMonth, parts.startDay) : sample;
  let endsYear = year;
  if (parts && parts.endMonth < parts.startMonth) endsYear = year + 1;
  const endsOn = parts && year ? isoDate(endsYear, parts.endMonth, parts.endDay) : startsOn;
  const cycle = cycles.find((item) => startsOn && item.startsOn && startsOn >= item.startsOn && startsOn <= item.endsOn);
  facts.forEach((fact) => {
    fact.cycleName = cycle?.name || null;
    fact.weekSheet = sheet;
    if (!fact.period && startsOn) fact.period = startsOn;
  });
  return { sheet, startsOn, endsOn, cycleName: cycle?.name || null, facts: facts.filter((item) => item.cycleName) };
}

function parseWorkbook(buffer, filename) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellFormula: true });
  const warnings = [];
  const cycles = [];
  const facts = [];
  const goals = [];
  const funnel = [];
  const parameters = [];
  const teams = new Set();
  const people = new Set();
  const sheets = [];
  const weekSheets = [];

  for (const name of workbook.SheetNames) {
    const rows = sheetRows(workbook.Sheets[name]);
    const kind = classify(name);
    sheets.push({ name, kind, rows: rows.length });
    if (kind === "week") {
      weekSheets.push({ name, rows });
      continue;
    }
    if (kind === "consolidated" || kind === "accumulated") {
      const parsed = parseConsolidated(name, rows, warnings, filename);
      if (parsed.cycle.month) cycles.push(parsed.cycle);
      facts.push(...parsed.facts);
      goals.push(...parsed.templates.map((item) => ({ ...item, person: null, team: null, actual: null })));
      parameters.push(...parsed.parameters);
      parsed.teams.forEach((team) => teams.add(team));
      parsed.facts.forEach((fact) => { if (fact.person) people.add(fact.person); });
      continue;
    }
    if (kind === "team") {
      const parsed = parseTeamSheet(name, rows, warnings, filename);
      if (parsed.cycle.month) cycles.push(parsed.cycle);
      if (parsed.team) teams.add(parsed.team);
      parsed.people.forEach((person) => people.add(person));
      goals.push(...parsed.goals);
      funnel.push(...parsed.funnel);
      parameters.push(...parsed.parameters);
      continue;
    }
    const hasHeader = rows.some((_, index) => headerMap(rows, index));
    if (hasHeader) warnings.push({ level: "warning", sheet: name, cell: null, message: "Aba com cabeçalho de métricas não classificada automaticamente." });
  }

  const uniqueCycles = dedupeCycles(cycles);
  for (const week of weekSheets) {
    const parsed = parseWeek(week.name, week.rows, warnings, filename, uniqueCycles);
    facts.push(...parsed.facts);
    parsed.facts.forEach((fact) => { if (fact.person) people.add(fact.person); });
    if (!parsed.facts.length) warnings.push({ level: "warning", sheet: week.name, cell: null, message: "Semana sem ciclo correspondente para vincular o histórico." });
  }

  return {
    filename,
    sheets,
    cycles: uniqueCycles,
    facts,
    goals,
    funnel,
    parameters: dedupeParameters(parameters),
    teams: [...teams],
    people: [...people],
    warnings
  };
}

function dedupeCycles(cycles) {
  const map = new Map();
  for (const cycle of cycles) {
    const key = `${cycle.year}-${cycle.month}`;
    const current = map.get(key);
    if (!current) {
      map.set(key, { ...cycle, name: cycleLabel(cycle) });
      continue;
    }
    if (!current.startsOn && cycle.startsOn) current.startsOn = cycle.startsOn;
    if (!current.endsOn && cycle.endsOn) current.endsOn = cycle.endsOn;
  }
  return [...map.values()].sort((a, b) => String(a.startsOn).localeCompare(String(b.startsOn)));
}

function cycleLabel(cycle) {
  const months = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${months[cycle.month] || "Ciclo"} ${cycle.year}`;
}

function dedupeParameters(items) {
  const map = new Map();
  for (const item of items) {
    const key = `${item.cycleName}|${item.kind}|${item.code}`;
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}

function consolidatedTotals(parsed, year = 2026, month = 10) {
  const cycle = parsed.cycles.find((item) => item.year === year && item.month === month);
  if (!cycle) return null;
  const totals = {};
  for (const fact of parsed.facts) {
    if (fact.cycleName !== cycle.name || fact.grain !== "consolidado_total") continue;
    totals[fact.metric] = fact.value;
  }
  return { cycle, totals };
}

module.exports = { parseWorkbook, consolidatedTotals, classify, metricCode, METRIC_ORDER };
