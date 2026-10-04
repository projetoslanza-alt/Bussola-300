const test = require("node:test");
const assert = require("node:assert/strict");
const { app } = require("../src/index");
const { query, pool } = require("../src/db");
const { hashPassword } = require("../src/password");

let server;
let base;

test.before(async () => {
  server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

async function adminCookie() {
  const admin = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
  });
  assert.equal(admin.status, 200);
  return admin.headers.getSetCookie()[0].split(";")[0];
}

test("chamado eleva prioridade, pausa o SLA e oculta tema restrito", async () => {
  const cookie = await adminCookie();
  const reason = await query(`SELECT id, area_id FROM ticket_reasons WHERE default_priority = 'P3' AND is_restricted = false LIMIT 1`);
  const created = await fetch(`${base}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      areaId: reason.rows[0].area_id, reasonId: reason.rows[0].id, title: "Teste de elevação",
      expectedResult: "Confirmar prioridade", context: "Teste automatizado",
      impact: "Cliente relevante / empresa", urgency: "Trabalho parado", origin: "Indicador", neededOn: "2026-10-10"
    })
  });
  const ticket = await created.json();
  assert.equal(created.status, 201);
  assert.equal(ticket.priority_code, "P1");

  const paused = await fetch(`${base}/api/tickets/${ticket.id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ status: "AGUARDANDO_SOLICITANTE", note: "Falta documento" })
  });
  assert.equal(paused.status, 200);
  const pauses = await query(`SELECT ended_at FROM ticket_pauses WHERE ticket_id = $1`, [ticket.id]);
  assert.equal(pauses.rowCount, 1);
  assert.equal(pauses.rows[0].ended_at, null);

  const blocked = await fetch(`${base}/api/tickets/${ticket.id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ status: "RESOLVIDO" })
  });
  assert.equal(blocked.status, 400);

  const sensitive = await query(`SELECT id, area_id FROM ticket_reasons WHERE is_restricted = true LIMIT 1`);
  const hidden = await fetch(`${base}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      areaId: sensitive.rows[0].area_id, reasonId: sensitive.rows[0].id, title: "Desligamento sigiloso de teste",
      expectedResult: "Registrar decisão", context: "Conteúdo restrito",
      impact: "Uma pessoa", urgency: "Planejada", origin: "Solicitação", neededOn: "2026-10-10"
    })
  });
  const secret = await hidden.json();
  const email = `viewer.teste.${Date.now()}@bussola300.local`;
  await query(`INSERT INTO users (name, email, password_hash, role) VALUES ('Viewer Teste', $1, $2, 'viewer')`, [email, hashPassword("teste-temporario")]);
  const viewerLogin = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "teste-temporario" })
  });
  const viewer = viewerLogin.headers.getSetCookie()[0].split(";")[0];
  const list = await fetch(`${base}/api/tickets`, { headers: { cookie: viewer } });
  const body = await list.json();
  assert.equal(body.tickets.some((item) => item.id === secret.id), false);
  await query(`DELETE FROM users WHERE email = $1`, [email]);
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("sem sessão a API recusa acesso", async () => {
  const response = await fetch(`${base}/api/adp/dashboard`);
  assert.equal(response.status, 401);
});

test("health responde com banco", async () => {
  const response = await fetch(`${base}/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.database, "up");
});

test("admin vê o consolidado importado e colaborador sem vínculo não vê a base geral", async () => {
  const admin = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
  });
  assert.equal(admin.status, 200);
  const cookie = admin.headers.getSetCookie()[0].split(";")[0];
  const dashboard = await fetch(`${base}/api/adp/dashboard`, { headers: { cookie } });
  const data = await dashboard.json();
  assert.equal(data.totals.ligacoes, 33535);
  assert.equal(data.totals.vendas, 7);

  const email = `colaborador.teste.${Date.now()}@bussola300.local`;
  await query(`INSERT INTO users (name, email, password_hash, role) VALUES ('Colaborador Teste', $1, $2, 'colaborador')`, [email, hashPassword("teste-temporario")]);
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "teste-temporario" })
  });
  const other = login.headers.getSetCookie()[0].split(";")[0];
  const denied = await fetch(`${base}/api/admin/overview`, { headers: { cookie: other } });
  assert.equal(denied.status, 403);
  const own = await fetch(`${base}/api/adp/dashboard`, { headers: { cookie: other } });
  const ownData = await own.json();
  assert.equal(ownData.empty, true);
  await query(`DELETE FROM users WHERE email = $1`, [email]);
});
