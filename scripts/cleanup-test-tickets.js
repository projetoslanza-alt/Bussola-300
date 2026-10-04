const { query, pool } = require("../src/db");

query("DELETE FROM tickets WHERE title IN ($1, $2)", ["Teste de elevação", "Desligamento sigiloso de teste"])
  .then((result) => {
    console.log(result.rowCount);
    return pool.end();
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
