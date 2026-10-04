const crypto = require("crypto");
const { parseCatalog } = require("./catalogParse");
const { audit } = require("../audit");

async function importCatalog(client, buffer, filename, userId, { force = false } = {}) {
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const previous = await client.query(
    `SELECT id, finished_at FROM import_batches WHERE kind = 'tickets' AND sha256 = $1 AND status = 'completed' ORDER BY finished_at DESC LIMIT 1`,
    [sha256]
  );
  if (previous.rowCount && !force) return { alreadyImported: true, batchId: previous.rows[0].id };
  const parsed = parseCatalog(buffer);
  const batch = await client.query(
    `INSERT INTO import_batches (kind, filename, byte_size, sha256, status, forced, created_by, summary)
     VALUES ('tickets', $1, $2, $3, 'running', $4, $5, '{}'::jsonb) RETURNING id`,
    [filename, buffer.length, sha256, force, userId || null]
  );
  const batchId = batch.rows[0].id;
  const areaIds = new Map();
  for (const reason of parsed.reasons) {
    if (areaIds.has(reason.area)) continue;
    const row = await client.query(
      `INSERT INTO ticket_areas (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [reason.area]
    );
    areaIds.set(reason.area, row.rows[0].id);
  }
  let created = 0;
  let updated = 0;
  for (const reason of parsed.reasons) {
    const existing = await client.query(
      `SELECT id FROM ticket_reasons WHERE area_id = $1 AND source_sheet = $2 AND source_row = $3`,
      [areaIds.get(reason.area), reason.sourceSheet, reason.sourceRow]
    );
    if (existing.rowCount) {
      await client.query(
        `UPDATE ticket_reasons SET catalog_code = $2, title = $3, when_to_use = $4, default_type = $5, default_priority = $6,
         sla_owner = $7, validation_status = $8, adjustment_note = $9, is_restricted = $10, config_pending = $11, pending_fields = $12
         WHERE id = $1`,
        [existing.rows[0].id, reason.code, reason.title, reason.whenToUse, reason.defaultType, reason.defaultPriority, reason.slaOwner, reason.validationStatus, reason.adjustmentNote, reason.isRestricted, reason.configPending, reason.pendingFields]
      );
      updated += 1;
    } else {
      await client.query(
        `INSERT INTO ticket_reasons
          (area_id, catalog_code, title, when_to_use, default_type, default_priority, sla_owner, validation_status, adjustment_note, is_restricted, config_pending, pending_fields, source_sheet, source_row)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [areaIds.get(reason.area), reason.code, reason.title, reason.whenToUse, reason.defaultType, reason.defaultPriority, reason.slaOwner, reason.validationStatus, reason.adjustmentNote, reason.isRestricted, reason.configPending, reason.pendingFields, reason.sourceSheet, reason.sourceRow]
      );
      created += 1;
    }
  }
  for (const policy of parsed.policies) {
    await client.query(
      `INSERT INTO sla_policies (code, label, first_response_text, resolution_text, counting_text, first_response_minutes, resolution_minutes, use_business_hours, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (code) DO UPDATE SET
         label = EXCLUDED.label, first_response_text = EXCLUDED.first_response_text, resolution_text = EXCLUDED.resolution_text,
         counting_text = EXCLUDED.counting_text, first_response_minutes = EXCLUDED.first_response_minutes,
         resolution_minutes = EXCLUDED.resolution_minutes, use_business_hours = EXCLUDED.use_business_hours`,
      [policy.code, policy.label, policy.firstResponseText, policy.resolutionText, policy.countingText, policy.firstResponseMinutes, policy.resolutionMinutes, policy.useBusinessHours, Number(policy.code.slice(1))]
    );
  }
  for (const cell of parsed.matrix) {
    await client.query(
      `INSERT INTO priority_matrix (impact, urgency, priority_code) VALUES ($1, $2, $3)
       ON CONFLICT (impact, urgency) DO UPDATE SET priority_code = EXCLUDED.priority_code`,
      [cell.impact, cell.urgency, cell.priority]
    );
  }
  await client.query(`DELETE FROM ticket_rules`);
  for (const rule of parsed.rules) {
    await client.query(
      `INSERT INTO ticket_rules (theme, rule_text, reason, validation_status, source_sheet, source_row) VALUES ($1,$2,$3,$4,$5,$6)`,
      [rule.theme, rule.ruleText, rule.reason, rule.validationStatus, rule.sourceSheet, rule.sourceRow]
    );
  }
  const pending = parsed.reasons.filter((reason) => reason.configPending).length;
  const summary = {
    declaredTotal: parsed.meta.declaredTotal,
    areas: areaIds.size,
    reasons: parsed.reasons.length,
    pending,
    restricted: parsed.reasons.filter((reason) => reason.isRestricted).length,
    policies: parsed.policies.map((policy) => policy.code),
    matrix: parsed.matrix.length,
    rules: parsed.rules.length
  };
  await client.query(
    `UPDATE import_batches SET status = 'completed', created_count = $2, updated_count = $3, warning_count = $4, summary = $5::jsonb, finished_at = now() WHERE id = $1`,
    [batchId, created, updated, pending, JSON.stringify(summary)]
  );
  await audit(userId, "import.tickets", "import_batch", batchId, null, summary, client);
  return { alreadyImported: false, batchId, summary, preview: parsed };
}

module.exports = { importCatalog };
