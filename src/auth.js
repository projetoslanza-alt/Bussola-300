const crypto = require("crypto");
const { query } = require("./db");
const { hashPassword, verifyPassword } = require("./password");
const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = require("./config");

const COOKIE = "b300sid";

async function ensureAdmin() {
  const existing = await query(`SELECT id FROM users LIMIT 1`);
  if (existing.rowCount || !ADMIN_PASSWORD) return;
  await query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
    [ADMIN_NAME, ADMIN_EMAIL.toLowerCase(), hashPassword(ADMIN_PASSWORD)]
  );
}

async function login(email, password) {
  const user = await query(`SELECT * FROM users WHERE lower(email) = lower($1) AND active`, [email || ""]);
  const row = user.rows[0];
  if (row?.locked_until && new Date(row.locked_until) > new Date()) {
    const error = new Error("Conta temporariamente bloqueada.");
    error.status = 429;
    throw error;
  }
  if (!row || !verifyPassword(password || "", row.password_hash)) {
    if (row) {
      const failures = row.failed_logins + 1;
      await query(
        `UPDATE users SET failed_logins = $2, locked_until = CASE WHEN $2 >= 8 THEN now() + interval '15 minutes' ELSE NULL END WHERE id = $1`,
        [row.id, failures]
      );
    }
    const error = new Error("Credenciais inválidas.");
    error.status = 401;
    throw error;
  }
  await query(`UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1`, [row.id]);
  const id = crypto.randomUUID();
  await query(`INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, now() + interval '12 hours')`, [id, row.id]);
  return { sessionId: id, user: publicUser(row) };
}

async function userFromRequest(req) {
  const id = req.cookies?.[COOKIE];
  if (!id) return null;
  const row = await query(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > now() AND u.active`,
    [id]
  );
  return row.rows[0] ? publicUser(row.rows[0], true) : null;
}

function publicUser(row, internal = false) {
  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    personId: row.person_id,
    teamId: row.team_id
  };
  if (internal) {
    user.person_id = row.person_id;
    user.team_id = row.team_id;
  }
  return user;
}

function requireUser(req, res, next) {
  userFromRequest(req).then((user) => {
    if (!user) return res.status(401).json({ error: "Autenticação necessária." });
    req.user = user;
    next();
  }).catch(next);
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Sem permissão." });
    next();
  };
}

module.exports = { COOKIE, ensureAdmin, login, userFromRequest, requireUser, requireRole, publicUser };
