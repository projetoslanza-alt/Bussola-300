const fs = require("fs");
const path = require("path");
const { query } = require("./db");

async function migrate() {
  await query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const dir = path.join(__dirname, "..", "migrations");
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) {
    const existing = await query("SELECT 1 FROM schema_migrations WHERE id = $1", [file]);
    if (existing.rowCount) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await query(sql);
    await query("INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT DO NOTHING", [file]);
    console.log(`migration aplicada: ${file}`);
  }
}

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { migrate };
