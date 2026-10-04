const METRIC_LABELS = {
  ligacoes: "Ligações",
  aberturas: "Aberturas",
  formularios: "Formulários",
  onlines: "Onlines",
  calls_agendadas: "Calls agendadas",
  calls_realizadas: "Calls realizadas",
  teste_vocacional: "Teste vocacional",
  vendas: "Vendas"
};

const FUNNEL = ["ligacoes", "aberturas", "formularios", "onlines", "calls_agendadas", "calls_realizadas", "vendas"];

const REF_BY_STEP = {
  aberturas: "abertura_formulario",
  formularios: "formulario_online",
  onlines: "online_call_agendada",
  calls_agendadas: "call_agendada_realizada"
};

function ratio(part, total) {
  if (total == null || Number(total) === 0 || part == null) return null;
  return Number(part) / Number(total);
}

function scopeWhere(user) {
  if (user.role === "colaborador") return { personId: user.person_id || "00000000-0000-0000-0000-000000000000", teamId: null, locked: true };
  if (user.role === "gestor") return { personId: null, teamId: user.team_id || null, locked: true, missingTeam: !user.team_id };
  return { personId: null, teamId: null, locked: false };
}

async function dashboard(db, user, filters) {
  const access = scopeWhere(user);
  if (access.missingTeam) return { empty: true, reason: "Equipe do gestor ainda não vinculada." };
  if (user.role === "colaborador" && !user.person_id) return { empty: true, reason: "Colaborador sem vínculo de pessoa." };
  const cycles = await db.query(`SELECT id, name, month, year, starts_on, ends_on, status, is_current FROM adp_cycles ORDER BY starts_on NULLS LAST`);
  const cycleId = filters.cycleId || cycles.rows.find((row) => row.is_current)?.id || cycles.rows.at(-1)?.id;
  const teamId = access.locked && access.teamId ? access.teamId : (filters.teamId || null);
  const personId = access.locked && access.personId ? access.personId : (filters.personId || null);
  if (!cycleId) return { empty: true, reason: "Nenhum ciclo importado.", cycles: [] };

  let grain = "consolidado_total";
  if (personId) grain = null;
  else if (teamId) grain = "consolidado_equipe_total";

  const params = [cycleId];
  let where = "cycle_id = $1";
  if (grain) {
    params.push(grain);
    where += ` AND grain = $${params.length}`;
  } else {
    where += ` AND grain IN ('consolidado', 'consolidado_equipe')`;
  }
  if (teamId && grain !== "consolidado_total") {
    params.push(teamId);
    where += ` AND team_id = $${params.length}`;
  }
  if (personId) {
    params.push(personId);
    where += ` AND person_id = $${params.length} AND grain = CASE
      WHEN EXISTS (
        SELECT 1 FROM adp_facts pref
        WHERE pref.cycle_id = adp_facts.cycle_id AND pref.person_id = adp_facts.person_id AND pref.grain = 'consolidado'
      ) THEN 'consolidado' ELSE 'consolidado_equipe' END`;
  }
  const facts = await db.query(
    `SELECT metric_code, SUM(value)::float AS value FROM adp_facts WHERE ${where} GROUP BY metric_code`,
    params
  );
  const totals = Object.fromEntries(FUNNEL.map((code) => [code, null]));
  for (const row of facts.rows) totals[row.metric_code] = row.value;

  const current = cycles.rows.find((row) => row.id === cycleId);
  const previous = cycles.rows.filter((row) => current?.starts_on && row.ends_on && row.ends_on < current.starts_on).at(-1);
  let previousTotals = null;
  if (previous) {
    const prevParams = [previous.id, ...params.slice(1)];
    const prev = await db.query(
      `SELECT metric_code, SUM(value)::float AS value FROM adp_facts WHERE ${where.replace("cycle_id = $1", "cycle_id = $1")} GROUP BY metric_code`,
      prevParams
    );
    previousTotals = Object.fromEntries(prev.rows.map((row) => [row.metric_code, row.value]));
  }

  const refs = await db.query(`SELECT code, value::float AS value, label FROM adp_parameters WHERE cycle_id = $1 AND kind = 'referencia_minima'`, [cycleId]);
  const refMap = Object.fromEntries(refs.rows.map((row) => [row.code, row.value]));
  const steps = FUNNEL.map((code, index) => {
    const previousCode = FUNNEL[index - 1];
    const conversion = index === 0 ? null : ratio(totals[code], totals[previousCode]);
    const referenceCode = REF_BY_STEP[previousCode];
    const reference = referenceCode ? refMap[referenceCode] ?? null : null;
    return {
      code,
      label: METRIC_LABELS[code],
      value: totals[code],
      conversion,
      reference,
      below: conversion != null && reference != null ? conversion < reference : null
    };
  });

  const projections = await db.query(`SELECT code, label, value::float AS value FROM adp_parameters WHERE cycle_id = $1 AND kind = 'projecao'`, [cycleId]);
  const teams = await db.query(`SELECT id, name FROM teams ORDER BY name`);
  const people = await db.query(
    `SELECT DISTINCT p.id, p.display_name FROM people p
     JOIN adp_facts f ON f.person_id = p.id
     WHERE f.cycle_id = $1 AND ($2::uuid IS NULL OR f.team_id = $2)
     ORDER BY p.display_name`,
    [cycleId, teamId]
  );
  const weeks = await db.query(
    `SELECT period_date, metric_code, SUM(value)::float AS value
     FROM adp_facts
     WHERE cycle_id = $1 AND grain = 'diario' AND ($2::uuid IS NULL OR person_id = $2)
     GROUP BY period_date, metric_code
     ORDER BY period_date`,
    [cycleId, personId]
  );
  return {
    empty: false,
    cycle: current,
    previousCycle: previous || null,
    totals,
    previousTotals,
    steps,
    projections: projections.rows,
    filters: {
      cycles: cycles.rows,
      teams: access.teamId ? teams.rows.filter((row) => row.id === access.teamId) : teams.rows,
      people: people.rows
    },
    weeks: weeks.rows,
    insights: insights(totals, steps, previousTotals)
  };
}

function insights(totals, steps, previous) {
  const notes = [];
  for (const step of steps) {
    if (step.below) notes.push({ level: "atencao", text: `${step.label}: conversão abaixo da referência mínima.` });
  }
  if (Number(totals.ligacoes) > 0 && ratio(totals.aberturas, totals.ligacoes) != null && ratio(totals.aberturas, totals.ligacoes) < 0.01) {
    notes.push({ level: "atencao", text: "Alto volume de ligações com abertura abaixo de 1%." });
  }
  if (Number(totals.formularios) >= 10 && ratio(totals.onlines, totals.formularios) != null && ratio(totals.onlines, totals.formularios) < 0.2) {
    notes.push({ level: "atencao", text: "Há formulários com baixa passagem para online." });
  }
  if (Number(totals.calls_agendadas) >= 5 && ratio(totals.calls_realizadas, totals.calls_agendadas) != null && ratio(totals.calls_realizadas, totals.calls_agendadas) < 0.5) {
    notes.push({ level: "atencao", text: "Muitas calls agendadas e poucas realizadas." });
  }
  if (previous && Number(previous.ligacoes) > 0 && totals.ligacoes != null && Number(totals.ligacoes) < Number(previous.ligacoes) * 0.8) {
    notes.push({ level: "atencao", text: "Ligações caíram mais de 20% em relação ao ciclo anterior." });
  }
  if (Number(totals.vendas) > 0) notes.push({ level: "ok", text: "Há vendas registradas no recorte atual." });
  return notes;
}

async function teamsView(db, cycleId) {
  const rows = await db.query(
    `SELECT t.id, t.name,
            (SELECT COUNT(DISTINCT m.person_id) FROM cycle_memberships m WHERE m.team_id = t.id AND m.cycle_id = $1)::int AS people,
            SUM(CASE WHEN f.metric_code = 'ligacoes' THEN f.value END)::float AS ligacoes,
            SUM(CASE WHEN f.metric_code = 'aberturas' THEN f.value END)::float AS aberturas,
            SUM(CASE WHEN f.metric_code = 'formularios' THEN f.value END)::float AS formularios,
            SUM(CASE WHEN f.metric_code = 'onlines' THEN f.value END)::float AS onlines,
            SUM(CASE WHEN f.metric_code = 'calls_agendadas' THEN f.value END)::float AS calls_agendadas,
            SUM(CASE WHEN f.metric_code = 'calls_realizadas' THEN f.value END)::float AS calls_realizadas,
            SUM(CASE WHEN f.metric_code = 'teste_vocacional' THEN f.value END)::float AS teste_vocacional,
            SUM(CASE WHEN f.metric_code = 'vendas' THEN f.value END)::float AS vendas
     FROM teams t
     LEFT JOIN adp_facts f ON f.team_id = t.id AND f.cycle_id = $1 AND f.grain = 'consolidado_equipe_total'
     GROUP BY t.id, t.name
     ORDER BY t.name`,
    [cycleId]
  );
  return rows.rows;
}

async function personView(db, personId, cycleId) {
  const person = await db.query(`SELECT id, display_name, reconciliation_status FROM people WHERE id = $1`, [personId]);
  const membership = await db.query(
    `SELECT t.name FROM cycle_memberships m JOIN teams t ON t.id = m.team_id WHERE m.person_id = $1 AND m.cycle_id = $2`,
    [personId, cycleId]
  );
  const facts = await db.query(
    `SELECT metric_code, SUM(value)::float AS value FROM adp_facts
     WHERE person_id = $1 AND cycle_id = $2 AND grain = CASE
       WHEN EXISTS (
         SELECT 1 FROM adp_facts pref
         WHERE pref.person_id = adp_facts.person_id AND pref.cycle_id = adp_facts.cycle_id AND pref.grain = 'consolidado'
       ) THEN 'consolidado' ELSE 'consolidado_equipe' END
     GROUP BY metric_code`,
    [personId, cycleId]
  );
  const goals = await db.query(
    `SELECT goal_type, scope, target_value::float AS target, actual_value::float AS actual, unit
     FROM adp_goals WHERE person_id = $1 AND cycle_id = $2`,
    [personId, cycleId]
  );
  const funnel = await db.query(
    `SELECT stage, quantity::float AS quantity, percent_value::float AS percent FROM adp_funnel WHERE person_id = $1 AND cycle_id = $2 ORDER BY stage`,
    [personId, cycleId]
  );
  const weeks = await db.query(
    `SELECT period_date, metric_code, SUM(value)::float AS value FROM adp_facts
     WHERE person_id = $1 AND cycle_id = $2 AND grain = 'diario' GROUP BY period_date, metric_code ORDER BY period_date`,
    [personId, cycleId]
  );
  const notes = await db.query(
    `SELECT n.id, n.kind, n.body, n.created_at, u.name AS author
     FROM adp_notes n LEFT JOIN users u ON u.id = n.author_id
     WHERE n.person_id = $1 ORDER BY n.created_at DESC`,
    [personId]
  );
  const history = await db.query(
    `SELECT c.name, c.starts_on, c.ends_on, f.metric_code, SUM(f.value)::float AS value
     FROM adp_facts f JOIN adp_cycles c ON c.id = f.cycle_id
     WHERE f.person_id = $1 AND f.grain IN ('consolidado', 'consolidado_equipe')
     GROUP BY c.name, c.starts_on, c.ends_on, f.metric_code
     ORDER BY c.starts_on`,
    [personId]
  );
  return {
    person: person.rows[0],
    teams: membership.rows.map((row) => row.name),
    production: Object.fromEntries(facts.rows.map((row) => [row.metric_code, row.value])),
    goals: goals.rows,
    funnel: funnel.rows,
    weeks: weeks.rows,
    notes: notes.rows,
    history: history.rows
  };
}

module.exports = { dashboard, teamsView, personView, METRIC_LABELS };
