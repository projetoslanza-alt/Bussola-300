const RANK = { P1: 1, P2: 2, P3: 3, P4: 4 };

function normalizeImpact(value) {
  const text = String(value || "");
  if (/cliente|empresa/i.test(text)) return "Cliente relevante / empresa";
  if (/equipe|venda/i.test(text)) return "Uma equipe / uma venda";
  if (/pessoa/i.test(text)) return "Uma pessoa";
  return text;
}

function normalizeUrgency(value) {
  const text = String(value || "");
  if (/parado/i.test(text)) return "Trabalho parado";
  if (/próximo|proximo/i.test(text)) return "Prazo próximo";
  if (/planej/i.test(text)) return "Planejada";
  return text;
}

function moreCritical(left, right) {
  const a = RANK[left] || 99;
  const b = RANK[right] || 99;
  if (a === 99 && b === 99) return null;
  return a <= b ? left : right;
}

function resolvePriority(reasonPriority, matrixPriority) {
  return moreCritical(reasonPriority, matrixPriority);
}

module.exports = { RANK, normalizeImpact, normalizeUrgency, resolvePriority };
