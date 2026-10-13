const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { matchKey, cleanName } = require("../src/text");
const { excelSerialToIso, parseAmount } = require("../src/excelValue");
const { buildPlan, applyPlanInMemory } = require("../src/realdata/parse");

const root = path.join(__dirname, "..");

function buffer(name) {
  return fs.readFileSync(path.join(root, name));
}

test("normalização ignora NBSP, espaços e acentos", () => {
  const official = "MARIA DA SILVA";
  const variants = [
    "MARIA  DA SILVA",
    " Maria da Silva ",
    "MARIA DA SILVA",
    "Maria da Silva",
    "MARIA\u00a0DA\u00a0SILVA",
    "MARIA\u200b DA SILVA",
    "maría da silva"
  ];
  const key = matchKey(official);
  for (const variant of variants) assert.equal(matchKey(variant), key);
  assert.equal(cleanName("  MARIA\u00a0  DA   SILVA\u200b "), "MARIA DA SILVA");
});

test("data serial do Excel e ausência não viram zero", () => {
  assert.equal(excelSerialToIso(46023), "2026-01-01");
  assert.equal(excelSerialToIso(46054), "2026-02-01");
  assert.equal(excelSerialToIso("-"), null);
  assert.equal(excelSerialToIso("N/A"), null);
  assert.equal(parseAmount("-"), null);
  assert.equal(parseAmount("#N/A"), null);
  assert.equal(parseAmount("#ERROR!"), null);
  assert.equal(parseAmount(0), 0);
  assert.equal(parseAmount("1.234,56"), 1234.56);
});

test("ROI, equipe e vendas conciliam sem criar pessoa fora da base", () => {
  const plan = buildPlan({
    roi: buffer("ROI_Scale300-1.xlsx"),
    team: buffer("Equipe Comercial Atualizada.xlsx"),
    sales: buffer("Controle de Vendas - Diario 2026.xlsx")
  });
  assert.equal(plan.roi.people.length, 28);
  assert.equal(plan.roi.monthly.length, 144);
  assert.deepEqual(plan.roi.months, ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01"]);
  assert.equal(plan.salesMonthly.length, 144);
  assert.equal(plan.transactions.length, 83);
  assert.equal(plan.salesMonthly.every((row) => row.reconciliationStatus === "matched"), true);
  assert.equal(plan.transactions.every((row) => row.reconciliationStatus === "matched"), true);
  const pending = plan.issues.filter((issue) => issue.kind === "equipe_sem_roi").map((issue) => issue.rawName).sort();
  assert.deepEqual(pending, ["BARBARA STEFANY DOS SANTOS MOREIRA", "DAIANE DA SILVA MOREIRA"]);
  const dashed = plan.transactions.filter((row) => row.signalValue == null && row.signalDate == null);
  assert.ok(dashed.length > 0);
  assert.equal(plan.transactions.some((row) => row.revenue === 0 && row.signalValue == null), false);
  const again = buildPlan({
    roi: buffer("ROI_Scale300-1.xlsx"),
    team: buffer("Equipe Comercial Atualizada.xlsx"),
    sales: buffer("Controle de Vendas - Diario 2026.xlsx")
  });
  assert.deepEqual(applyPlanInMemory(plan), applyPlanInMemory(again));
  assert.deepEqual(plan.transactions.map((row) => row.naturalKey), again.transactions.map((row) => row.naturalKey));
  const combined = applyPlanInMemory(plan);
  const replay = { ...combined };
  assert.equal(replay.people, 28);
  assert.equal(replay.roi, 144);
  assert.equal(replay.sales, 144);
  assert.equal(replay.transactions, 83);
});

test("venda e equipe sem correspondente no ROI não criam colaborador", () => {
  const XLSX = require("xlsx");
  function sheet(rows) {
    return XLSX.utils.aoa_to_sheet(rows);
  }
  const roiBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(roiBook, sheet([
    ["Colaborador", "Cargo", "Data de Admissão", "Gerente", "Mês", "Receita Bruta (R$)", "Comissão (R$)", "Premiação (R$)", "Salário fixo(R$)+Ajuda de Custo+outros", "Rateio MKT (R$)", "Infraestrutura p/ pessoa (R$)", "Total Investido (R$)", "Lucro Bruto Gerado", "ROI", "% ROI", "", "Tempo de Casa", "Nº de Marcas", "Classificação", "", "Resultado"],
    ["ANA REAL", "VENDEDOR", 45789, "GESTOR REAL", 46023, 10, 1, 0, 5, 0, 2, 8, 2, 0.25, 0.25, "", "1 mês", 1, "Em desenvolvimento", "", 2]
  ]), "ROI Mensal - C");
  XLSX.utils.book_append_sheet(roiBook, sheet([["vazio"]]), "ROI por Colaborador");
  const teamBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(teamBook, sheet([
    ["COLABORADORES", "CARGO", "GESTOR"],
    ["ANA REAL", "VENDEDOR DE FRANQUIA", "GESTOR REAL"],
    ["PESSOA FORA DO ROI", "VENDEDOR", "ANA REAL"]
  ]), "Planilha1");
  const salesBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(salesBook, sheet([
    ["Colaborador", "Cargo", "Mês", "Total", "4Beach"],
    ["ANA REAL", "VENDEDOR", 46023, 10, 10],
    ["PESSOA  FORA DO ROI", "VENDEDOR", 46023, 5, "-"]
  ]), "Planilha1");
  XLSX.utils.book_append_sheet(salesBook, sheet([
    ["COOPERADO", "MÊS", "RECEITA", "FRANQUIA", "FRANQUEADO", "VALOR DO SINAL", "DATA DO SINAL", "VALOR DA FINALIZAÇÃO", "DATA DA FINALIZAÇÃO"],
    ["PESSOA FORA DO ROI", 46023, 5, "TE LEVO", "CLIENTE", "-", "-", 5, 46036]
  ]), "Planilha2");
  const plan = buildPlan({
    roi: XLSX.write(roiBook, { type: "buffer", bookType: "xlsx" }),
    team: XLSX.write(teamBook, { type: "buffer", bookType: "xlsx" }),
    sales: XLSX.write(salesBook, { type: "buffer", bookType: "xlsx" })
  });
  assert.deepEqual(plan.roi.people.map((person) => person.displayName), ["ANA REAL"]);
  assert.equal(plan.teamMatched.length, 1);
  assert.equal(plan.teamMatched[0].role, "VENDEDOR DE FRANQUIA");
  assert.deepEqual(plan.issues.filter((issue) => issue.kind === "equipe_sem_roi").map((issue) => issue.rawName), ["PESSOA FORA DO ROI"]);
  const unmatchedSales = plan.issues.filter((issue) => issue.kind === "venda_sem_roi");
  assert.equal(unmatchedSales.length, 2);
  assert.equal(plan.salesMonthly.find((row) => row.displayName === "PESSOA FORA DO ROI").reconciliationStatus, "unmatched");
  const detail = plan.transactions[0];
  assert.equal(detail.signalValue, null);
  assert.equal(detail.signalDate, null);
  assert.equal(detail.closingDate, "2026-01-14");
  assert.equal(detail.revenue, 5);
});
