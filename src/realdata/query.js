const { query } = require("../db");
const { periodLabel } = require("../excelValue");

const COMMERCIAL_ROLES = new Set(["admin", "diretoria", "gg", "gestor"]);

function assertCommercial(user) {
  if (!COMMERCIAL_ROLES.has(user.role)) {
    const error = new Error("Sem permissão.");
    error.status = 403;
    throw error;
  }
}

function blank(value) {
  return value == null || value === "" ? null : value;
}

function filters(queryParams) {
  return {
    period: blank(queryParams.period),
    manager: blank(queryParams.manager),
    role: blank(queryParams.role),
    personId: blank(queryParams.personId),
    brand: blank(queryParams.brand)
  };
}

async function latestPeriod(table) {
  const row = await query(`SELECT MAX(period_month)::text AS period FROM ${table}`);
  return row.rows[0]?.period || null;
}

async function roiView(user, queryParams) {
  assertCommercial(user);
  const selected = filters(queryParams);
  const periods = await query(`SELECT DISTINCT period_month::text AS period FROM roi_monthly ORDER BY period`);
  const period = selected.period || periods.rows.at(-1)?.period || null;
  const managers = await query(`SELECT DISTINCT manager_name FROM roi_monthly WHERE manager_name IS NOT NULL AND ($1::date IS NULL OR period_month = $1) ORDER BY manager_name`, [period]);
  const roles = await query(`SELECT DISTINCT role_name FROM roi_monthly WHERE role_name IS NOT NULL AND ($1::date IS NULL OR period_month = $1) ORDER BY role_name`, [period]);
  const people = await query(`SELECT id, display_name FROM people WHERE is_master ORDER BY display_name`);
  if (!period) {
    return { empty: true, message: "Sem dados disponíveis", periods: [], period: null, periodLabel: null, rows: [], byManager: [], history: [], kpis: null, filters: { managers: [], roles: [], people: people.rows } };
  }
  const params = [period, selected.manager, selected.role, selected.personId];
  const where = `WHERE m.period_month = $1
    AND ($2::text IS NULL OR m.manager_name = $2)
    AND ($3::text IS NULL OR m.role_name = $3)
    AND ($4::uuid IS NULL OR m.person_id = $4)`;
  const kpis = await query(
    `SELECT COUNT(*)::int AS collaborators,
        COALESCE(SUM(m.gross_revenue), 0) AS gross_revenue,
        COALESCE(SUM(m.total_invested), 0) AS total_invested,
        COALESCE(SUM(m.result_amount), 0) AS result_amount,
        COALESCE(SUM(m.commission), 0) AS commission,
        COALESCE(SUM(m.bonus), 0) AS bonus,
        COALESCE(SUM(m.infrastructure), 0) AS infrastructure,
        AVG(m.roi) AS avg_roi,
        COUNT(*) FILTER (WHERE m.roi > 0)::int AS positive_roi,
        COUNT(*) FILTER (WHERE m.gross_revenue IS NULL OR m.gross_revenue = 0)::int AS without_revenue
     FROM roi_monthly m ${where}`,
    params
  );
  const rows = await query(
    `SELECT p.id, p.display_name, m.role_name, m.manager_name, m.admission_date::text, m.gross_revenue, m.commission,
        m.bonus, m.fixed_cost, m.marketing_allocation, m.infrastructure, m.total_invested, m.gross_profit, m.roi,
        m.roi_percent, m.tenure_text, m.brand_count, m.classification, m.result_amount, p.current_role, p.current_manager_name
     FROM roi_monthly m JOIN people p ON p.id = m.person_id
     ${where}
     ORDER BY m.gross_revenue DESC NULLS LAST, p.display_name`,
    params
  );
  const byManager = await query(
    `SELECT COALESCE(m.manager_name, 'Sem gestor no período') AS manager_name,
        COUNT(*)::int AS collaborators,
        COALESCE(SUM(m.gross_revenue), 0) AS gross_revenue,
        COALESCE(SUM(m.total_invested), 0) AS total_invested,
        COALESCE(SUM(m.result_amount), 0) AS result_amount,
        AVG(m.roi) AS avg_roi
     FROM roi_monthly m ${where}
     GROUP BY m.manager_name
     ORDER BY SUM(m.gross_revenue) DESC NULLS LAST`,
    params
  );
  const history = await query(
    `SELECT period_month::text AS period, AVG(roi) AS avg_roi, COALESCE(SUM(gross_revenue), 0) AS gross_revenue,
        COALESCE(SUM(result_amount), 0) AS result_amount, COUNT(*)::int AS collaborators
     FROM roi_monthly
     GROUP BY period_month
     ORDER BY period_month`
  );
  return {
    empty: rows.rowCount === 0,
    message: rows.rowCount ? null : "Nenhum registro encontrado",
    periods: periods.rows.map((row) => ({ value: row.period, label: periodLabel(row.period) })),
    period,
    periodLabel: periodLabel(period),
    filters: { managers: managers.rows.map((row) => row.manager_name), roles: roles.rows.map((row) => row.role_name), people: people.rows },
    kpis: kpis.rows[0],
    rows: rows.rows,
    byManager: byManager.rows,
    history: history.rows.map((row) => ({ ...row, label: periodLabel(row.period) }))
  };
}

async function peopleList(user, queryParams) {
  assertCommercial(user);
  const latest = await latestPeriod("roi_monthly");
  const rows = await query(
    `SELECT p.id, p.display_name, p.current_role, p.current_manager_name, p.admission_date::text AS admission_date,
        p.structure_source, m.period_month::text AS period, m.tenure_text, m.gross_revenue, m.total_invested,
        m.result_amount, m.roi, m.classification, m.role_name AS period_role, m.manager_name AS period_manager
     FROM people p
     LEFT JOIN roi_monthly m ON m.person_id = p.id AND m.period_month = $1::date
     WHERE p.is_master
       AND ($2::text IS NULL OR p.display_name ILIKE '%' || $2 || '%' OR p.current_role ILIKE '%' || $2 || '%' OR p.current_manager_name ILIKE '%' || $2 || '%')
       AND ($3::text IS NULL OR p.current_manager_name = $3)
       AND ($4::text IS NULL OR p.current_role = $4)
     ORDER BY p.display_name`,
    [latest, queryParams.q || null, queryParams.manager || null, queryParams.role || null]
  );
  return {
    empty: rows.rowCount === 0,
    message: rows.rowCount ? null : "Nenhum colaborador encontrado na base do ROI.",
    period: latest,
    periodLabel: periodLabel(latest),
    total: rows.rowCount,
    people: rows.rows
  };
}

async function personDetail(user, id) {
  if (user.role === "colaborador" && user.person_id !== id) {
    const error = new Error("Sem permissão.");
    error.status = 403;
    throw error;
  }
  if (!COMMERCIAL_ROLES.has(user.role) && user.role !== "colaborador") {
    const error = new Error("Sem permissão.");
    error.status = 403;
    throw error;
  }
  const person = await query(
    `SELECT id, display_name, current_role, current_manager_name, admission_date::text AS admission_date, structure_source, is_master
     FROM people WHERE id = $1`,
    [id]
  );
  if (!person.rowCount || !person.rows[0].is_master) return null;
  const history = await query(
    `SELECT period_month::text AS period, role_name, manager_name, gross_revenue, total_invested, result_amount, roi, classification, tenure_text
     FROM roi_monthly WHERE person_id = $1 ORDER BY period_month`,
    [id]
  );
  const sales = await query(
    `SELECT period_month::text AS period, total_amount FROM sales_monthly WHERE person_id = $1 ORDER BY period_month`,
    [id]
  );
  return {
    person: person.rows[0],
    history: history.rows.map((row) => ({ ...row, label: periodLabel(row.period) })),
    sales: sales.rows.map((row) => ({ ...row, label: periodLabel(row.period) })),
    unavailable: {
      trilhas: "Sem registros.",
      treinamentos: "Sem registros.",
      compliance: "Sem registros.",
      oneOnOne: "Sem registros.",
      pdi: "Sem registros."
    }
  };
}

async function salesView(user, queryParams) {
  assertCommercial(user);
  const selected = filters(queryParams);
  const periods = await query(`SELECT DISTINCT period_month::text AS period FROM sales_monthly ORDER BY period`);
  const period = selected.period || periods.rows.at(-1)?.period || null;
  const people = await query(`SELECT id, display_name FROM people WHERE is_master ORDER BY display_name`);
  const managers = await query(`SELECT DISTINCT current_manager_name FROM people WHERE is_master AND current_manager_name IS NOT NULL ORDER BY current_manager_name`);
  if (!period) {
    return { empty: true, message: "Sem dados disponíveis", periods: [], period: null, note: "Não há meta cadastrada. Esta tela mostra somente o realizado." };
  }
  const params = [period, selected.manager, selected.personId, selected.brand];
  const where = `WHERE s.period_month = $1
    AND ($2::text IS NULL OR p.current_manager_name = $2)
    AND ($3::uuid IS NULL OR s.person_id = $3)`;
  const kpis = await query(
    `SELECT COALESCE(SUM(s.total_amount), 0) AS revenue,
        COUNT(*) FILTER (WHERE s.total_amount > 0)::int AS collaborators_with_revenue,
        COUNT(*)::int AS collaborators
     FROM sales_monthly s LEFT JOIN people p ON p.id = s.person_id
     ${where}`,
    params.slice(0, 3)
  );
  const transactions = await query(
    `SELECT COUNT(*)::int AS transactions, COALESCE(SUM(t.revenue), 0) AS revenue
     FROM sales_transactions t LEFT JOIN people p ON p.id = t.person_id
     WHERE t.period_month = $1
       AND ($2::text IS NULL OR p.current_manager_name = $2)
       AND ($3::uuid IS NULL OR t.person_id = $3)`,
    params.slice(0, 3)
  );
  const ranking = await query(
    `SELECT p.id, COALESCE(p.display_name, s.raw_name) AS display_name, p.current_role, p.current_manager_name,
        s.total_amount, s.reconciliation_status
     FROM sales_monthly s LEFT JOIN people p ON p.id = s.person_id
     ${where}
     ORDER BY s.total_amount DESC NULLS LAST, display_name`,
    params.slice(0, 3)
  );
  const byManager = await query(
    `SELECT COALESCE(p.current_manager_name, 'Sem gestor atual') AS manager_name,
        COALESCE(SUM(s.total_amount), 0) AS revenue,
        COUNT(*) FILTER (WHERE s.total_amount > 0)::int AS collaborators_with_revenue
     FROM sales_monthly s LEFT JOIN people p ON p.id = s.person_id
     ${where}
     GROUP BY p.current_manager_name
     ORDER BY SUM(s.total_amount) DESC NULLS LAST`,
    params.slice(0, 3)
  );
  const byBrand = await query(
    `SELECT b.brand, COALESCE(SUM(b.amount), 0) AS amount
     FROM sales_brand_monthly b
     JOIN sales_monthly s ON s.id = b.sales_monthly_id
     LEFT JOIN people p ON p.id = s.person_id
     ${where}
       AND ($4::text IS NULL OR b.brand = $4)
       AND b.amount IS NOT NULL AND b.amount <> 0
     GROUP BY b.brand
     ORDER BY SUM(b.amount) DESC`,
    params
  );
  const evolution = await query(
    `SELECT period_month::text AS period, COALESCE(SUM(total_amount), 0) AS revenue,
        COUNT(*) FILTER (WHERE total_amount > 0)::int AS collaborators_with_revenue
     FROM sales_monthly GROUP BY period_month ORDER BY period_month`
  );
  const detail = await query(
    `SELECT t.id, COALESCE(p.display_name, t.raw_name) AS display_name, t.period_month::text AS period, t.revenue,
        t.franchise, t.franchisee, t.signal_value, t.signal_date::text AS signal_date, t.closing_value,
        t.closing_date::text AS closing_date, t.reconciliation_status
     FROM sales_transactions t LEFT JOIN people p ON p.id = t.person_id
     WHERE t.period_month = $1
       AND ($2::text IS NULL OR p.current_manager_name = $2)
       AND ($3::uuid IS NULL OR t.person_id = $3)
     ORDER BY t.revenue DESC NULLS LAST, display_name`,
    params.slice(0, 3)
  );
  return {
    empty: false,
    note: "Não há meta cadastrada. Os valores abaixo são realizado.",
    periods: periods.rows.map((row) => ({ value: row.period, label: periodLabel(row.period) })),
    period,
    periodLabel: periodLabel(period),
    filters: { managers: managers.rows.map((row) => row.current_manager_name), people: people.rows },
    kpis: { ...kpis.rows[0], transactions: transactions.rows[0].transactions },
    ranking: ranking.rows,
    byManager: byManager.rows,
    byBrand: byBrand.rows,
    evolution: evolution.rows.map((row) => ({ ...row, label: periodLabel(row.period) })),
    transactions: detail.rows
  };
}

async function homeView(user, ticketKpis) {
  const base = {
    chamadosAbertos: ticketKpis.backlog,
    chamadosCriticos: ticketKpis.criticos,
    aguardandoAtribuicao: ticketKpis.aguardandoAtribuicao,
    comercial: COMMERCIAL_ROLES.has(user.role)
  };
  if (!base.comercial) return { ...base, ultimoPeriodo: null, receita: null, roiMedio: null, colaboradores: null, vendas: null };
  try {
    const period = await latestPeriod("roi_monthly");
    if (!period) return { ...base, ultimoPeriodo: null, ultimoPeriodoIso: null, receita: null, roiMedio: null, colaboradores: null, vendas: null, message: "Sem dados disponíveis" };
    const roi = await query(
      `SELECT AVG(roi) AS avg_roi, COUNT(*)::int AS collaborators FROM roi_monthly WHERE period_month = $1`,
      [period]
    );
    const sales = await query(
      `SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM sales_monthly WHERE period_month = $1`,
      [period]
    );
    const tx = await query(`SELECT COUNT(*)::int AS transactions FROM sales_transactions WHERE period_month = $1`, [period]);
    const people = await query(`SELECT COUNT(*)::int AS total FROM people WHERE is_master`);
    return {
      ...base,
      ultimoPeriodo: periodLabel(period),
      ultimoPeriodoIso: period,
      receita: sales.rows[0].revenue,
      vendas: tx.rows[0].transactions,
      roiMedio: roi.rows[0].avg_roi,
      colaboradores: people.rows[0].total
    };
  } catch (error) {
    if (error.code === "42P01") return { ...base, ultimoPeriodo: null, receita: null, roiMedio: null, colaboradores: null, vendas: null, message: "Sem dados disponíveis" };
    throw error;
  }
}

module.exports = { roiView, peopleList, personDetail, salesView, homeView, COMMERCIAL_ROLES };
