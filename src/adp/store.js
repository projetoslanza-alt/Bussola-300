const crypto = require("crypto");
const { cleanName, matchKey } = require("../text");
const { parseWorkbook, consolidatedTotals } = require("./parse");
const { audit } = require("../audit");

function planPeople(names) {
  const unique = [];
  const seen = new Set();
  for (const name of names) {
    const display = cleanName(name);
    const key = matchKey(display);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({ display, key });
  }
  unique.sort((a, b) => b.key.length - a.key.length);
  const people = [];
  const aliasToKey = new Map();
  for (const item of unique) {
    const extensions = people.filter((person) => person.key.startsWith(`${item.key} `) || item.key.startsWith(`${person.key} `));
    if (extensions.length === 1) {
      extensions[0].aliases.add(item.display);
      aliasToKey.set(item.key, extensions[0].key);
      continue;
    }
    const person = {
      key: item.key,
      display: item.display,
      aliases: new Set([item.display]),
      status: extensions.length > 1 ? "pending" : "confirmed",
      candidates: extensions.map((entry) => entry.key)
    };
    people.push(person);
    aliasToKey.set(item.key, person.key);
  }
  return { people, aliasToKey };
}

async function importAdp(client, buffer, filename, userId, { force = false } = {}) {
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const previous = await client.query(
    `SELECT id, finished_at FROM import_batches WHERE kind = 'adp' AND sha256 = $1 AND status = 'completed' ORDER BY finished_at DESC LIMIT 1`,
    [sha256]
  );
  if (previous.rowCount && !force) {
    return { alreadyImported: true, batchId: previous.rows[0].id, finishedAt: previous.rows[0].finished_at };
  }
  const parsed = parseWorkbook(buffer, filename);
  const batch = await client.query(
    `INSERT INTO import_batches (kind, filename, byte_size, sha256, status, forced, created_by, summary)
     VALUES ('adp', $1, $2, $3, 'running', $4, $5, $6::jsonb) RETURNING id`,
    [filename, buffer.length, sha256, force, userId || null, JSON.stringify({ sheets: parsed.sheets })]
  );
  const batchId = batch.rows[0].id;
  const names = [
    ...parsed.people,
    ...parsed.facts.map((fact) => fact.person),
    ...parsed.goals.map((goal) => goal.person),
    ...parsed.funnel.map((row) => row.person)
  ].filter(Boolean);
  const planned = planPeople(names);
  const idByKey = new Map();
  for (const person of planned.people) {
    const existing = await client.query(`SELECT id FROM people WHERE match_key = $1 LIMIT 1`, [person.key]);
    let personId = existing.rows[0]?.id;
    if (!personId) {
      const inserted = await client.query(
        `INSERT INTO people (display_name, match_key, reconciliation_status) VALUES ($1, $2, $3) RETURNING id`,
        [person.display, person.key, person.status]
      );
      personId = inserted.rows[0].id;
    }
    idByKey.set(person.key, personId);
    for (const alias of person.aliases) {
      await client.query(
        `INSERT INTO person_aliases (person_id, alias_name, alias_key, source) VALUES ($1, $2, $3, 'adp')
         ON CONFLICT (alias_key) DO NOTHING`,
        [personId, alias, matchKey(alias)]
      );
    }
    if (person.status === "pending") {
      const candidateIds = person.candidates.map((key) => idByKey.get(key)).filter(Boolean);
      await client.query(
        `INSERT INTO person_reconciliations (raw_name, alias_key, candidate_ids) VALUES ($1, $2, $3)`,
        [person.display, person.key, candidateIds]
      );
    }
  }
  const teamIds = new Map();
  for (const team of parsed.teams) {
    const row = await client.query(
      `INSERT INTO teams (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [team]
    );
    teamIds.set(team, row.rows[0].id);
  }
  const cycleIds = new Map();
  for (const cycle of parsed.cycles) {
    const row = await client.query(
      `INSERT INTO adp_cycles (name, month, year, starts_on, ends_on, source, imported_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (name) DO UPDATE SET
         month = EXCLUDED.month, year = EXCLUDED.year,
         starts_on = COALESCE(adp_cycles.starts_on, EXCLUDED.starts_on),
         ends_on = COALESCE(adp_cycles.ends_on, EXCLUDED.ends_on),
         source = EXCLUDED.source, imported_at = now()
       RETURNING id`,
      [cycle.name, cycle.month, cycle.year, cycle.startsOn, cycle.endsOn, cycle.source]
    );
    cycleIds.set(cycle.name, row.rows[0].id);
  }
  await client.query(`UPDATE adp_cycles SET is_current = false`);
  await client.query(
    `UPDATE adp_cycles SET is_current = true
     WHERE id = (
       SELECT id FROM adp_cycles
       WHERE starts_on <= CURRENT_DATE AND ends_on >= CURRENT_DATE
       ORDER BY ends_on DESC LIMIT 1
     )`
  );
  const current = await client.query(`SELECT id FROM adp_cycles WHERE is_current`);
  if (!current.rowCount) {
    await client.query(`UPDATE adp_cycles SET is_current = true WHERE id = (SELECT id FROM adp_cycles ORDER BY ends_on DESC NULLS LAST LIMIT 1)`);
  }

  let created = 0;
  let updated = 0;
  const memberships = new Set();
  for (const fact of parsed.facts) {
    const cycleId = cycleIds.get(fact.cycleName);
    if (!cycleId) continue;
    const personId = fact.person ? idByKey.get(planned.aliasToKey.get(matchKey(fact.person))) : null;
    const teamId = fact.team ? teamIds.get(fact.team) : null;
    if (personId && teamId) memberships.add(`${cycleId}|${personId}|${teamId}`);
    const result = await client.query(
      `INSERT INTO adp_facts
        (cycle_id, person_id, team_id, metric_code, grain, period_date, value, batch_id, source_file, source_sheet, source_row, source_cell)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (cycle_id, person_id, team_id, metric_code, grain, period_date) DO UPDATE SET
         value = EXCLUDED.value, batch_id = EXCLUDED.batch_id, source_file = EXCLUDED.source_file,
         source_sheet = EXCLUDED.source_sheet, source_row = EXCLUDED.source_row, source_cell = EXCLUDED.source_cell, imported_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [cycleId, personId, teamId, fact.metric, fact.grain, fact.period, fact.value, batchId, fact.sourceFile, fact.sourceSheet, fact.sourceRow, fact.sourceCell]
    );
    if (result.rows[0]?.inserted) created += 1;
    else updated += 1;
  }
  for (const item of memberships) {
    const [cycleId, personId, teamId] = item.split("|");
    await client.query(
      `INSERT INTO cycle_memberships (cycle_id, person_id, team_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [cycleId, personId, teamId]
    );
  }
  for (const goal of parsed.goals) {
    const cycleId = cycleIds.get(goal.cycleName);
    if (!cycleId) continue;
    const personId = goal.person ? idByKey.get(planned.aliasToKey.get(matchKey(goal.person))) : null;
    const teamId = goal.team ? teamIds.get(goal.team) : null;
    const result = await client.query(
      `INSERT INTO adp_goals (cycle_id, person_id, team_id, goal_type, target_value, actual_value, scope, source_sheet, source_cell, batch_id, unit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (cycle_id, person_id, team_id, goal_type, scope) DO UPDATE SET
         target_value = EXCLUDED.target_value, actual_value = EXCLUDED.actual_value, source_sheet = EXCLUDED.source_sheet, batch_id = EXCLUDED.batch_id
       RETURNING (xmax = 0) AS inserted`,
      [cycleId, personId, teamId, goal.goalType, goal.target, goal.actual, goal.scope, goal.sourceSheet, goal.sourceCell, batchId, goal.goalType === "faturamento" ? "BRL" : "unidade"]
    );
    if (result.rows[0]?.inserted) created += 1;
    else updated += 1;
  }
  for (const row of parsed.funnel) {
    const cycleId = cycleIds.get(row.cycleName);
    if (!cycleId) continue;
    const personId = row.person ? idByKey.get(planned.aliasToKey.get(matchKey(row.person))) : null;
    const teamId = row.team ? teamIds.get(row.team) : null;
    await client.query(
      `INSERT INTO adp_funnel (cycle_id, person_id, team_id, stage, quantity, percent_value, source_sheet, source_row, source_cell, batch_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (cycle_id, person_id, team_id, stage) DO UPDATE SET
         quantity = EXCLUDED.quantity, percent_value = EXCLUDED.percent_value, batch_id = EXCLUDED.batch_id`,
      [cycleId, personId, teamId, row.stage, row.quantity, row.percent, row.sourceSheet, row.sourceRow, row.sourceCell, batchId]
    );
  }
  for (const parameter of parsed.parameters) {
    const cycleId = cycleIds.get(parameter.cycleName);
    if (!cycleId) continue;
    await client.query(
      `INSERT INTO adp_parameters (cycle_id, code, label, value, unit, kind)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (cycle_id, code, kind) DO UPDATE SET label = EXCLUDED.label, value = EXCLUDED.value`,
      [cycleId, parameter.code, parameter.label, parameter.value, parameter.kind === "projecao" || parameter.kind === "referencia_minima" ? "percentual" : null, parameter.kind]
    );
  }
  for (const warning of parsed.warnings) {
    await client.query(
      `INSERT INTO import_warnings (batch_id, level, sheet, cell, message) VALUES ($1, $2, $3, $4, $5)`,
      [batchId, warning.level || "warning", warning.sheet, warning.cell, warning.message]
    );
  }
  const check = consolidatedTotals(parsed, 2026, 10);
  const summary = {
    sheets: parsed.sheets.length,
    cycles: parsed.cycles.length,
    teams: parsed.teams.length,
    people: planned.people.length,
    pendingPeople: planned.people.filter((person) => person.status === "pending").length,
    facts: parsed.facts.length,
    goals: parsed.goals.length,
    funnel: parsed.funnel.length,
    october2026: check?.totals || null
  };
  await client.query(
    `UPDATE import_batches SET status = 'completed', created_count = $2, updated_count = $3, warning_count = $4, summary = $5::jsonb, finished_at = now() WHERE id = $1`,
    [batchId, created, updated, parsed.warnings.length, JSON.stringify(summary)]
  );
  await audit(userId, "import.adp", "import_batch", batchId, null, { filename, sha256, force, summary }, client);
  return { alreadyImported: false, batchId, summary, warnings: parsed.warnings.length };
}

module.exports = { importAdp, planPeople };
