const path = require("path");
const { loadSources } = require("../src/realdata/files");
const { importRealData, importCatalogFile } = require("../src/realdata/store");
const { withTransaction } = require("../src/db");
const { migrate } = require("../src/migrate");
const { parseCatalog } = require("../src/tickets/catalogParse");

function line(label, value) {
  console.log(`${label}: ${value}`);
}

async function main() {
  await migrate();
  const sources = loadSources();
  const names = {
    roi: path.basename(sources.files.roi),
    sales: path.basename(sources.files.sales),
    team: path.basename(sources.files.team),
    catalog: path.basename(sources.files.catalog)
  };
  parseCatalog(sources.buffers.catalog);
  const result = await withTransaction((client) => importRealData(client, { buffers: sources.buffers, names }, null));
  const catalog = await importCatalogFile(sources.buffers.catalog, names.catalog, null);
  const summary = result.summary;
  line("COLABORADORES ROI", summary.colaboradoresRoi);
  line("COLABORADORES CRIADOS", summary.colaboradoresCriados);
  line("COLABORADORES ATUALIZADOS", summary.colaboradoresAtualizados);
  line("EQUIPE COMERCIAL CONCILIADA", summary.equipeConciliada);
  line("EQUIPE SEM MATCH NO ROI", summary.equipeSemMatch);
  if (summary.equipeSemMatchNomes.length) {
    console.log("Equipe Comercial sem correspondente no ROI:");
    for (const name of summary.equipeSemMatchNomes) console.log(`- ${name}`);
  }
  line("REGISTROS DE ROI", summary.registrosRoi);
  line("REGISTROS DE VENDAS", summary.registrosVendas);
  line("TRANSAÇÕES DE VENDA", summary.transacoes);
  line("VENDAS SEM MATCH NO ROI", summary.vendasSemMatch);
  line("MOTIVOS DE CHAMADO", catalog.reasons);
  line("CATALOGO DECLARADO NA PLANILHA", catalog.declaredTotal ?? "não informado");
  line("LINHAS DE CATALOGO IGNORADAS", catalog.ignored);
  line("PENDÊNCIAS", summary.pendencias + catalog.pending);
  line("ERROS", 0);
  line("MESES", summary.meses.join(", "));
  if (catalog.stored.alreadyImported) console.log("CATALOGO: arquivo já importado anteriormente; contagem relida da planilha.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
