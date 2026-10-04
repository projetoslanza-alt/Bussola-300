const { query } = require("./db");

async function audit(userId, action, entity, entityId, beforeData, afterData, client) {
  const runner = client || { query };
  await runner.query(
    `INSERT INTO audit_log (user_id, action, entity, entity_id, before_data, after_data)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [userId || null, action, entity, entityId || null, beforeData ? JSON.stringify(beforeData) : null, afterData ? JSON.stringify(afterData) : null]
  );
}

module.exports = { audit };
