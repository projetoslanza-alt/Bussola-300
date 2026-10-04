const fs = require("fs");
const path = require("path");
const { withTransaction } = require("./db");
const { migrate } = require("./migrate");
const { ensureAdmin } = require("./auth");
const { importAdp } = require("./adp/store");
const { importCatalog } = require("./tickets/store");

const root = path.join(__dirname, "..");

async function seed() {
  await migrate();
  await ensureAdmin();
  const adp = path.join(root, "ADP BH SCALE_2026.xlsx");
  const catalog = path.join(root, "catalogo_chamados_300.xlsx");
  const adpResult = await withTransaction((client) => importAdp(client, fs.readFileSync(adp), "ADP BH SCALE_2026.xlsx", null));
  const catalogResult = await withTransaction((client) => importCatalog(client, fs.readFileSync(catalog), "catalogo_chamados_300.xlsx", null));
  console.log(JSON.stringify({ adp: adpResult.summary || adpResult, catalog: catalogResult.summary || catalogResult }, null, 2));
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { seed };
