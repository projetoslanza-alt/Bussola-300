const crypto = require("crypto");
const { buildPlan } = require("./parse");
const { parseCatalog } = require("../tickets/catalogParse");
const { importCatalog } = require("../tickets/store");

async function openBatch(client, kind, filename, buffer, userId) {
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const row = await client.query(
    `INSERT INTO import_batches (kind, filename, byte_size, sha256, status, created_by, summary)
     VALUES ($1, $2, $3, $4, 'running', $5, '{}'::jsonb) RETURNING id`,
    [kind, filename, buffer.length, sha256, userId || null]
  );
  return { id: row.rows[0].id, sha256 };
}

async function finishBatch(client, batchId, counts, summary) {
  await client.query(
    `UPDATE import_batches
     SET status = 'completed', created_count = $2, updated_count = $3, ignored_count = $4,
         error_count = $5, warning_count = $6, summary = $7::jsonb, finished_at = now()
     WHERE id = $1`,
    [batchId, counts.created || 0, counts.updated || 0, counts.ignored || 0, counts.errors || 0, counts.pending || 0, JSON.stringify(summary)]
  );
}

async function upsertPerson(client, person) {
  const existing = await client.query(
    `SELECT id, is_master FROM people WHERE match_key = $1 ORDER BY created_at LIMIT 1`,
    [person.key]
  );
  if (existing.rowCount) {
    const row = await client.query(
      `UPDATE people
       SET display_name = $2, is_master = true, admission_date = COALESCE($3, admission_date),
           current_role = COALESCE($4, current_role), structure_source = COALESCE(structure_source, 'roi')
       WHERE id = $1 RETURNING id`,
      [existing.rows[0].id, person.displayName, person.latest.admissionDate, person.latest.role]
    );
    return { id: row.rows[0].id, created: !existing.rows[0].is_master && false, updated: true, wasMaster: existing.rows[0].is_master };
  }
  const inserted = await client.query(
    `INSERT INTO people (display_name, match_key, reconciliation_status, is_master, admission_date, current_role, structure_source)
     VALUES ($1, $2, 'confirmed', true, $3, $4, 'roi') RETURNING id`,
    [person.displayName, person.key, person.latest.admissionDate, person.latest.role]
  );
  await client.query(
    `INSERT INTO person_aliases (person_id, alias_name, alias_key, source)
     VALUES ($1, $2, $3, 'roi')
     ON CONFLICT (alias_key) DO NOTHING`,
    [inserted.rows[0].id, person.displayName, person.key]
  );
  return { id: inserted.rows[0].id, created: true, updated: false, wasMaster: false };
}

async function upsertRoi(client, personId, row, batchId) {
  const existing = await client.query(
    `SELECT id FROM roi_monthly WHERE person_id = $1 AND period_month = $2`,
    [personId, row.period]
  );
  const params = [
    personId, row.period, row.role, row.admissionDate, row.managerName, row.grossRevenue, row.commission,
    row.bonus, row.fixedCost, row.marketingAllocation, row.infrastructure, row.totalInvested, row.grossProfit,
    row.roi, row.roiPercent, row.tenureText, row.brandCount, row.classification, row.resultAmount,
    row.sourceSheet, row.sourceRow, batchId
  ];
  if (existing.rowCount) {
    await client.query(
      `UPDATE roi_monthly SET role_name=$3, admission_date=$4, manager_name=$5, gross_revenue=$6, commission=$7,
        bonus=$8, fixed_cost=$9, marketing_allocation=$10, infrastructure=$11, total_invested=$12, gross_profit=$13,
        roi=$14, roi_percent=$15, tenure_text=$16, brand_count=$17, classification=$18, result_amount=$19,
        source_sheet=$20, source_row=$21, batch_id=$22, updated_at=now()
       WHERE person_id=$1 AND period_month=$2`,
      params
    );
    return false;
  }
  await client.query(
    `INSERT INTO roi_monthly (
      person_id, period_month, role_name, admission_date, manager_name, gross_revenue, commission, bonus,
      fixed_cost, marketing_allocation, infrastructure, total_invested, gross_profit, roi, roi_percent,
      tenure_text, brand_count, classification, result_amount, source_sheet, source_row, batch_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
    params
  );
  return true;
}

async function importRealData(client, sources, userId) {
  const plan = buildPlan(sources.buffers);
  if (!plan.roi.people.length) throw new Error("Nenhum colaborador encontrado na base de ROI.");
  if (!plan.salesMonthly.length) throw new Error("Nenhuma venda mensal encontrada.");
  if (!plan.transactions.length) throw new Error("Nenhuma transação de venda encontrada.");
  const roiBatch = await openBatch(client, "roi", sources.names.roi, sources.buffers.roi, userId);
  const teamBatch = await openBatch(client, "equipe", sources.names.team, sources.buffers.team, userId);
  const salesBatch = await openBatch(client, "vendas", sources.names.sales, sources.buffers.sales, userId);

  const ids = new Map();
  let created = 0;
  let updated = 0;
  for (const person of plan.roi.people) {
    const saved = await upsertPerson(client, person);
    ids.set(person.key, saved.id);
    if (saved.created) created += 1;
    else updated += 1;
  }

  let roiInserted = 0;
  let roiUpdated = 0;
  for (const row of plan.roi.monthly) {
    const inserted = await upsertRoi(client, ids.get(row.key), row, roiBatch.id);
    if (inserted) roiInserted += 1;
    else roiUpdated += 1;
  }

  for (const row of plan.roi.totals) {
    const personId = ids.get(row.key);
    if (!personId) continue;
    await client.query(
      `INSERT INTO roi_collaborator_totals (
        person_id, role_name, manager_name, gross_revenue, commission, bonus, fixed_cost, marketing_allocation,
        infrastructure, total_invested, roi, tenure_text, brand_count, result_amount, source_sheet, source_row, batch_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (person_id) DO UPDATE SET
        role_name = EXCLUDED.role_name, manager_name = EXCLUDED.manager_name, gross_revenue = EXCLUDED.gross_revenue,
        commission = EXCLUDED.commission, bonus = EXCLUDED.bonus, fixed_cost = EXCLUDED.fixed_cost,
        marketing_allocation = EXCLUDED.marketing_allocation, infrastructure = EXCLUDED.infrastructure,
        total_invested = EXCLUDED.total_invested, roi = EXCLUDED.roi, tenure_text = EXCLUDED.tenure_text,
        brand_count = EXCLUDED.brand_count, result_amount = EXCLUDED.result_amount, source_sheet = EXCLUDED.source_sheet,
        source_row = EXCLUDED.source_row, batch_id = EXCLUDED.batch_id, updated_at = now()`,
      [personId, row.role, row.managerName, row.grossRevenue, row.commission, row.bonus, row.fixedCost, row.marketingAllocation, row.infrastructure, row.totalInvested, row.roi, row.tenureText, row.brandCount, row.resultAmount, row.sourceSheet, row.sourceRow, roiBatch.id]
    );
  }

  let teamMatched = 0;
  for (const row of plan.teamMatched) {
    const personId = ids.get(row.key);
    const managerId = row.managerKey ? ids.get(row.managerKey) || null : null;
    await client.query(
      `UPDATE people
       SET current_role = COALESCE($2, current_role), current_manager_name = $3, current_manager_id = $4, structure_source = 'equipe'
       WHERE id = $1`,
      [personId, row.role, row.managerName, managerId]
    );
    teamMatched += 1;
  }

  let salesInserted = 0;
  let salesUpdated = 0;
  const salesKeys = [];
  const salesPeriods = [];
  for (const row of plan.salesMonthly) {
    const personId = ids.get(row.key) || null;
    const existing = await client.query(
      `SELECT id FROM sales_monthly WHERE match_key = $1 AND period_month = $2`,
      [row.key, row.period]
    );
    let salesId;
    if (existing.rowCount) {
      salesId = existing.rows[0].id;
      await client.query(
        `UPDATE sales_monthly SET person_id=$2, raw_name=$3, role_name=$4, total_amount=$5, reconciliation_status=$6,
          source_sheet=$7, source_row=$8, batch_id=$9, updated_at=now()
         WHERE id=$1`,
        [salesId, personId, row.displayName, row.role, row.totalAmount, row.reconciliationStatus, row.sourceSheet, row.sourceRow, salesBatch.id]
      );
      salesUpdated += 1;
    } else {
      const inserted = await client.query(
        `INSERT INTO sales_monthly (person_id, raw_name, match_key, period_month, role_name, total_amount, reconciliation_status, source_sheet, source_row, batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [personId, row.displayName, row.key, row.period, row.role, row.totalAmount, row.reconciliationStatus, row.sourceSheet, row.sourceRow, salesBatch.id]
      );
      salesId = inserted.rows[0].id;
      salesInserted += 1;
    }
    await client.query(`DELETE FROM sales_brand_monthly WHERE sales_monthly_id = $1`, [salesId]);
    for (const brand of row.brands) {
      if (brand.amount == null) continue;
      await client.query(
        `INSERT INTO sales_brand_monthly (sales_monthly_id, brand, amount) VALUES ($1,$2,$3)
         ON CONFLICT (sales_monthly_id, brand) DO UPDATE SET amount = EXCLUDED.amount`,
        [salesId, brand.brand, brand.amount]
      );
    }
    salesKeys.push(row.key);
    salesPeriods.push(row.period);
  }
  await client.query(
    `DELETE FROM sales_monthly sm
     WHERE NOT EXISTS (
       SELECT 1 FROM unnest($1::text[], $2::date[]) AS incoming(match_key, period_month)
       WHERE incoming.match_key = sm.match_key AND incoming.period_month = sm.period_month
     )`,
    [salesKeys, salesPeriods]
  );

  const naturalKeys = [];
  let txInserted = 0;
  let txUpdated = 0;
  for (const row of plan.transactions) {
    const personId = ids.get(row.key) || null;
    const existing = await client.query(`SELECT id FROM sales_transactions WHERE natural_key = $1`, [row.naturalKey]);
    const params = [personId, row.displayName, row.key, row.period, row.revenue, row.franchise, row.franchisee, row.signalValue, row.signalDate, row.closingValue, row.closingDate, row.reconciliationStatus, row.naturalKey, row.sourceSheet, row.sourceRow, salesBatch.id];
    if (existing.rowCount) {
      await client.query(
        `UPDATE sales_transactions SET person_id=$1, raw_name=$2, match_key=$3, period_month=$4, revenue=$5, franchise=$6,
          franchisee=$7, signal_value=$8, signal_date=$9, closing_value=$10, closing_date=$11, reconciliation_status=$12,
          source_sheet=$14, source_row=$15, batch_id=$16, updated_at=now()
         WHERE natural_key=$13`,
        params
      );
      txUpdated += 1;
    } else {
      await client.query(
        `INSERT INTO sales_transactions (
          person_id, raw_name, match_key, period_month, revenue, franchise, franchisee, signal_value, signal_date,
          closing_value, closing_date, reconciliation_status, natural_key, source_sheet, source_row, batch_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        params
      );
      txInserted += 1;
    }
    naturalKeys.push(row.naturalKey);
  }
  await client.query(
    `DELETE FROM sales_transactions WHERE NOT (natural_key = ANY($1::text[]))`,
    [naturalKeys]
  );

  for (const issue of plan.issues) {
    const batchId = issue.source === "equipe" ? teamBatch.id : salesBatch.id;
    await client.query(
      `INSERT INTO import_issues (batch_id, kind, source, sheet, source_row, raw_name, period_month, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [batchId, issue.kind, issue.source, issue.sheet, issue.sourceRow, issue.rawName, issue.period || null, issue.message]
    );
  }

  const teamPending = plan.issues.filter((issue) => issue.kind === "equipe_sem_roi");
  const salesPending = plan.issues.filter((issue) => issue.kind === "venda_sem_roi");
  const summary = {
    colaboradoresRoi: plan.roi.people.length,
    colaboradoresCriados: created,
    colaboradoresAtualizados: updated,
    equipeConciliada: teamMatched,
    equipeSemMatch: teamPending.length,
    equipeSemMatchNomes: teamPending.map((issue) => issue.rawName),
    registrosRoi: plan.roi.monthly.length,
    roiInseridos: roiInserted,
    roiAtualizados: roiUpdated,
    registrosVendas: plan.salesMonthly.length,
    vendasInseridas: salesInserted,
    vendasAtualizadas: salesUpdated,
    transacoes: plan.transactions.length,
    transacoesInseridas: txInserted,
    transacoesAtualizadas: txUpdated,
    vendasSemMatch: salesPending.length,
    meses: plan.roi.months,
    pendencias: plan.issues.length
  };
  await finishBatch(client, roiBatch.id, { created, updated, ignored: plan.roi.ignored, pending: 0 }, summary);
  await finishBatch(client, teamBatch.id, { created: 0, updated: teamMatched, pending: teamPending.length }, { semMatch: summary.equipeSemMatchNomes });
  await finishBatch(client, salesBatch.id, { created: salesInserted + txInserted, updated: salesUpdated + txUpdated, pending: salesPending.length }, summary);
  return { plan, summary, batches: { roi: roiBatch.id, team: teamBatch.id, sales: salesBatch.id } };
}

async function importCatalogFile(buffer, filename, userId) {
  const parsed = parseCatalog(buffer);
  const { withTransaction } = require("../db");
  const stored = await withTransaction((client) => importCatalog(client, buffer, filename, userId, { force: false }));
  return {
    stored,
    reasons: parsed.reasons.length,
    declaredTotal: parsed.meta.declaredTotal,
    ignored: parsed.audit.filter((row) => !row.imported).length,
    pending: parsed.reasons.filter((reason) => reason.configPending).length,
    policies: parsed.policies.map((policy) => policy.code)
  };
}

module.exports = { importRealData, importCatalogFile };
