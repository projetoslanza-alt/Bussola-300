const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { parseWorkbook, consolidatedTotals, teamTotals } = require("../src/adp/parse");
const { planPeople } = require("../src/adp/store");

const file = path.join(__dirname, "..", "ADP BH SCALE_2026.xlsx");
const parsed = parseWorkbook(fs.readFileSync(file), "ADP BH SCALE_2026.xlsx");
const october = teamTotals(parsed, 2026, 10);
const general = consolidatedTotals(parsed, 2026, 10);

const EXPECTED = {
  MANÍACOS: { ligacoes: 6292, aberturas: 40, formularios: 28, onlines: 3, calls_agendadas: 22, calls_realizadas: 16, teste_vocacional: 0, vendas: 4 },
  ELITE: { ligacoes: 7547, aberturas: 24, formularios: 14, onlines: 7, calls_agendadas: 14, calls_realizadas: 10, teste_vocacional: 0, vendas: 1 },
  NEGOCIADORES: { ligacoes: 13072, aberturas: 62, formularios: 47, onlines: 12, calls_agendadas: 41, calls_realizadas: 21, teste_vocacional: 0, vendas: 2 },
  BOPE: { ligacoes: 6624, aberturas: 28, formularios: 22, onlines: 7, calls_agendadas: 17, calls_realizadas: 12, teste_vocacional: 0, vendas: 0 }
};

function octoberFacts(predicate) {
  return parsed.facts.filter((fact) => fact.cycleName === "Outubro 2026" && predicate(fact));
}

test("MANÍACOS usa o TOTAL da seção e não o total do B.O.P.E", () => {
  assert.deepEqual(october.totals.MANÍACOS, EXPECTED.MANÍACOS);
  assert.deepEqual(october.people.MANÍACOS, ["FELIPE CARLO", "THIAGO CASTRO", "CAIO", "DANIEL"]);
  const rows = octoberFacts((fact) => fact.team === "MANÍACOS" && fact.grain === "consolidado_equipe_total" && fact.metric === "ligacoes");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].value, 6292);
  assert.equal(rows[0].sourceSheet, "ADP GERAL OUT26");
});

test("cada equipe com TOTAL explícito em outubro bate com a planilha", () => {
  for (const [team, expected] of Object.entries(EXPECTED)) {
    assert.deepEqual(october.totals[team], expected, team);
  }
  assert.equal(october.totals.MERCENÁRIOS, undefined);
  assert.equal(october.totals.VINGADORES, undefined);
});

test("vendas por equipe saem da linha TOTAL e somam o consolidado geral", () => {
  assert.equal(october.totals.MANÍACOS.vendas, 4);
  assert.equal(october.totals.ELITE.vendas, 1);
  assert.equal(october.totals.NEGOCIADORES.vendas, 2);
  assert.equal(october.totals.BOPE.vendas, 0);
  const metrics = Object.keys(EXPECTED.MANÍACOS);
  for (const metric of metrics) {
    const sum = Object.values(EXPECTED).reduce((total, team) => total + team[metric], 0);
    assert.equal(sum, general.totals[metric], metric);
  }
});

test("detalhe da equipe não é somado de novo ao TOTAL", () => {
  const detail = octoberFacts((fact) => fact.team === "MANÍACOS" && fact.grain === "consolidado_equipe" && fact.metric === "ligacoes")
    .reduce((total, fact) => total + fact.value, 0);
  assert.ok(detail > 0);
  assert.notEqual(detail + october.totals.MANÍACOS.ligacoes, october.totals.MANÍACOS.ligacoes);
  assert.equal(october.totals.MANÍACOS.ligacoes, 6292);
  assert.ok(octoberFacts((fact) => fact.grain === "consolidado" && fact.person === "FELIPE CARLO").every((fact) => fact.team == null));
});

test("troca de equipe preserva os dois vínculos por ciclo", () => {
  const lucas = parsed.facts.filter((fact) => fact.person === "LUCAS FRANÇA" && fact.grain === "consolidado_equipe" && fact.metric === "ligacoes");
  const byCycle = new Map(lucas.map((fact) => [fact.cycleName, fact.team]));
  assert.equal(byCycle.get("Agosto 2026"), "MANÍACOS");
  assert.equal(byCycle.get("Outubro 2026"), "ELITE");
});

test("alias único une e nome ambíguo da planilha permanece pendente", () => {
  const planned = planPeople(parsed.people);
  assert.equal(planned.aliasToKey.get("CAIO"), "CAIO MARTINS");
  const daniel = planned.people.find((person) => person.key === "DANIEL");
  assert.equal(daniel.status, "pending");
  assert.ok(daniel.candidates.length > 1);
});

test("linha TOTAL e conversões não viram colaborador", () => {
  assert.equal(parsed.people.some((name) => name.toUpperCase().startsWith("TOTAL")), false);
  assert.equal(parsed.people.some((name) => name.toUpperCase().startsWith("CONVERS")), false);
});

test("fatos de outubro ficam dentro de 16/09/2026 a 15/10/2026", () => {
  const facts = parsed.facts.filter((fact) => fact.cycleName === "Outubro 2026");
  assert.ok(facts.length > 0);
  assert.ok(facts.every((fact) => fact.period >= "2026-09-16" && fact.period <= "2026-10-15"));
  assert.ok(parsed.warnings.some((warning) => warning.message.includes("Aba acumulada não entra")));
});

test("erro de fórmula não vira zero", () => {
  const errors = parsed.warnings.filter((warning) => warning.cell && /fórmula/i.test(warning.message));
  assert.ok(errors.length > 0);
  for (const warning of errors) {
    const fact = parsed.facts.find((item) => item.sourceSheet === warning.sheet && item.sourceCell === warning.cell);
    if (fact) assert.equal(fact.value, null);
  }
  assert.equal(general.totals.teste_vocacional, 0);
});
