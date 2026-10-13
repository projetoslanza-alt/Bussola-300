const crypto = require("crypto");
const XLSX = require("xlsx");
const { fold, cleanName, matchKey } = require("../text");
const { excelSerialToIso, parseAmount } = require("../excelValue");

function sheetRows(workbook, name) {
  const sheet = workbook.Sheets[name];
  if (!sheet) return null;
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
}

function findHeader(rows, firstCell) {
  const expected = fold(firstCell);
  return rows.findIndex((row) => fold(row?.[0]) === expected);
}

function textCell(value) {
  if (value == null) return null;
  const text = cleanName(value);
  return text || null;
}

function isTotal(name) {
  return fold(name).startsWith("TOTAL");
}

function column(headers, ...needles) {
  const folded = headers.map((cell) => fold(cell));
  for (const needle of needles) {
    const target = fold(needle);
    const exact = folded.findIndex((cell) => cell === target);
    if (exact >= 0) return exact;
  }
  for (const needle of needles) {
    const target = fold(needle);
    const partial = folded.findIndex((cell) => cell && (cell.startsWith(target) || cell.includes(target)));
    if (partial >= 0) return partial;
  }
  return -1;
}

function readWorkbook(buffer) {
  return XLSX.read(buffer, { type: "buffer", cellDates: false });
}

function parseRoi(buffer) {
  const workbook = readWorkbook(buffer);
  const monthlySheet = "ROI Mensal - C";
  const totalSheet = "ROI por Colaborador";
  const monthlyRows = sheetRows(workbook, monthlySheet);
  const totalRows = sheetRows(workbook, totalSheet);
  if (!monthlyRows) throw new Error(`Aba obrigatória ausente: ${monthlySheet}`);
  const headerIndex = findHeader(monthlyRows, "Colaborador");
  if (headerIndex < 0) throw new Error("Cabeçalho de colaboradores não encontrado em ROI Mensal - C.");
  const headers = monthlyRows[headerIndex];
  const cols = {
    name: column(headers, "Colaborador"),
    role: column(headers, "Cargo"),
    admission: column(headers, "Data de Admissão"),
    manager: column(headers, "Gerente"),
    month: column(headers, "Mês"),
    revenue: column(headers, "Receita Bruta"),
    commission: column(headers, "Comissão"),
    bonus: column(headers, "Premiação"),
    fixed: column(headers, "Salário fixo"),
    marketing: column(headers, "Rateio MKT"),
    infrastructure: column(headers, "Infraestrutura"),
    invested: column(headers, "Total Investido"),
    profit: column(headers, "Lucro Bruto"),
    roi: column(headers, "ROI"),
    roiPercent: column(headers, "% ROI"),
    tenure: column(headers, "Tempo de Casa"),
    brands: column(headers, "Marcas"),
    classification: column(headers, "Classificação"),
    result: column(headers, "Resultado")
  };
  if (cols.name < 0 || cols.month < 0) throw new Error("Colunas Colaborador e Mês são obrigatórias no ROI mensal.");
  const roiColumn = headers.findIndex((cell, index) => fold(cell) === "ROI" && index !== cols.roiPercent);

  const people = new Map();
  const monthly = [];
  let ignored = 0;
  for (let index = headerIndex + 1; index < monthlyRows.length; index += 1) {
    const row = monthlyRows[index] || [];
    const rawName = row[cols.name];
    if (rawName == null || String(rawName).trim() === "") {
      ignored += 1;
      continue;
    }
    if (isTotal(rawName)) {
      ignored += 1;
      continue;
    }
    const displayName = textCell(rawName);
    const key = matchKey(rawName);
    const period = excelSerialToIso(row[cols.month]);
    if (!period) {
      ignored += 1;
      continue;
    }
    const record = {
      key,
      displayName,
      rawName: String(rawName),
      role: textCell(row[cols.role]),
      admissionDate: cols.admission >= 0 ? excelSerialToIso(row[cols.admission]) : null,
      managerName: textCell(row[cols.manager]),
      period,
      grossRevenue: parseAmount(row[cols.revenue]),
      commission: parseAmount(row[cols.commission]),
      bonus: parseAmount(row[cols.bonus]),
      fixedCost: parseAmount(row[cols.fixed]),
      marketingAllocation: parseAmount(row[cols.marketing]),
      infrastructure: parseAmount(row[cols.infrastructure]),
      totalInvested: parseAmount(row[cols.invested]),
      grossProfit: parseAmount(row[cols.profit]),
      roi: parseAmount(row[roiColumn >= 0 ? roiColumn : cols.roi]),
      roiPercent: cols.roiPercent >= 0 ? parseAmount(row[cols.roiPercent]) : null,
      tenureText: cols.tenure >= 0 && row[cols.tenure] != null ? textCell(row[cols.tenure]) || String(row[cols.tenure]).trim() : null,
      brandCount: cols.brands >= 0 ? parseAmount(row[cols.brands]) : null,
      classification: cols.classification >= 0 ? textCell(row[cols.classification]) : null,
      resultAmount: cols.result >= 0 ? parseAmount(row[cols.result]) : null,
      sourceSheet: monthlySheet,
      sourceRow: index + 1
    };
    monthly.push(record);
    const current = people.get(key);
    if (!current || record.period > current.latest.period) {
      people.set(key, { key, displayName, latest: record });
    }
  }
  if (!people.size) throw new Error("Nenhum colaborador encontrado na aba ROI Mensal - C.");

  const totals = [];
  if (totalRows) {
    const totalHeader = findHeader(totalRows, "Colaborador");
    if (totalHeader >= 0) {
      const totalHeaders = totalRows[totalHeader];
      const map = {
        name: 0,
        role: column(totalHeaders, "Cargo"),
        manager: column(totalHeaders, "Gerente"),
        revenue: column(totalHeaders, "Receita Bruta"),
        commission: column(totalHeaders, "Comissão"),
        bonus: column(totalHeaders, "Premiação"),
        fixed: column(totalHeaders, "Salário fixo"),
        marketing: column(totalHeaders, "Rateio MKT"),
        infrastructure: column(totalHeaders, "Infraestrutura"),
        invested: column(totalHeaders, "Total Investido"),
        roi: totalHeaders.findIndex((cell) => fold(cell) === "ROI"),
        tenure: column(totalHeaders, "Tempo de Casa"),
        brands: column(totalHeaders, "Marcas"),
        result: column(totalHeaders, "Resultado")
      };
      for (let index = totalHeader + 1; index < totalRows.length; index += 1) {
        const row = totalRows[index] || [];
        if (row[0] == null || String(row[0]).trim() === "" || isTotal(row[0])) continue;
        const key = matchKey(row[0]);
        if (!people.has(key)) continue;
        totals.push({
          key,
          role: textCell(row[map.role]),
          managerName: textCell(row[map.manager]),
          grossRevenue: parseAmount(row[map.revenue]),
          commission: parseAmount(row[map.commission]),
          bonus: parseAmount(row[map.bonus]),
          fixedCost: parseAmount(row[map.fixed]),
          marketingAllocation: parseAmount(row[map.marketing]),
          infrastructure: parseAmount(row[map.infrastructure]),
          totalInvested: parseAmount(row[map.invested]),
          roi: map.roi >= 0 ? parseAmount(row[map.roi]) : null,
          tenureText: map.tenure >= 0 && row[map.tenure] != null ? String(row[map.tenure]).trim() : null,
          brandCount: map.brands >= 0 ? parseAmount(row[map.brands]) : null,
          resultAmount: map.result >= 0 ? parseAmount(row[map.result]) : null,
          sourceSheet: totalSheet,
          sourceRow: index + 1
        });
      }
    }
  }

  return {
    people: [...people.values()],
    monthly,
    totals,
    ignored,
    months: [...new Set(monthly.map((row) => row.period))].sort()
  };
}

function parseTeam(buffer) {
  const workbook = readWorkbook(buffer);
  const name = workbook.SheetNames[0];
  const rows = sheetRows(workbook, name);
  const headerIndex = findHeader(rows, "COLABORADORES");
  if (headerIndex < 0) throw new Error("Cabeçalho COLABORADORES não encontrado na Equipe Comercial.");
  const headers = rows[headerIndex];
  const cols = {
    name: column(headers, "COLABORADORES", "Colaborador"),
    role: column(headers, "CARGO", "Cargo"),
    manager: column(headers, "GESTOR", "Gerente")
  };
  const records = [];
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] || [];
    if (row[cols.name] == null || String(row[cols.name]).trim() === "") continue;
    records.push({
      key: matchKey(row[cols.name]),
      displayName: textCell(row[cols.name]),
      rawName: String(row[cols.name]),
      role: textCell(row[cols.role]),
      managerName: textCell(row[cols.manager]),
      managerKey: row[cols.manager] ? matchKey(row[cols.manager]) : null,
      sourceSheet: name,
      sourceRow: index + 1
    });
  }
  return records;
}

function parseSales(buffer) {
  const workbook = readWorkbook(buffer);
  const monthlyName = workbook.SheetNames.find((item) => item === "Planilha1") || workbook.SheetNames[0];
  const detailName = workbook.SheetNames.find((item) => item === "Planilha2") || workbook.SheetNames[1];
  const monthlyRows = sheetRows(workbook, monthlyName);
  const headerIndex = findHeader(monthlyRows, "Colaborador");
  if (headerIndex < 0) throw new Error("Cabeçalho de vendas mensais não encontrado.");
  const headers = monthlyRows[headerIndex];
  const nameCol = column(headers, "Colaborador");
  const roleCol = column(headers, "Cargo");
  const monthCol = column(headers, "Mês");
  const totalCol = column(headers, "Total");
  const brands = [];
  for (let index = totalCol + 1; index < headers.length; index += 1) {
    if (headers[index] == null || String(headers[index]).trim() === "") continue;
    brands.push({ index, name: String(headers[index]).trim() });
  }
  const monthly = [];
  for (let index = headerIndex + 1; index < monthlyRows.length; index += 1) {
    const row = monthlyRows[index] || [];
    if (row[nameCol] == null || String(row[nameCol]).trim() === "" || isTotal(row[nameCol])) continue;
    const period = excelSerialToIso(row[monthCol]);
    if (!period) continue;
    monthly.push({
      key: matchKey(row[nameCol]),
      displayName: textCell(row[nameCol]),
      rawName: String(row[nameCol]),
      role: textCell(row[roleCol]),
      period,
      totalAmount: parseAmount(row[totalCol]),
      brands: brands.map((brand) => ({ brand: brand.name, amount: parseAmount(row[brand.index]) })),
      sourceSheet: monthlyName,
      sourceRow: index + 1
    });
  }

  const transactions = [];
  const seen = new Map();
  if (detailName) {
    const detailRows = sheetRows(workbook, detailName);
    const detailHeader = findHeader(detailRows, "COOPERADO");
    if (detailHeader >= 0) {
      const detailHeaders = detailRows[detailHeader];
      const cols = {
        name: column(detailHeaders, "COOPERADO"),
        month: column(detailHeaders, "MÊS"),
        revenue: column(detailHeaders, "RECEITA"),
        franchise: column(detailHeaders, "FRANQUIA"),
        franchisee: column(detailHeaders, "FRANQUEADO"),
        signalValue: column(detailHeaders, "VALOR DO SINAL"),
        signalDate: column(detailHeaders, "DATA DO SINAL"),
        closingValue: column(detailHeaders, "VALOR DA FINALIZAÇÃO"),
        closingDate: column(detailHeaders, "DATA DA FINALIZAÇÃO")
      };
      for (let index = detailHeader + 1; index < detailRows.length; index += 1) {
        const row = detailRows[index] || [];
        if (row[cols.name] == null || String(row[cols.name]).trim() === "") continue;
        const item = {
          key: matchKey(row[cols.name]),
          displayName: textCell(row[cols.name]),
          rawName: String(row[cols.name]),
          period: excelSerialToIso(row[cols.month]),
          revenue: parseAmount(row[cols.revenue]),
          franchise: textCell(row[cols.franchise]),
          franchisee: textCell(row[cols.franchisee]),
          signalValue: parseAmount(row[cols.signalValue]),
          signalDate: excelSerialToIso(row[cols.signalDate]),
          closingValue: parseAmount(row[cols.closingValue]),
          closingDate: excelSerialToIso(row[cols.closingDate]),
          sourceSheet: detailName,
          sourceRow: index + 1
        };
        const base = [item.key, item.period || "", item.franchise || "", item.franchisee || "", item.revenue ?? "", item.signalValue ?? "", item.signalDate || "", item.closingValue ?? "", item.closingDate || ""].join("|");
        const ordinal = (seen.get(base) || 0) + 1;
        seen.set(base, ordinal);
        item.naturalKey = crypto.createHash("sha256").update(`${base}|${ordinal}`).digest("hex");
        transactions.push(item);
      }
    }
  }
  return { monthly, transactions, months: [...new Set(monthly.map((row) => row.period))].sort() };
}

function buildPlan(buffers) {
  const roi = parseRoi(buffers.roi);
  const team = parseTeam(buffers.team);
  const sales = parseSales(buffers.sales);
  const master = new Map(roi.people.map((person) => [person.key, person]));
  const issues = [];

  const teamMatched = [];
  for (const row of team) {
    if (!master.has(row.key)) {
      issues.push({
        kind: "equipe_sem_roi",
        source: "equipe",
        sheet: row.sourceSheet,
        sourceRow: row.sourceRow,
        rawName: row.displayName,
        message: `Equipe Comercial sem correspondente no ROI: ${row.displayName}`
      });
      continue;
    }
    if (row.managerKey && !master.has(row.managerKey)) {
      issues.push({
        kind: "gestor_atual_sem_roi",
        source: "equipe",
        sheet: row.sourceSheet,
        sourceRow: row.sourceRow,
        rawName: row.managerName,
        message: `Gestor atual informado na Equipe Comercial não está na base ROI: ${row.managerName}`
      });
    }
    teamMatched.push(row);
  }

  const salesMonthly = sales.monthly.map((row) => {
    const matched = master.has(row.key);
    if (!matched) {
      issues.push({
        kind: "venda_sem_roi",
        source: "vendas",
        sheet: row.sourceSheet,
        sourceRow: row.sourceRow,
        rawName: row.displayName,
        period: row.period,
        message: `Venda com colaborador não conciliado ao ROI: ${row.displayName}`
      });
    }
    return { ...row, reconciliationStatus: matched ? "matched" : "unmatched" };
  });
  const transactions = sales.transactions.map((row) => {
    const matched = master.has(row.key);
    if (!matched) {
      issues.push({
        kind: "venda_sem_roi",
        source: "vendas",
        sheet: row.sourceSheet,
        sourceRow: row.sourceRow,
        rawName: row.displayName,
        period: row.period,
        message: `Venda com colaborador não conciliado ao ROI: ${row.displayName}`
      });
    }
    return { ...row, reconciliationStatus: matched ? "matched" : "unmatched" };
  });

  return { roi, team, teamMatched, salesMonthly, transactions, issues, salesMonths: sales.months };
}

function applyPlanInMemory(plan) {
  const people = new Map();
  const roi = new Map();
  const totals = new Map();
  const sales = new Map();
  const transactions = new Map();
  for (const person of plan.roi.people) people.set(person.key, person.displayName);
  for (const row of plan.roi.monthly) roi.set(`${row.key}|${row.period}`, row);
  for (const row of plan.roi.totals) totals.set(row.key, row);
  for (const row of plan.salesMonthly) sales.set(`${row.key}|${row.period}`, row);
  for (const row of plan.transactions) transactions.set(row.naturalKey, row);
  return {
    people: people.size,
    roi: roi.size,
    totals: totals.size,
    sales: sales.size,
    transactions: transactions.size,
    teamMatched: plan.teamMatched.length,
    teamPending: plan.issues.filter((issue) => issue.kind === "equipe_sem_roi").length,
    salesPending: plan.issues.filter((issue) => issue.kind === "venda_sem_roi").length
  };
}

module.exports = { parseRoi, parseTeam, parseSales, buildPlan, applyPlanInMemory };
