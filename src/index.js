const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const { PORT, NODE_ENV, UPLOAD_DIR } = require("./config");
const { query, withTransaction, pool } = require("./db");
const { migrate } = require("./migrate");
const { ensureAdmin, login, requireUser, requireRole, COOKIE } = require("./auth");
const { importAdp } = require("./adp/store");
const { dashboard, teamsView, personView } = require("./adp/query");
const { importCatalog } = require("./tickets/store");
const tickets = require("./tickets/service");
const { audit } = require("./audit");
const { seed } = require("./seed");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }
});

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

app.get("/health", asyncRoute(async (req, res) => {
  let database = "down";
  try {
    await query("SELECT 1");
    database = "up";
  } catch (error) {
    console.error("health database", error.message);
  }
  res.status(database === "up" ? 200 : 503).json({
    app: "up",
    database,
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
}));

const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

app.post("/api/auth/login", loginLimit, asyncRoute(async (req, res) => {
  const result = await login(req.body.email, req.body.password);
  const https = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.cookie(COOKIE, result.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: https,
    maxAge: 12 * 60 * 60 * 1000
  });
  res.json({ user: result.user });
}));

app.post("/api/auth/logout", requireUser, asyncRoute(async (req, res) => {
  await query(`DELETE FROM sessions WHERE id = $1`, [req.cookies[COOKIE]]);
  res.clearCookie(COOKIE);
  res.json({ ok: true });
}));

app.get("/api/auth/me", requireUser, (req, res) => res.json({ user: req.user }));

app.get("/api/adp/dashboard", requireUser, asyncRoute(async (req, res) => {
  res.json(await dashboard({ query }, req.user, req.query));
}));

app.get("/api/adp/teams", requireUser, asyncRoute(async (req, res) => {
  const data = await dashboard({ query }, req.user, req.query);
  if (data.empty) return res.json(data);
  res.json({ teams: await teamsView({ query }, data.cycle.id) });
}));

app.get("/api/adp/people/:id", requireUser, asyncRoute(async (req, res) => {
  if (req.user.role === "colaborador" && req.user.person_id !== req.params.id) return res.status(403).json({ error: "Sem permissão." });
  const cycle = req.query.cycleId || (await query(`SELECT id FROM adp_cycles WHERE is_current LIMIT 1`)).rows[0]?.id;
  res.json(await personView({ query }, req.params.id, cycle));
}));

app.post("/api/adp/people/:id/notes", requireUser, requireRole("admin", "gestor", "gg", "diretoria"), asyncRoute(async (req, res) => {
  if (!req.body.body || !req.body.kind) return res.status(400).json({ error: "Informe tipo e texto." });
  const row = await query(
    `INSERT INTO adp_notes (person_id, cycle_id, kind, body, author_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
    [req.params.id, req.body.cycleId || null, req.body.kind, req.body.body, req.user.id]
  );
  await audit(req.user.id, "adp.note", "person", req.params.id, null, { kind: req.body.kind });
  res.status(201).json(row.rows[0]);
}));

app.get("/api/tickets/catalog", requireUser, asyncRoute(async (req, res) => {
  const areas = await query(`SELECT id, name FROM ticket_areas WHERE active ORDER BY name`);
  const reasons = await query(
    `SELECT id, area_id, catalog_code, title, when_to_use, default_type, default_priority, validation_status, config_pending, pending_fields, is_restricted
     FROM ticket_reasons WHERE active ORDER BY title`
  );
  const origins = await query(`SELECT name FROM ticket_origins WHERE active ORDER BY name`);
  const rules = await query(`SELECT theme, rule_text FROM ticket_rules ORDER BY source_row`);
  res.json({ areas: areas.rows, reasons: reasons.rows, origins: origins.rows.map((row) => row.name), rules: rules.rows });
}));

app.get("/api/tickets", requireUser, asyncRoute(async (req, res) => {
  res.json({ tickets: await tickets.listTickets(req.user, req.query), kpis: await tickets.kpis(req.user) });
}));

app.post("/api/tickets", requireUser, asyncRoute(async (req, res) => {
  res.status(201).json(await tickets.createTicket(req.user, req.body));
}));

app.get("/api/tickets/:id", requireUser, asyncRoute(async (req, res) => {
  const detail = await tickets.ticketDetail(req.user, req.params.id);
  if (!detail) return res.status(404).json({ error: "Chamado não encontrado." });
  res.json(detail);
}));

app.post("/api/tickets/:id/status", requireUser, asyncRoute(async (req, res) => {
  const detail = await tickets.changeStatus(req.user, req.params.id, req.body.status, req.body.note);
  if (!detail) return res.status(404).json({ error: "Chamado não encontrado." });
  res.json(detail);
}));

app.post("/api/tickets/:id/comments", requireUser, asyncRoute(async (req, res) => {
  if (!req.body.body) return res.status(400).json({ error: "Comentário vazio." });
  const detail = await tickets.comment(req.user, req.params.id, req.body.body);
  if (!detail) return res.status(404).json({ error: "Chamado não encontrado." });
  res.json(detail);
}));

app.post("/api/tickets/:id/assign", requireUser, asyncRoute(async (req, res) => {
  const detail = await tickets.assign(req.user, req.params.id, req.body.assigneeId);
  if (!detail) return res.status(404).json({ error: "Chamado não encontrado." });
  res.json(detail);
}));

app.post("/api/tickets/:id/reopen", requireUser, asyncRoute(async (req, res) => {
  const detail = await tickets.reopen(req.user, req.params.id, req.body.reason);
  if (!detail) return res.status(404).json({ error: "Chamado não encontrado." });
  res.json(detail);
}));

app.post("/api/tickets/:id/attachments", requireUser, upload.single("file"), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Arquivo ausente." });
  res.status(201).json(await tickets.saveAttachment(req.user, req.params.id, req.file));
}));

app.get("/api/tickets/:id/attachments/:attachmentId", requireUser, asyncRoute(async (req, res) => {
  const detail = await tickets.ticketDetail(req.user, req.params.id);
  if (!detail) return res.status(404).json({ error: "Chamado não encontrado." });
  const file = await query(`SELECT * FROM ticket_attachments WHERE id = $1 AND ticket_id = $2`, [req.params.attachmentId, req.params.id]);
  if (!file.rowCount) return res.status(404).json({ error: "Anexo não encontrado." });
  res.download(path.join(UPLOAD_DIR, file.rows[0].stored_name), file.rows[0].original_name);
}));

app.get("/api/reports/adp", requireUser, asyncRoute(async (req, res) => {
  const data = await dashboard({ query }, req.user, req.query);
  const teams = data.cycle ? await teamsView({ query }, data.cycle.id) : [];
  res.json({ ...data, teams });
}));

app.get("/api/reports/tickets", requireUser, asyncRoute(async (req, res) => {
  const list = await tickets.listTickets(req.user, req.query);
  const by = (key) => {
    const map = new Map();
    for (const ticket of list) {
      const name = ticket[key] || "Sem valor";
      map.set(name, (map.get(name) || 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };
  res.json({ kpis: await tickets.kpis(req.user), byArea: by("area"), byReason: by("reason"), byPriority: by("priority"), byAssignee: by("assignee") });
}));

app.get("/api/admin/imports", requireUser, requireRole("admin"), asyncRoute(async (req, res) => {
  const rows = await query(`SELECT id, kind, filename, byte_size, sha256, status, created_count, updated_count, warning_count, error_count, forced, created_at, finished_at, summary FROM import_batches ORDER BY created_at DESC LIMIT 50`);
  res.json({ imports: rows.rows });
}));

app.get("/api/admin/imports/:id/warnings", requireUser, requireRole("admin"), asyncRoute(async (req, res) => {
  const rows = await query(`SELECT level, sheet, cell, message FROM import_warnings WHERE batch_id = $1 ORDER BY sheet, cell LIMIT 500`, [req.params.id]);
  res.json({ warnings: rows.rows });
}));

function spreadsheetUpload(kind) {
  return [
    requireUser,
    requireRole("admin"),
    upload.single("file"),
    asyncRoute(async (req, res) => {
      if (!req.file || !req.file.originalname.toLowerCase().endsWith(".xlsx")) return res.status(400).json({ error: "Envie um arquivo .xlsx." });
      const importer = kind === "adp" ? importAdp : importCatalog;
      const result = await withTransaction((client) => importer(client, req.file.buffer, path.basename(req.file.originalname), req.user.id, { force: req.query.force === "1" }));
      res.json(result);
    })
  ];
}

app.post("/api/admin/imports/adp", ...spreadsheetUpload("adp"));
app.post("/api/admin/imports/tickets", ...spreadsheetUpload("tickets"));

app.get("/api/admin/overview", requireUser, requireRole("admin"), asyncRoute(async (req, res) => {
  const [cycles, teams, people, pending, reasons, users, calendar] = await Promise.all([
    query(`SELECT * FROM adp_cycles ORDER BY starts_on`),
    query(`SELECT * FROM teams ORDER BY name`),
    query(`SELECT id, display_name, match_key, reconciliation_status FROM people ORDER BY display_name`),
    query(`SELECT * FROM person_reconciliations WHERE status = 'pending' ORDER BY created_at DESC`),
    query(`SELECT r.*, a.name AS area_name FROM ticket_reasons r JOIN ticket_areas a ON a.id = r.area_id ORDER BY a.name, r.title`),
    query(`SELECT id, name, email, role, person_id, team_id, active FROM users ORDER BY name`),
    query(`SELECT timezone, work_start::text, work_end::text, work_days FROM business_calendar WHERE id = 1`)
  ]);
  res.json({
    cycles: cycles.rows, teams: teams.rows, people: people.rows, reconciliations: pending.rows,
    reasons: reasons.rows, users: users.rows, calendar: calendar.rows[0]
  });
}));

app.patch("/api/admin/cycles/:id", requireUser, requireRole("admin"), asyncRoute(async (req, res) => {
  const before = await query(`SELECT * FROM adp_cycles WHERE id = $1`, [req.params.id]);
  if (!before.rowCount) return res.status(404).json({ error: "Ciclo não encontrado." });
  if (req.body.isCurrent) await query(`UPDATE adp_cycles SET is_current = false`);
  const row = await query(
    `UPDATE adp_cycles SET name = COALESCE($2, name), status = COALESCE($3, status), is_current = COALESCE($4, is_current),
      starts_on = COALESCE($5, starts_on), ends_on = COALESCE($6, ends_on) WHERE id = $1 RETURNING *`,
    [req.params.id, req.body.name || null, req.body.status || null, req.body.isCurrent ?? null, req.body.startsOn || null, req.body.endsOn || null]
  );
  await audit(req.user.id, "adp.cycle", "adp_cycle", req.params.id, before.rows[0], row.rows[0]);
  res.json(row.rows[0]);
}));

app.post("/api/admin/cycles", requireUser, requireRole("admin"), asyncRoute(async (req, res) => {
  const row = await query(
    `INSERT INTO adp_cycles (name, month, year, starts_on, ends_on, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.body.name, req.body.month || null, req.body.year || null, req.body.startsOn || null, req.body.endsOn || null, req.body.status || "aberto"]
  );
  res.status(201).json(row.rows[0]);
}));

app.post("/api/admin/teams", requireUser, requireRole("admin"), asyncRoute(async (req, res) => {
  const row = await query(`INSERT INTO teams (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING *`, [req.body.name]);
  res.status(201).json(row.rows[0]);
}));

app.post("/api/admin/reconciliations/:id/resolve", requireUser, requireRole("admin"), asyncRoute(async (req, res) => {
  const row = await query(`UPDATE person_reconciliations SET status = 'resolved', resolved_person_id = $2 WHERE id = $1 RETURNING *`, [req.params.id, req.body.personId]);
  await audit(req.user.id, "person.reconcile", "person_reconciliation", req.params.id, null, { personId: req.body.personId });
  res.json(row.rows[0]);
}));

app.patch("/api/admin/reasons/:id", requireUser, requireRole("admin"), asyncRoute(async (req, res) => {
  const before = await query(`SELECT * FROM ticket_reasons WHERE id = $1`, [req.params.id]);
  const row = await query(
    `UPDATE ticket_reasons SET catalog_code = $2, default_type = $3, default_priority = $4, sla_owner = $5, validation_status = $6,
      default_assignee_id = $7, active = $8, adjustment_note = $9,
      config_pending = ($2 IS NULL OR $3 IS NULL OR $4 IS NULL OR $5 IS NULL)
     WHERE id = $1 RETURNING *`,
    [req.params.id, req.body.catalogCode ?? null, req.body.defaultType ?? null, req.body.defaultPriority ?? null, req.body.slaOwner ?? null, req.body.validationStatus ?? null, req.body.defaultAssigneeId ?? null, req.body.active ?? true, req.body.adjustmentNote ?? null]
  );
  await audit(req.user.id, "catalog.update", "ticket_reason", req.params.id, before.rows[0], row.rows[0]);
  res.json(row.rows[0]);
}));

app.post("/api/admin/users", requireUser, requireRole("admin"), asyncRoute(async (req, res) => {
  const { hashPassword } = require("./password");
  const row = await query(
    `INSERT INTO users (name, email, password_hash, role, person_id, team_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role`,
    [req.body.name, String(req.body.email).toLowerCase(), hashPassword(req.body.password), req.body.role, req.body.personId || null, req.body.teamId || null]
  );
  await audit(req.user.id, "user.create", "user", row.rows[0].id, null, { role: req.body.role, email: req.body.email });
  res.status(201).json(row.rows[0]);
}));

app.patch("/api/admin/calendar", requireUser, requireRole("admin"), asyncRoute(async (req, res) => {
  const row = await query(
    `UPDATE business_calendar SET timezone = COALESCE($1, timezone), work_start = COALESCE($2, work_start), work_end = COALESCE($3, work_end), work_days = COALESCE($4, work_days) WHERE id = 1 RETURNING timezone, work_start::text, work_end::text, work_days`,
    [req.body.timezone || null, req.body.workStart || null, req.body.workEnd || null, req.body.workDays || null]
  );
  await audit(req.user.id, "calendar.update", "business_calendar", null, null, row.rows[0]);
  res.json(row.rows[0]);
}));

app.get("/api/home", requireUser, asyncRoute(async (req, res) => {
  const kpis = await tickets.kpis(req.user);
  const adp = await dashboard({ query }, req.user, {});
  res.json({
    chamadosAbertos: kpis.backlog,
    chamadosCriticos: kpis.criticos,
    aguardandoAtribuicao: kpis.aguardandoAtribuicao,
    ciclo: adp.cycle?.name || null,
    vendas: adp.totals?.vendas ?? null,
    ligacoes: adp.totals?.ligacoes ?? null
  });
}));

const root = path.join(__dirname, "..");
app.get("/", (req, res) => res.sendFile(path.join(root, "index.html")));
app.get("/live.js", (req, res) => res.sendFile(path.join(root, "public", "live.js")));

app.use((error, req, res, next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(req.method, req.path, error.message);
  res.status(status).json({ error: status >= 500 ? "Falha interna." : error.message });
});

async function start() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await migrate();
  await ensureAdmin();
  const loaded = await query(`SELECT 1 FROM import_batches WHERE status = 'completed' LIMIT 1`);
  if (!loaded.rowCount) await seed();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bússola 300 ouvindo na porta ${PORT}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { app, pool };
