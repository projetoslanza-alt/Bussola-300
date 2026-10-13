const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const banned = [
  "Ana Souza",
  "Lucas Prado",
  "Marina Alves",
  "Camila Ribeiro",
  "João Lima",
  "Admin2",
  "R$ 1,24 mi",
  "R$ 2,23 mi",
  "R$ 78 mil",
  "2,8x",
  "10,7d",
  "4.850",
  "Venda Consultiva 300"
];

function runtimeFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "test", ".git", "docs"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) runtimeFiles(full, acc);
    else if (/\.(html|js)$/.test(entry.name) && entry.name !== "bussola_300_mvp.html") acc.push(full);
  }
  return acc;
}

test("runtime não renderiza dados fictícios do protótipo", () => {
  const root = path.join(__dirname, "..");
  const files = [
    ...runtimeFiles(path.join(root, "public")),
    ...runtimeFiles(path.join(root, "assets")),
    ...runtimeFiles(path.join(root, "src")),
    path.join(root, "index.html")
  ];
  const hits = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const token of banned) {
      if (text.includes(token)) hits.push(`${path.relative(root, file)}: ${token}`);
    }
  }
  assert.deepEqual(hits, []);
});

test("módulos sem fonte usam empty state", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  for (const text of [
    "Nenhuma notícia publicada.",
    "Nenhum curso cadastrado.",
    "Nenhum treinamento cadastrado.",
    "Nenhuma vaga cadastrada.",
    "Nenhum documento disponível.",
    "Nenhum material publicado.",
    "Nenhuma atividade de gamificação registrada.",
    "Aguardando dados."
  ]) {
    assert.equal(html.includes(text), true, text);
  }
});
