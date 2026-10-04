const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { parseWorkbook, consolidatedTotals } = require("../src/adp/parse");

const file = path.join(__dirname, "..", "ADP BH SCALE_2026.xlsx");

test("consolidado OUT26 bate com a planilha", () => {
  const parsed = parseWorkbook(fs.readFileSync(file), "ADP BH SCALE_2026.xlsx");
  const result = consolidatedTotals(parsed, 2026, 10);
  assert.ok(result, "ciclo de outubro/2026 não encontrado");
  assert.equal(result.totals.ligacoes, 33535);
  assert.equal(result.totals.aberturas, 154);
  assert.equal(result.totals.formularios, 111);
  assert.equal(result.totals.onlines, 29);
  assert.equal(result.totals.calls_agendadas, 94);
  assert.equal(result.totals.calls_realizadas, 59);
  assert.equal(result.totals.teste_vocacional, 0);
  assert.equal(result.totals.vendas, 7);
  assert.ok(parsed.facts.some((fact) => fact.grain === "diario"));
  assert.ok(parsed.teams.includes("MANÍACOS"));
  assert.ok(parsed.parameters.some((item) => item.code === "abertura_formulario" && item.value === 0.6));
});
