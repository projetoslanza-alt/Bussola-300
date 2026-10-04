const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { parseCatalog } = require("../src/tickets/catalogParse");
const { resolvePriority } = require("../src/tickets/priority");
const { planPeople } = require("../src/adp/store");
const { addBusinessMinutes } = require("../src/tickets/businessTime");

test("catálogo importa motivos reais e não inventa código", () => {
  const parsed = parseCatalog(fs.readFileSync(path.join(__dirname, "..", "catalogo_chamados_300.xlsx")));
  assert.equal(parsed.reasons.length, 50);
  assert.equal(parsed.meta.declaredTotal, 48);
  assert.equal(parsed.reasons.some((reason) => reason.title === "Tipo de chamado"), false);
  const commercial = ["Ação Comercial", "Ação Corretiva Comercial", "Ajuste de Processo Comercial", "Atualização de Script", "Atualização de DRS", "Atualização de Material Comercial", "Atualização de D7"];
  for (const title of commercial) {
    const reason = parsed.reasons.find((item) => item.title === title);
    assert.ok(reason, title);
    assert.equal(reason.area, "Comercial");
    assert.equal(reason.code, null);
    assert.equal(reason.configPending, true);
  }
  assert.equal(parsed.audit.find((row) => row.sourceRow === 52).imported, false);
  assert.ok(parsed.reasons.some((reason) => reason.code === "RH2" && reason.isRestricted));
  assert.ok(parsed.reasons.some((reason) => reason.code == null && reason.configPending));
  assert.deepEqual(parsed.policies.map((policy) => policy.code).sort(), ["P1", "P2", "P3", "P4"]);
  assert.equal(parsed.matrix.find((item) => item.impact.startsWith("Cliente") && item.urgency === "Trabalho parado").priority, "P1");
  assert.ok(parsed.rules.length >= 5);
});

test("matriz não reduz prioridade mais crítica", () => {
  assert.equal(resolvePriority("P2", "P4"), "P2");
  assert.equal(resolvePriority("P3", "P1"), "P1");
  assert.equal(resolvePriority(null, "P4"), "P4");
});

test("nomes ambíguos não são fundidos", () => {
  const planned = planPeople(["DANIEL", "DANIEL MARTINS", "DANIEL SOARES", "CAIO", "CAIO MARTINS"]);
  const daniel = planned.people.find((person) => person.key === "DANIEL");
  assert.equal(daniel.status, "pending");
  assert.equal(planned.aliasToKey.get("CAIO"), "CAIO MARTINS");
});

test("SLA em horário útil atravessa o fim do expediente", () => {
  const calendar = { timezone: "America/Sao_Paulo", workDays: [1, 2, 3, 4, 5], startMinute: 9 * 60, endMinute: 18 * 60 };
  const due = addBusinessMinutes(new Date("2026-10-05T20:30:00.000Z"), 60, calendar, new Set());
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hourCycle: "h23" }).format(due);
  assert.equal(hour, "09");
});
