const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

require("../src/config");

const TEST_DB = "bussola300_migration_sql_check";
const MIGRATIONS = ["001_init.sql", "002_access.sql", "003_real_data.sql"];

function adminConnectionString(database) {
  const url = new URL(process.env.DATABASE_URL);
  if (url.pathname === `/${TEST_DB}`) throw new Error("O teste de migration não pode usar o banco temporário como origem.");
  if (database === "bussola300_prod") throw new Error("O teste de migration não pode usar bussola300_prod.");
  const passwordFile = process.env.PG_SUPERUSER_PASSWORD_FILE || "E:\\Bussola300\\superuser.pw";
  if (fs.existsSync(passwordFile)) {
    url.username = "postgres";
    url.password = fs.readFileSync(passwordFile, "utf8").trim();
  }
  url.pathname = `/${database}`;
  return url.toString();
}

test("migrations 001, 002 e 003 aplicam em banco limpo", async () => {
  const dir = path.join(__dirname, "..", "migrations");
  const sql003 = fs.readFileSync(path.join(dir, "003_real_data.sql"), "utf8");
  assert.equal(/\bcurrent_role\b/.test(sql003), false);
  assert.match(sql003, /\bcurrent_job_title\b/);

  const admin = new Client({ connectionString: adminConnectionString("postgres") });
  await admin.connect();
  const source = await admin.query("SELECT current_database() AS name");
  assert.notEqual(source.rows[0].name, "bussola300_prod");
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);

  const client = new Client({ connectionString: adminConnectionString(TEST_DB) });
  await client.connect();
  try {
    for (const file of MIGRATIONS) {
      await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
    }
    const applied = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'people'
         AND column_name IN ('current_role', 'current_job_title')
       ORDER BY column_name`
    );
    assert.deepEqual(applied.rows.map((row) => row.column_name), ["current_job_title"]);
    const auth = await client.query(
      `SELECT pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE conrelid = 'users'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%role%'`
    );
    assert.equal(auth.rowCount, 1);
    assert.match(auth.rows[0].definition, /admin/);
    assert.match(auth.rows[0].definition, /viewer/);
    assert.doesNotMatch(auth.rows[0].definition, /current_job_title/);
  } finally {
    await client.end();
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.end();
  }
});
