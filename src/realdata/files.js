const fs = require("fs");
const path = require("path");

const PATTERNS = {
  roi: [/roi[_\s-]*scale300/i, /^ROI_Scale300/i],
  sales: [/controle de vendas/i],
  team: [/equipe comercial/i],
  catalog: [/catalogo_chamados/i, /cat[aá]logo_chamados/i]
};

function roots() {
  const configured = process.env.REAL_DATA_DIR ? [process.env.REAL_DATA_DIR] : [];
  const project = path.join(__dirname, "..", "..");
  return [...configured, path.join(project, "imports"), project];
}

function listXlsx(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".xlsx") && !name.startsWith("~$"))
    .filter((name) => !/adp/i.test(name))
    .map((name) => path.join(dir, name));
}

function matches(filePath, patterns) {
  const base = path.basename(filePath);
  return patterns.some((pattern) => pattern.test(base));
}

function findSource(kind) {
  const found = [];
  for (const dir of roots()) {
    for (const file of listXlsx(dir)) {
      if (matches(file, PATTERNS[kind])) found.push(file);
    }
    if (found.length) break;
  }
  const unique = [...new Set(found.map((file) => path.resolve(file)))];
  if (!unique.length) {
    const error = new Error(`Arquivo de ${kind} não encontrado. Coloque o XLSX em REAL_DATA_DIR, imports/ ou na raiz do projeto.`);
    error.status = 400;
    throw error;
  }
  if (unique.length > 1) {
    unique.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  }
  return unique[0];
}

function loadSources() {
  const files = {
    roi: findSource("roi"),
    sales: findSource("sales"),
    team: findSource("team"),
    catalog: findSource("catalog")
  };
  return {
    files,
    buffers: {
      roi: fs.readFileSync(files.roi),
      sales: fs.readFileSync(files.sales),
      team: fs.readFileSync(files.team),
      catalog: fs.readFileSync(files.catalog)
    }
  };
}

module.exports = { findSource, loadSources, roots };
