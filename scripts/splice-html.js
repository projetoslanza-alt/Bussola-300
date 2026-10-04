const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");
const start = html.indexOf('<section class="page" id="page-adp">');
const end = html.indexOf('<section class="page" id="page-financeiro">');
if (start < 0 || end < 0) throw new Error("marcadores não encontrados");
const replacement = `<section class="page" id="page-adp"><div id="adp-root"><div class="card"><p>Carregando ADP.</p></div></div></section>
      <section class="page" id="page-chamados"><div id="tickets-root"><div class="card"><p>Carregando chamados.</p></div></div></section>

      `;
let next = html.slice(0, start) + replacement + html.slice(end);
if (!next.includes("/live.js")) next = next.replace("</body>", '  <script src="/live.js"></script>\n</body>');
fs.writeFileSync("index.html", next);
console.log("ok", next.includes("adp-root"), next.includes("Isabella"), next.includes("/live.js"));
