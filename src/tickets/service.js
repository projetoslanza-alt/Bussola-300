const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { query } = require("../db");
const { audit } = require("../audit");
const { normalizeImpact, normalizeUrgency, resolvePriority } = require("./priority");
const { addBusinessMinutes, overlapMinutes, calendarFromRow } = require("./businessTime");
const { UPLOAD_DIR } = require("../config");

const STATUSES = ["ABERTO", "EM_TRIAGEM", "EM_ATENDIMENTO", "AGUARDANDO_SOLICITANTE", "AGUARDANDO_TERCEIRO", "RESOLVIDO", "CANCELADO"];

function canSee(user, ticket) {
  if (!ticket) return false;
  if (["admin", "diretoria"].includes(user.role)) return true;
  if (ticket.requester_id === user.id || ticket.assignee_id === user.id) return true;
  if (ticket.viewer_ids?.includes(user.id)) return true;
  if (ticket.is_restricted) return false;
  if (user.role === "gg") return true;
  return false;
}

function canMove(user, ticket) {
  return user.role === "admin" || ticket.assignee_id === user.id;
}

async function calendar() {
  const row = await query(`SELECT timezone, work_start::text, work_end::text, work_days FROM business_calendar WHERE id = 1`);
  const holidays = await query(`SELECT day::text FROM holidays`);
  return { calendar: calendarFromRow(row.rows[0]), holidays: new Set(holidays.rows.map((item) => item.day)) };
}

async function dueDates(priority, from) {
  const policy = await query(`SELECT * FROM sla_policies WHERE code = $1`, [priority]);
  const spec = policy.rows[0];
  if (!spec) return { first: null, resolution: null, policy: null };
  const time = await calendar();
  const first = spec.first_response_minutes ? addBusinessMinutes(from, spec.first_response_minutes, time.calendar, time.holidays) : null;
  const resolution = spec.resolution_minutes ? addBusinessMinutes(from, spec.resolution_minutes, time.calendar, time.holidays) : null;
  return { first, resolution, policy: spec };
}

async function createTicket(user, input) {
  const required = ["areaId", "reasonId", "title", "expectedResult", "context", "impact", "urgency", "neededOn", "origin"];
  for (const field of required) {
    if (!input[field] || !String(input[field]).trim()) {
      const error = new Error(`Campo obrigatório: ${field}`);
      error.status = 400;
      throw error;
    }
  }
  const reason = await query(`SELECT * FROM ticket_reasons WHERE id = $1 AND active = true`, [input.reasonId]);
  if (!reason.rowCount || reason.rows[0].area_id !== input.areaId) {
    const error = new Error("Motivo não pertence à área selecionada.");
    error.status = 400;
    throw error;
  }
  const impact = normalizeImpact(input.impact);
  const urgency = normalizeUrgency(input.urgency);
  const matrix = await query(`SELECT priority_code FROM priority_matrix WHERE impact = $1 AND urgency = $2`, [impact, urgency]);
  const priority = resolvePriority(reason.rows[0].default_priority, matrix.rows[0]?.priority_code || null);
  if (!priority) {
    const error = new Error("Não há prioridade padrão nem resultado de matriz para este chamado.");
    error.status = 400;
    throw error;
  }
  const origin = await query(`SELECT name FROM ticket_origins WHERE name = $1 AND active`, [input.origin]);
  if (!origin.rowCount) {
    const error = new Error("Origem inválida.");
    error.status = 400;
    throw error;
  }
  if (input.origin === "Reunião" && !input.meetingName) {
    const error = new Error("Informe o nome da reunião.");
    error.status = 400;
    throw error;
  }
  const now = new Date();
  const sla = await dueDates(priority, now);
  const number = await query(`SELECT 'CH-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad((COUNT(*) + 1)::text, 4, '0') AS number FROM tickets`);
  const assignee = reason.rows[0].default_assignee_id;
  const inserted = await query(
    `INSERT INTO tickets
      (number, title, expected_result, context, area_id, reason_id, impact, urgency, priority_code, priority_from_reason, priority_from_matrix,
       status, origin, needed_on, meeting_name, meeting_date, meeting_link, client_name, sale_ref, related_person, links, observations,
       requester_id, assignee_id, is_restricted, first_response_due_at, resolution_due_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'ABERTO',$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
     RETURNING *`,
    [
      number.rows[0].number, input.title.trim(), input.expectedResult.trim(), input.context.trim(), input.areaId, input.reasonId,
      impact, urgency, priority, reason.rows[0].default_priority, matrix.rows[0]?.priority_code || null, input.origin, input.neededOn,
      input.meetingName || null, input.meetingDate || null, input.meetingLink || null, input.clientName || null, input.saleRef || null,
      input.relatedPerson || null, input.links || null, input.observations || null, user.id, assignee, reason.rows[0].is_restricted,
      sla.first, sla.resolution
    ]
  );
  const ticket = inserted.rows[0];
  await query(
    `INSERT INTO ticket_events (ticket_id, user_id, event_type, to_value, note) VALUES ($1, $2, 'criado', 'ABERTO', $3)`,
    [ticket.id, user.id, assignee ? "Responsável padrão atribuído." : "Aguardando atribuição."]
  );
  await audit(user.id, "ticket.create", "ticket", ticket.id, null, { number: ticket.number, priority });
  return ticket;
}

async function listTickets(user, filters) {
  const rows = await query(
    `SELECT t.*, a.name AS area_name, r.title AS reason_title, r.catalog_code, ru.name AS requester_name, au.name AS assignee_name,
            COALESCE((SELECT array_agg(user_id) FROM ticket_viewers v WHERE v.ticket_id = t.id), '{}') AS viewer_ids
     FROM tickets t
     JOIN ticket_areas a ON a.id = t.area_id
     JOIN ticket_reasons r ON r.id = t.reason_id
     JOIN users ru ON ru.id = t.requester_id
     LEFT JOIN users au ON au.id = t.assignee_id
     WHERE ($1::text IS NULL OR t.status = $1)
       AND ($2::text IS NULL OR t.priority_code = $2)
       AND ($3::uuid IS NULL OR t.area_id = $3)
       AND ($4::uuid IS NULL OR t.reason_id = $4)
       AND ($5::uuid IS NULL OR t.assignee_id = $5)
       AND ($6::uuid IS NULL OR t.requester_id = $6)
     ORDER BY t.created_at DESC`,
    [filters.status || null, filters.priority || null, filters.areaId || null, filters.reasonId || null, filters.assigneeId || null, filters.requesterId || null]
  );
  return rows.rows.filter((ticket) => canSee(user, ticket)).map(present);
}

function present(ticket, { full = false } = {}) {
  const hidden = ticket.is_restricted && !full;
  return {
    id: ticket.id,
    number: ticket.number,
    title: hidden ? "Chamado restrito" : ticket.title,
    status: ticket.status,
    priority: ticket.priority_code,
    area: ticket.area_name,
    reason: hidden ? null : ticket.reason_title,
    code: ticket.catalog_code,
    requester: hidden ? null : ticket.requester_name,
    assignee: ticket.assignee_name,
    awaitingAssignment: !ticket.assignee_id,
    neededOn: ticket.needed_on,
    createdAt: ticket.created_at,
    isRestricted: ticket.is_restricted,
    reopenCount: ticket.reopen_count,
    firstResponseDueAt: ticket.first_response_due_at,
    firstResponseAt: ticket.first_response_at,
    resolutionDueAt: ticket.resolution_due_at,
    resolvedAt: ticket.resolved_at
  };
}

async function ticketDetail(user, id) {
  const row = await query(
    `SELECT t.*, a.name AS area_name, r.title AS reason_title, r.catalog_code, r.when_to_use, r.default_type, ru.name AS requester_name, au.name AS assignee_name,
            COALESCE((SELECT array_agg(user_id) FROM ticket_viewers v WHERE v.ticket_id = t.id), '{}') AS viewer_ids
     FROM tickets t
     JOIN ticket_areas a ON a.id = t.area_id
     JOIN ticket_reasons r ON r.id = t.reason_id
     JOIN users ru ON ru.id = t.requester_id
     LEFT JOIN users au ON au.id = t.assignee_id
     WHERE t.id = $1`,
    [id]
  );
  const ticket = row.rows[0];
  if (!ticket || !canSee(user, ticket)) return null;
  const events = await query(
    `SELECT e.event_type, e.from_value, e.to_value, e.note, e.created_at, u.name AS author
     FROM ticket_events e LEFT JOIN users u ON u.id = e.user_id WHERE e.ticket_id = $1 ORDER BY e.created_at`,
    [id]
  );
  const comments = await query(
    `SELECT c.body, c.created_at, u.name AS author FROM ticket_comments c JOIN users u ON u.id = c.user_id WHERE c.ticket_id = $1 ORDER BY c.created_at`,
    [id]
  );
  const pauses = await query(`SELECT started_at, ended_at, reason FROM ticket_pauses WHERE ticket_id = $1 ORDER BY started_at`, [id]);
  const attachments = await query(`SELECT id, original_name, byte_size, created_at FROM ticket_attachments WHERE ticket_id = $1`, [id]);
  const time = await calendar();
  const pausesOpen = pauses.rows.map((pause) => ({ startedAt: pause.started_at, endedAt: pause.ended_at || new Date() }));
  const consumed = overlapMinutes(ticket.created_at, ticket.resolved_at || new Date(), pausesOpen, time.calendar, time.holidays);
  const full = canSee(user, ticket);
  return {
    ...present(ticket, { full }),
    expectedResult: ticket.expected_result,
    context: ticket.context,
    impact: ticket.impact,
    urgency: ticket.urgency,
    origin: ticket.origin,
    meetingName: ticket.meeting_name,
    meetingDate: ticket.meeting_date,
    meetingLink: ticket.meeting_link,
    clientName: ticket.client_name,
    saleRef: ticket.sale_ref,
    relatedPerson: ticket.related_person,
    links: ticket.links,
    observations: ticket.observations,
    resolutionText: ticket.resolution_text,
    whenToUse: ticket.when_to_use,
    type: ticket.default_type,
    priorityFromReason: ticket.priority_from_reason,
    priorityFromMatrix: ticket.priority_from_matrix,
    canMove: canMove(user, ticket),
    canComment: ticket.requester_id === user.id || canMove(user, ticket) || user.role === "diretoria",
    events: events.rows,
    comments: comments.rows,
    pauses: pauses.rows,
    attachments: attachments.rows,
    sla: { consumedBusinessMinutes: consumed, pausedIntervals: pauses.rows.length }
  };
}

async function changeStatus(user, id, status, note) {
  if (!STATUSES.includes(status)) {
    const error = new Error("Status inválido.");
    error.status = 400;
    throw error;
  }
  const current = await query(`SELECT * FROM tickets WHERE id = $1`, [id]);
  const ticket = current.rows[0];
  if (!ticket) return null;
  const viewers = await query(`SELECT array_agg(user_id) AS ids FROM ticket_viewers WHERE ticket_id = $1`, [id]);
  ticket.viewer_ids = viewers.rows[0]?.ids || [];
  if (!canSee(user, ticket)) return null;
  if (!canMove(user, ticket)) {
    const error = new Error("Sem permissão para movimentar este chamado.");
    error.status = 403;
    throw error;
  }
  if (status === "RESOLVIDO" && !note) {
    const error = new Error("Descreva a solução ou a decisão.");
    error.status = 400;
    throw error;
  }
  if (ticket.status !== "AGUARDANDO_SOLICITANTE" && status === "AGUARDANDO_SOLICITANTE") {
    await query(`INSERT INTO ticket_pauses (ticket_id, started_at) VALUES ($1, now())`, [id]);
  }
  if (ticket.status === "AGUARDANDO_SOLICITANTE" && status !== "AGUARDANDO_SOLICITANTE") {
    await query(`UPDATE ticket_pauses SET ended_at = now() WHERE ticket_id = $1 AND ended_at IS NULL`, [id]);
  }
  const firstResponse = !ticket.first_response_at && ["EM_TRIAGEM", "EM_ATENDIMENTO", "RESOLVIDO"].includes(status) ? new Date() : ticket.first_response_at;
  await query(
    `UPDATE tickets SET status = $2, updated_at = now(), resolution_text = CASE WHEN $2 = 'RESOLVIDO' THEN $3 ELSE resolution_text END,
      resolved_at = CASE WHEN $2 = 'RESOLVIDO' THEN now() ELSE resolved_at END, first_response_at = COALESCE(first_response_at, $4)
     WHERE id = $1`,
    [id, status, note || null, firstResponse]
  );
  await query(
    `INSERT INTO ticket_events (ticket_id, user_id, event_type, from_value, to_value, note) VALUES ($1, $2, 'status', $3, $4, $5)`,
    [id, user.id, ticket.status, status, note || null]
  );
  await audit(user.id, "ticket.status", "ticket", id, { status: ticket.status }, { status, note });
  return ticketDetail(user, id);
}

async function comment(user, id, body) {
  const detail = await ticketDetail(user, id);
  if (!detail) return null;
  if (!detail.canComment) {
    const error = new Error("Sem permissão para comentar.");
    error.status = 403;
    throw error;
  }
  await query(`INSERT INTO ticket_comments (ticket_id, user_id, body) VALUES ($1, $2, $3)`, [id, user.id, body]);
  await query(`UPDATE tickets SET first_response_at = COALESCE(first_response_at, now()), updated_at = now() WHERE id = $1`, [id]);
  await query(`INSERT INTO ticket_events (ticket_id, user_id, event_type, note) VALUES ($1, $2, 'comentario', $3)`, [id, user.id, body.slice(0, 180)]);
  return ticketDetail(user, id);
}

async function assign(user, id, assigneeId) {
  if (user.role !== "admin") {
    const error = new Error("Somente administração atribui responsável.");
    error.status = 403;
    throw error;
  }
  const before = await query(`SELECT assignee_id FROM tickets WHERE id = $1`, [id]);
  if (!before.rowCount) return null;
  const assignee = await query(`SELECT id, name FROM users WHERE id = $1 AND active`, [assigneeId]);
  if (!assignee.rowCount) {
    const error = new Error("Responsável inválido.");
    error.status = 400;
    throw error;
  }
  await query(`UPDATE tickets SET assignee_id = $2, updated_at = now() WHERE id = $1`, [id, assigneeId]);
  await query(
    `INSERT INTO ticket_events (ticket_id, user_id, event_type, from_value, to_value) VALUES ($1, $2, 'atribuicao', $3, $4)`,
    [id, user.id, before.rows[0].assignee_id, assignee.rows[0].name]
  );
  await audit(user.id, "ticket.assign", "ticket", id, { assigneeId: before.rows[0].assignee_id }, { assigneeId });
  return ticketDetail(user, id);
}

async function reopen(user, id, reason) {
  if (!reason) {
    const error = new Error("Informe o motivo da reabertura.");
    error.status = 400;
    throw error;
  }
  const current = await query(`SELECT * FROM tickets WHERE id = $1`, [id]);
  if (!current.rowCount) return null;
  const ticket = current.rows[0];
  if (!canMove(user, ticket) && ticket.requester_id !== user.id && user.role !== "admin") {
    const error = new Error("Sem permissão para reabrir.");
    error.status = 403;
    throw error;
  }
  await query(
    `UPDATE tickets SET status = 'ABERTO', reopen_count = reopen_count + 1, resolved_at = NULL, updated_at = now() WHERE id = $1`,
    [id]
  );
  await query(
    `INSERT INTO ticket_events (ticket_id, user_id, event_type, from_value, to_value, note) VALUES ($1, $2, 'reabertura', $3, 'ABERTO', $4)`,
    [id, user.id, ticket.status, reason]
  );
  await audit(user.id, "ticket.reopen", "ticket", id, { status: ticket.status }, { reason });
  return ticketDetail(user, id);
}

async function saveAttachment(user, ticketId, file) {
  const detail = await ticketDetail(user, ticketId);
  if (!detail || !detail.canComment) {
    const error = new Error("Sem permissão para anexar.");
    error.status = 403;
    throw error;
  }
  const allowed = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".xlsx", ".csv", ".txt", ".docx"]);
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!allowed.has(ext) || file.size > 15 * 1024 * 1024) {
    const error = new Error("Anexo inválido.");
    error.status = 400;
    throw error;
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const stored = `${crypto.randomBytes(16).toString("hex")}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, stored), file.buffer);
  await query(
    `INSERT INTO ticket_attachments (ticket_id, user_id, original_name, stored_name, mime_type, byte_size) VALUES ($1, $2, $3, $4, $5, $6)`,
    [ticketId, user.id, path.basename(file.originalname), stored, file.mimetype, file.size]
  );
  await query(`INSERT INTO ticket_events (ticket_id, user_id, event_type, note) VALUES ($1, $2, 'anexo', $3)`, [ticketId, user.id, path.basename(file.originalname)]);
  return ticketDetail(user, ticketId);
}

async function kpis(user) {
  const tickets = await listTickets(user, {});
  const open = tickets.filter((ticket) => !["RESOLVIDO", "CANCELADO"].includes(ticket.status));
  const now = Date.now();
  const aging = open.length ? open.reduce((sum, ticket) => sum + (now - new Date(ticket.createdAt).getTime()), 0) / open.length / 86400000 : 0;
  return {
    abertos: open.filter((ticket) => ticket.status === "ABERTO").length,
    emAtendimento: tickets.filter((ticket) => ["EM_TRIAGEM", "EM_ATENDIMENTO"].includes(ticket.status)).length,
    aguardandoSolicitante: tickets.filter((ticket) => ticket.status === "AGUARDANDO_SOLICITANTE").length,
    resolvidos: tickets.filter((ticket) => ticket.status === "RESOLVIDO").length,
    criticos: open.filter((ticket) => ticket.priority === "P1").length,
    backlog: open.length,
    agingMedioDias: Math.round(aging * 10) / 10,
    reabertos: tickets.filter((ticket) => ticket.reopenCount > 0).length,
    aguardandoAtribuicao: open.filter((ticket) => ticket.awaitingAssignment).length
  };
}

module.exports = {
  STATUSES, createTicket, listTickets, ticketDetail, changeStatus, comment, assign, reopen, saveAttachment, kpis, canSee, canMove
};
