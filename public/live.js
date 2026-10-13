(() => {
  const state = { user: null, adp: null, ticketCatalog: null, wizard: null, ticket: null };

  function money(value) {
    if (value == null || value === "") return "—";
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function roiText(value) {
    if (value == null || value === "") return "—";
    return `${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
  }
  function dateBr(value) {
    if (!value) return "—";
    const [year, month, day] = String(value).slice(0, 10).split("-");
    if (!day) return "—";
    return `${day}/${month}/${year}`;
  }
  function num(value) {
    if (value == null || Number.isNaN(Number(value))) return "—";
    return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  }
  function pct(value) {
    if (value == null) return "—";
    return `${(Number(value) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
  async function api(url, options = {}) {
    const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };
    const response = await fetch(url, { credentials: "same-origin", ...options, headers: { ...headers, ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
    return data;
  }
  function box(title, body) {
    return `<div class="card">${title ? `<span class="kicker">${title}</span>` : ""}${body}</div>`;
  }

  function gate() {
    if (document.getElementById("live-gate")) return;
    const node = document.createElement("div");
    node.id = "live-gate";
    node.innerHTML = `<style>
      #live-gate{position:fixed;inset:0;z-index:80;background:#080808;display:grid;place-items:center;padding:24px}
      #live-gate .card{width:min(440px,100%)}
      #live-gate input{width:100%;background:#111;border:1px solid #2b2b2b;color:#fff;border-radius:12px;padding:12px;margin:8px 0 14px}
      .live-error{color:#ff5b5b;font-size:13px;min-height:18px}
      .filters{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
      .filters select,.filters input{background:#111;border:1px solid #2b2b2b;color:#fff;border-radius:12px;padding:10px}
      .funnel-step{display:grid;grid-template-columns:1.2fr .6fr .8fr;gap:8px;align-items:center;padding:10px 0;border-top:1px solid #2b2b2b}
      .below{color:#f2b84b}.above{color:#30c27a}
      .table-wrap{overflow:auto}
      table{width:100%;border-collapse:collapse}
      th,td{text-align:left;padding:8px;border-bottom:1px solid #2b2b2b;font-size:13px;white-space:nowrap}
      .live-modal{position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:40;display:grid;place-items:center;padding:18px}
      .live-modal .sheet{width:min(980px,100%);max-height:88vh;overflow:auto}
      .wizard-note{color:#a7a7a7;font-size:13px}
    </style>
    <form class="card" id="login-form">
      <span class="eyebrow">Bússola 300</span>
      <h2>Entrar</h2>
      <p>Acesso restrito à 300 Franchising.</p>
      <label>E-mail<input name="email" type="email" autocomplete="username" required></label>
      <label>Senha<input name="password" type="password" autocomplete="current-password" required></label>
      <div class="live-error" id="login-error"></div>
      <button class="btn btn-primary" type="submit">Entrar</button>
    </form>`;
    document.body.appendChild(node);
    node.querySelector("#login-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      try {
        const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
        state.user = result.user;
        node.remove();
        boot();
      } catch (error) {
        node.querySelector("#login-error").textContent = error.message;
      }
    });
  }

  function mountShell() {
    const adp = document.getElementById("page-adp");
    const tickets = document.getElementById("page-chamados");
    if (adp && !document.getElementById("adp-root")) adp.innerHTML = `<div id="adp-root"></div>`;
    if (tickets && !document.getElementById("tickets-root")) tickets.innerHTML = `<div id="tickets-root"></div>`;
    const reports = document.getElementById("page-relatorios");
    if (reports && !document.getElementById("reports-live")) reports.insertAdjacentHTML("afterbegin", `<div id="reports-live"></div>`);
    const admin = document.getElementById("page-admin");
    if (admin && !document.getElementById("admin-live")) admin.insertAdjacentHTML("afterbegin", `<div id="admin-live"></div>`);
    const profile = document.querySelector(".profile-mini");
    if (profile && state.user) {
      const initials = state.user.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
      profile.innerHTML = `<div class="avatar">${esc(initials)}</div><div><strong>${esc(state.user.name)}</strong><span>${esc(state.user.role)}</span></div>`;
    }
    document.querySelectorAll(".admin-only").forEach((element) => {
      element.style.display = state.user.role === "admin" ? "" : "none";
    });
    const role = document.getElementById("roleSelect");
    if (role) role.style.display = "none";
    const home = document.querySelector("#page-inicio .stats");
    if (home) {
      home.innerHTML = `
        <div class="card"><span class="kicker">Último período</span><div class="stat-value" id="home-period">…</div><div class="stat-meta" id="home-people">Carregando indicadores</div></div>
        <div class="card"><span class="kicker">Receita realizada</span><div class="stat-value" id="home-revenue">…</div><div class="stat-meta" id="home-sales">vendas do período</div></div>
        <div class="card"><span class="kicker">ROI médio</span><div class="stat-value" id="home-roi">…</div><div class="stat-meta">valor importado da planilha</div></div>
        <div class="card"><span class="kicker">Chamados</span><div class="stat-value" id="home-tickets">…</div><div class="stat-meta" id="home-critical">em aberto</div></div>`;
    }
  }

  async function loadHome() {
    const data = await api("/api/home");
    document.getElementById("home-period").textContent = data.ultimoPeriodo || "Sem dados";
    document.getElementById("home-people").textContent = data.comercial ? `${num(data.colaboradores)} colaboradores na base ROI` : "Indicadores comerciais restritos ao seu perfil";
    document.getElementById("home-revenue").textContent = data.comercial ? money(data.receita) : "—";
    document.getElementById("home-sales").textContent = data.comercial ? `${num(data.vendas)} vendas no período` : "Sem permissão para receita";
    document.getElementById("home-roi").textContent = data.comercial ? roiText(data.roiMedio) : "—";
    document.getElementById("home-tickets").textContent = num(data.chamadosAbertos);
    document.getElementById("home-critical").textContent = `${num(data.chamadosCriticos)} críticos · ${num(data.aguardandoAtribuicao)} aguardando atribuição`;
  }

  async function loadAdp() {
    const root = document.getElementById("adp-root");
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    const query = new URLSearchParams();
    ["cycleId", "teamId", "personId"].forEach((key) => { if (params.get(key)) query.set(key, params.get(key)); });
    root.innerHTML = box("", `<p>Carregando ADP…</p>`);
    try {
      state.adp = await api(`/api/adp/dashboard?${query}`);
      const teams = state.adp.empty ? [] : (await api(`/api/adp/teams?cycleId=${state.adp.cycle.id}`)).teams;
      renderAdp(teams);
    } catch (error) {
      root.innerHTML = box("ADP", `<p class="live-error">${esc(error.message)}</p>`);
    }
  }

  function renderAdp(teams) {
    const data = state.adp;
    const root = document.getElementById("adp-root");
    if (data.empty) {
      root.innerHTML = box("ADP", `<h2>Sem dados no seu escopo</h2><p>${esc(data.reason || "Nenhum ciclo importado.")}</p>`);
      return;
    }
    const filters = data.filters;
    const kpis = ["ligacoes", "aberturas", "formularios", "onlines", "calls_agendadas", "calls_realizadas", "vendas"].map((code) => {
      const step = data.steps.find((item) => item.code === code);
      const previous = data.previousTotals?.[code];
      const delta = previous == null || step.value == null ? "" : `<div class="stat-meta">${step.value >= previous ? "acima" : "abaixo"} do ciclo anterior (${num(previous)})</div>`;
      return `<div class="card"><span class="kicker">${esc(step.label)}</span><div class="stat-value">${num(step.value)}</div>${delta}</div>`;
    }).join("");
    const funnel = data.steps.map((step) => {
      const flag = step.below == null ? "" : step.below ? `<span class="below">abaixo da referência</span>` : `<span class="above">dentro da referência</span>`;
      const conversion = step.conversion == null ? "Sem base para cálculo" : pct(step.conversion);
      return `<div class="funnel-step"><strong>${esc(step.label)}</strong><span>${num(step.value)}</span><span>${conversion}${step.reference == null ? "" : ` · mín. ${pct(step.reference)}`} ${flag}</span></div>`;
    }).join("");
    const teamCards = teams.map((team) => `<button class="card" data-team="${team.id}" style="text-align:left"><span class="kicker">${esc(team.name)}</span><div class="stat-value">${team.ligacoes == null ? "—" : num(team.vendas)}</div><p>${team.ligacoes == null ? "Sem consolidado neste ciclo" : `${num(team.people)} pessoas · ${num(team.ligacoes)} ligações · ${num(team.vendas)} vendas`}</p></button>`).join("") || `<p>Nenhuma equipe neste ciclo.</p>`;
    const projections = (data.projections || []).map((item) => `<tr><td>${esc(item.label)}</td><td>${pct(item.value)}</td></tr>`).join("");
    const insights = (data.insights || []).map((item) => `<li>${esc(item.text)}</li>`).join("") || "<li>Nenhum insight para este recorte.</li>";
    root.innerHTML = `
      <div class="section-head"><div><span class="eyebrow">ADP comercial</span><h2>${esc(data.cycle.name)}</h2><p>Indicadores importados da planilha. Projeção, meta e realizado ficam separados.</p></div></div>
      <div class="filters">
        <select id="adp-cycle">${filters.cycles.map((cycle) => `<option value="${cycle.id}" ${cycle.id === data.cycle.id ? "selected" : ""}>${esc(cycle.name)}</option>`).join("")}</select>
        <select id="adp-team"><option value="">Todas as equipes</option>${filters.teams.map((team) => `<option value="${team.id}">${esc(team.name)}</option>`).join("")}</select>
        <select id="adp-person"><option value="">Todos os colaboradores</option>${filters.people.map((person) => `<option value="${person.id}">${esc(person.display_name)}</option>`).join("")}</select>
      </div>
      <div class="grid grid-4">${kpis}</div>
      <div class="grid grid-2" style="margin-top:16px">
        ${box("Funil", funnel)}
        ${box("Insights", `<ul>${insights}</ul>`)}
      </div>
      <div class="section-head"><div><h2>Equipes</h2></div></div>
      <div class="grid grid-4">${teamCards}</div>
      <div class="grid grid-2" style="margin-top:16px">
        ${box("Projeção do ciclo", projections ? `<table><tr><th>Referência</th><th>Parâmetro</th></tr>${projections}</table><p>Projeção não é realizado.</p>` : `<p>Nenhuma projeção importada neste ciclo.</p>`)}
        ${box("Acompanhamento gerencial", `<p>PDI, observações e plano de ação ficam fora dos números da planilha.</p><button class="btn btn-secondary" id="open-person">Abrir colaborador selecionado</button>`)}
      </div>
      <div id="person-panel"></div>`;
    root.querySelector("#adp-cycle").onchange = (event) => { location.hash = `cycleId=${event.target.value}`; loadAdp(); };
    root.querySelector("#adp-team").onchange = (event) => { location.hash = `cycleId=${data.cycle.id}&teamId=${event.target.value}`; loadAdp(); };
    root.querySelector("#adp-person").onchange = (event) => openPerson(event.target.value, data.cycle.id);
    root.querySelectorAll("[data-team]").forEach((button) => button.onclick = () => { location.hash = `cycleId=${data.cycle.id}&teamId=${button.dataset.team}`; loadAdp(); });
    root.querySelector("#open-person").onclick = () => openPerson(root.querySelector("#adp-person").value, data.cycle.id);
    const selected = new URLSearchParams(location.hash.replace(/^#/, "")).get("personId");
    if (selected) openPerson(selected, data.cycle.id);
  }

  async function openPerson(personId, cycleId) {
    const panel = document.getElementById("person-panel");
    if (!personId) return;
    panel.innerHTML = box("", "<p>Carregando colaborador…</p>");
    try {
      const data = await api(`/api/adp/people/${personId}?cycleId=${cycleId}`);
      const goals = data.goals.filter((goal) => goal.scope === "individual").map((goal) => {
        const rate = goal.target ? (goal.actual || 0) / goal.target : null;
        return `<tr><td>${esc(goal.goal_type)}</td><td>${num(goal.target)}</td><td>${num(goal.actual)}</td><td>${rate == null ? "Sem base para cálculo" : pct(rate)}</td></tr>`;
      }).join("");
      const production = Object.entries(data.production).map(([key, value]) => `<tr><td>${esc(key)}</td><td>${num(value)}</td></tr>`).join("");
      panel.innerHTML = box("Colaborador", `
        <h2>${esc(data.person.display_name)}</h2>
        <p>Equipe: ${esc(data.teams.join(", ") || "não vinculada neste ciclo")}</p>
        <div class="grid grid-2">
          <div><h3>Meta × realizado</h3><table><tr><th>Meta</th><th>Alvo</th><th>Realizado</th><th>Atingimento</th></tr>${goals || "<tr><td colspan='4'>Sem meta individual importada.</td></tr>"}</table></div>
          <div><h3>Produção</h3><table>${production || "<tr><td>Sem produção individual.</td></tr>"}</table></div>
        </div>
        <h3>Acompanhamento gerencial</h3>
        <form id="note-form" class="filters"><select name="kind"><option>PDI</option><option>observação</option><option>plano de ação</option><option>comentário do gestor</option></select><input name="body" placeholder="Registro manual" required><button class="btn btn-primary">Salvar</button></form>
        <ul>${data.notes.map((note) => `<li><strong>${esc(note.kind)}</strong> · ${esc(note.author || "—")} · ${esc(note.body)}</li>`).join("") || "<li>Nenhum acompanhamento manual.</li>"}</ul>`);
      panel.querySelector("#note-form").onsubmit = async (event) => {
        event.preventDefault();
        const form = new FormData(event.target);
        await api(`/api/adp/people/${personId}/notes`, { method: "POST", body: JSON.stringify({ kind: form.get("kind"), body: form.get("body"), cycleId }) });
        openPerson(personId, cycleId);
      };
    } catch (error) {
      panel.innerHTML = box("Colaborador", `<p class="live-error">${esc(error.message)}</p>`);
    }
  }

  async function loadTickets() {
    const root = document.getElementById("tickets-root");
    root.innerHTML = box("", "<p>Carregando chamados…</p>");
    try {
      state.ticketCatalog = await api("/api/tickets/catalog");
      const data = await api("/api/tickets");
      const kpis = data.kpis;
      const cards = [
        ["Abertos", kpis.abertos], ["Em atendimento", kpis.emAtendimento], ["Aguardando solicitante", kpis.aguardandoSolicitante],
        ["Resolvidos", kpis.resolvidos], ["Críticos", kpis.criticos], ["Backlog", kpis.backlog], ["Aging médio (dias)", kpis.agingMedioDias], ["Reabertos", kpis.reabertos]
      ].map(([label, value]) => `<div class="card"><span class="kicker">${label}</span><div class="stat-value">${num(value)}</div></div>`).join("");
      const rows = data.tickets.map((ticket) => `<tr data-id="${ticket.id}"><td>${esc(ticket.number)}</td><td>${esc(ticket.title)}</td><td>${esc(ticket.status)}</td><td>${esc(ticket.priority)}</td><td>${esc(ticket.area)}</td><td>${esc(ticket.assignee || "Aguardando atribuição")}</td></tr>`).join("");
      root.innerHTML = `
        <div class="section-head"><div><span class="eyebrow">Chamados</span><h2>Fila real</h2><p>Um chamado representa um único resultado esperado e depende da atuação de outra área.</p></div><button class="btn btn-primary" id="new-ticket">Abrir chamado</button></div>
        <div class="grid grid-4">${cards}</div>
        <div class="card table-wrap" style="margin-top:16px"><table><tr><th>Número</th><th>Título</th><th>Status</th><th>Prioridade</th><th>Área</th><th>Responsável</th></tr>${rows || "<tr><td colspan='6'>Nenhum chamado no seu escopo.</td></tr>"}</table></div>
        <div id="ticket-panel"></div>`;
      root.querySelector("#new-ticket").onclick = () => renderWizard(0);
      root.querySelectorAll("[data-id]").forEach((row) => row.onclick = () => openTicket(row.dataset.id));
    } catch (error) {
      root.innerHTML = box("Chamados", `<p class="live-error">${esc(error.message)}</p>`);
    }
  }

  function renderWizard(step) {
    const catalog = state.ticketCatalog;
    state.wizard = state.wizard || { step, impact: "Uma pessoa", urgency: "Planejada", origin: catalog.origins[0] };
    state.wizard.step = step;
    const area = catalog.areas.find((item) => item.id === state.wizard.areaId);
    const reasons = catalog.reasons.filter((item) => item.area_id === state.wizard.areaId);
    const reason = reasons.find((item) => item.id === state.wizard.reasonId);
    const panels = [
      `<h3>1. Área responsável</h3><div class="grid grid-3">${catalog.areas.map((item) => `<button class="card" data-area="${item.id}" type="button"><strong>${esc(item.name)}</strong></button>`).join("")}</div>`,
      `<h3>2. Motivo</h3>${reasons.map((item) => `<button class="card" data-reason="${item.id}" type="button" style="width:100%;text-align:left;margin-bottom:8px"><strong>${esc(item.catalog_code || "Sem código")} · ${esc(item.title)}</strong><p>${esc(item.when_to_use || "Sem orientação de uso.")}</p>${item.config_pending ? `<span class="tag">Configuração pendente</span>` : ""}</button>`).join("") || "<p>Nenhum motivo nesta área.</p>"}`,
      `<h3>3. Solicitação</h3><p class="wizard-note">Um chamado deve representar um único resultado esperado.</p><label>Título<input id="w-title" value="${esc(state.wizard.title || "")}"></label><label>Resultado esperado<textarea id="w-result">${esc(state.wizard.expectedResult || "")}</textarea></label><label>Contexto<textarea id="w-context">${esc(state.wizard.context || "")}</textarea></label>`,
      `<h3>4. Impacto e urgência</h3><label>Impacto<select id="w-impact">${["Uma pessoa", "Uma equipe / uma venda", "Cliente relevante / empresa"].map((item) => `<option ${state.wizard.impact === item ? "selected" : ""}>${item}</option>`).join("")}</select></label><label>Urgência<select id="w-urgency">${["Planejada", "Prazo próximo", "Trabalho parado"].map((item) => `<option ${state.wizard.urgency === item ? "selected" : ""}>${item}</option>`).join("")}</select></label><p class="wizard-note">A prioridade final é a mais crítica entre o padrão do motivo e esta matriz. A matriz não reduz uma prioridade padrão mais crítica.</p>`,
      `<h3>5. Informações adicionais</h3><label>Origem<select id="w-origin">${catalog.origins.map((item) => `<option ${state.wizard.origin === item ? "selected" : ""}>${esc(item)}</option>`).join("")}</select></label><label>Data necessária<input id="w-date" type="date" value="${esc(state.wizard.neededOn || "")}"></label><label>Nome da reunião<input id="w-meeting" value="${esc(state.wizard.meetingName || "")}"></label><label>Cliente<input id="w-client" value="${esc(state.wizard.clientName || "")}"></label><label>Venda<input id="w-sale" value="${esc(state.wizard.saleRef || "")}"></label><label>Colaborador<input id="w-person" value="${esc(state.wizard.relatedPerson || "")}"></label><label>Links<textarea id="w-links">${esc(state.wizard.links || "")}</textarea></label><label>Observações<textarea id="w-notes">${esc(state.wizard.observations || "")}</textarea></label>`,
      `<h3>6. Roteamento</h3><p>Área: ${esc(area?.name || "—")}</p><p>Motivo: ${esc(reason?.title || "—")}</p><p>Tipo: ${esc(reason?.default_type || "Não configurado")}</p><p>SLA padrão: ${esc(reason?.default_priority || "Não configurado")}</p><p>Responsável padrão: Não configurado até a administração definir.</p><p>O solicitante não escolhe o responsável.</p>`,
      `<h3>7. Revisão</h3><p>${esc(state.wizard.title || "")}</p><p>${esc(state.wizard.expectedResult || "")}</p><button class="btn btn-primary" id="w-submit" type="button">Criar chamado</button>`
    ];
    const root = document.getElementById("ticket-panel");
    root.innerHTML = `<div class="card">${panels[step]}<div class="actions" style="margin-top:12px">${step ? `<button class="btn btn-ghost" id="w-back" type="button">Voltar</button>` : ""}<button class="btn btn-secondary" id="w-next" type="button">Continuar</button></div><p class="live-error" id="w-error"></p></div>`;
    root.querySelectorAll("[data-area]").forEach((button) => button.onclick = () => { state.wizard.areaId = button.dataset.area; state.wizard.reasonId = null; renderWizard(1); });
    root.querySelectorAll("[data-reason]").forEach((button) => button.onclick = () => { state.wizard.reasonId = button.dataset.reason; renderWizard(2); });
    const next = root.querySelector("#w-next");
    if (next) next.onclick = () => collectWizard(step);
    const back = root.querySelector("#w-back");
    if (back) back.onclick = () => renderWizard(step - 1);
    const submit = root.querySelector("#w-submit");
    if (submit) submit.onclick = submitTicket;
  }

  function collectWizard(step) {
    const read = (id) => document.getElementById(id)?.value || "";
    if (step === 2) {
      state.wizard.title = read("w-title");
      state.wizard.expectedResult = read("w-result");
      state.wizard.context = read("w-context");
      if (!state.wizard.title || !state.wizard.expectedResult || !state.wizard.context) return document.getElementById("w-error").textContent = "Preencha título, resultado e contexto.";
    }
    if (step === 3) {
      state.wizard.impact = read("w-impact");
      state.wizard.urgency = read("w-urgency");
    }
    if (step === 4) {
      state.wizard.origin = read("w-origin");
      state.wizard.neededOn = read("w-date");
      state.wizard.meetingName = read("w-meeting");
      state.wizard.clientName = read("w-client");
      state.wizard.saleRef = read("w-sale");
      state.wizard.relatedPerson = read("w-person");
      state.wizard.links = read("w-links");
      state.wizard.observations = read("w-notes");
      if (!state.wizard.neededOn || !state.wizard.origin) return document.getElementById("w-error").textContent = "Origem e data necessária são obrigatórias.";
    }
    if (!state.wizard.areaId && step === 0) return;
    if (!state.wizard.reasonId && step === 1) return;
    renderWizard(Math.min(step + 1, 6));
  }

  async function submitTicket() {
    try {
      const created = await api("/api/tickets", { method: "POST", body: JSON.stringify({
        areaId: state.wizard.areaId, reasonId: state.wizard.reasonId, title: state.wizard.title,
        expectedResult: state.wizard.expectedResult, context: state.wizard.context, impact: state.wizard.impact,
        urgency: state.wizard.urgency, origin: state.wizard.origin, neededOn: state.wizard.neededOn,
        meetingName: state.wizard.meetingName, clientName: state.wizard.clientName, saleRef: state.wizard.saleRef,
        relatedPerson: state.wizard.relatedPerson, links: state.wizard.links, observations: state.wizard.observations
      }) });
      state.wizard = null;
      await loadTickets();
      openTicket(created.id);
    } catch (error) {
      document.getElementById("w-error").textContent = error.message;
    }
  }

  async function openTicket(id) {
    const panel = document.getElementById("ticket-panel");
    panel.innerHTML = box("", "<p>Carregando chamado…</p>");
    try {
      const ticket = await api(`/api/tickets/${id}`);
      const statuses = ["ABERTO", "EM_TRIAGEM", "EM_ATENDIMENTO", "AGUARDANDO_SOLICITANTE", "AGUARDANDO_TERCEIRO", "RESOLVIDO", "CANCELADO"];
      panel.innerHTML = box(ticket.number, `
        <h2>${esc(ticket.title)}</h2>
        <p>${esc(ticket.status)} · ${esc(ticket.priority)} · ${esc(ticket.assignee || "Aguardando atribuição")}</p>
        <p><strong>Resultado esperado:</strong> ${esc(ticket.expectedResult || "")}</p>
        <p><strong>Contexto:</strong> ${esc(ticket.context || "")}</p>
        <p>Impacto ${esc(ticket.impact)} · urgência ${esc(ticket.urgency)} · origem ${esc(ticket.origin)} · necessário em ${esc(ticket.neededOn)}</p>
        <p>SLA: primeira resposta até ${esc(ticket.firstResponseDueAt || "—")} · solução até ${esc(ticket.resolutionDueAt || "—")} · tempo útil consumido ${num(ticket.sla.consumedBusinessMinutes)} min · pausas ${num(ticket.sla.pausedIntervals)}</p>
        ${ticket.canMove ? `<div class="filters"><select id="ticket-status">${statuses.map((item) => `<option ${item === ticket.status ? "selected" : ""}>${item}</option>`).join("")}</select><input id="ticket-note" placeholder="Solução, decisão ou nota"><button class="btn btn-primary" id="ticket-move">Movimentar</button></div>` : ""}
        <form id="ticket-comment" class="filters"><input name="body" placeholder="Comentário" required><button class="btn btn-secondary">Comentar</button></form>
        <form id="ticket-file" class="filters"><input name="file" type="file"><button class="btn btn-ghost">Anexar</button></form>
        <h3>Timeline</h3>
        <ul>${ticket.events.map((event) => `<li>${esc(event.created_at)} · ${esc(event.event_type)} · ${esc(event.from_value || "")} ${esc(event.to_value || "")} ${esc(event.note || "")}</li>`).join("")}</ul>
        <h3>Comentários</h3>
        <ul>${ticket.comments.map((comment) => `<li><strong>${esc(comment.author)}</strong> ${esc(comment.body)}</li>`).join("") || "<li>Sem comentários.</li>"}</ul>`);
      const move = panel.querySelector("#ticket-move");
      if (move) move.onclick = async () => {
        const status = panel.querySelector("#ticket-status").value;
        const note = panel.querySelector("#ticket-note").value;
        if (status === "RESOLVIDO" && !note) return alert("Descreva a solução ou a decisão.");
        await api(`/api/tickets/${id}/status`, { method: "POST", body: JSON.stringify({ status, note }) });
        openTicket(id);
        loadHome();
      };
      panel.querySelector("#ticket-comment").onsubmit = async (event) => {
        event.preventDefault();
        await api(`/api/tickets/${id}/comments`, { method: "POST", body: JSON.stringify({ body: new FormData(event.target).get("body") }) });
        openTicket(id);
      };
      panel.querySelector("#ticket-file").onsubmit = async (event) => {
        event.preventDefault();
        const body = new FormData(event.target);
        await api(`/api/tickets/${id}/attachments`, { method: "POST", body });
        openTicket(id);
      };
    } catch (error) {
      panel.innerHTML = box("Chamado", `<p class="live-error">${esc(error.message)}</p>`);
    }
  }

  async function loadReports() {
    const root = document.getElementById("reports-live");
    if (!root) return;
    try {
      const tickets = await api("/api/reports/tickets");
      let commercial = "";
      try {
        const roi = await api("/api/roi/summary");
        const sales = await api("/api/sales/summary");
        commercial = `<div class="grid grid-2">
          ${box("ROI", roi.empty ? `<p>Sem dados disponíveis</p>` : `<p>Último período disponível: ${esc(roi.periodLabel)}</p><p>Receita ${money(roi.kpis.gross_revenue)} · ROI médio ${roiText(roi.kpis.avg_roi)} · ${num(roi.kpis.collaborators)} colaboradores</p>`)}
          ${box("Vendas realizadas", sales.empty ? `<p>Sem dados disponíveis</p>` : `<p>Último período disponível: ${esc(sales.periodLabel)}</p><p>Receita ${money(sales.kpis.revenue)} · ${num(sales.kpis.transactions)} vendas</p><p>${esc(sales.note)}</p>`)}
        </div>`;
      } catch (error) {
        commercial = box("ROI e vendas", `<p>${esc(error.message)}</p>`);
      }
      root.innerHTML = `${commercial}
        <div class="grid grid-2" style="margin-top:16px">
          ${box("Gerencial de Chamados", `<p>Backlog ${num(tickets.kpis.backlog)} · Críticos ${num(tickets.kpis.criticos)} · Aguardando atribuição ${num(tickets.kpis.aguardandoAtribuicao)}</p>`)}
          ${box("Módulos sem fonte", `<p>Treinamentos, gamificação, universidade, recrutamento, documentos e news estão aguardando dados.</p>`)}
        </div>`;
    } catch (error) {
      root.innerHTML = box("Relatórios", `<p class="live-error">${esc(error.message)}</p>`);
    }
  }

  function options(items, selected, placeholder) {
    const list = [`<option value="">${esc(placeholder)}</option>`];
    for (const item of items) {
      const value = item.id || item.value || item;
      const label = item.display_name || item.label || item;
      list.push(`<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`);
    }
    return list.join("");
  }

  async function loadPeople() {
    const root = document.getElementById("people-root");
    if (!root) return;
    root.innerHTML = box("", "<p>Carregando colaboradores…</p>");
    try {
      const data = await api("/api/people");
      if (data.empty) {
        root.innerHTML = `<div class="empty">${esc(data.message || "Nenhum colaborador encontrado na base do ROI.")}</div>`;
        return;
      }
      const cards = data.people.map((person) => `<div class="card people-card"><div class="avatar">${esc(person.display_name.slice(0, 1))}</div><div class="grow"><strong>${esc(person.display_name)}</strong><small>${esc(person.current_role || "Cargo não informado")} · ${esc(person.current_manager_name || "Sem gestor atual")}</small><small>ROI ${roiText(person.roi)} · ${esc(person.classification || "Sem classificação")}</small></div><button class="btn btn-ghost" data-person="${person.id}" type="button">Ver perfil</button></div>`).join("");
      root.innerHTML = `
        <div class="grid grid-4">
          <div class="card"><span class="kicker">Colaboradores ROI</span><div class="stat-value">${num(data.total)}</div><span class="stat-meta">Último período disponível: ${esc(data.periodLabel || "—")}</span></div>
          <div class="card"><span class="kicker">Trilhas</span><div class="stat-value">—</div><span class="stat-meta">Sem registros.</span></div>
          <div class="card"><span class="kicker">Treinamentos</span><div class="stat-value">—</div><span class="stat-meta">Sem registros.</span></div>
          <div class="card"><span class="kicker">1:1 e PDI</span><div class="stat-value">—</div><span class="stat-meta">Sem registros.</span></div>
        </div>
        <div class="section-head"><div><h2>Colaboradores</h2><p>Base-mestra importada do ROI. Cargo e gestor atuais vêm da Equipe Comercial quando houver correspondência.</p></div><input class="search" id="people-filter" placeholder="Buscar pessoa, cargo ou gestor"></div>
        <div class="grid grid-3" id="people-grid">${cards}</div>
        <div id="people-detail"></div>`;
      const filter = root.querySelector("#people-filter");
      filter.oninput = () => {
        const term = filter.value.toLowerCase();
        root.querySelectorAll(".people-card").forEach((card) => {
          card.style.display = card.textContent.toLowerCase().includes(term) ? "" : "none";
        });
      };
      root.querySelectorAll("[data-person]").forEach((button) => button.onclick = () => loadPerson(button.dataset.person));
    } catch (error) {
      root.innerHTML = box("Gestão de pessoas", `<p class="live-error">${esc(error.message)}</p>`);
    }
  }

  async function loadPerson(id) {
    const panel = document.getElementById("people-detail");
    panel.innerHTML = box("", "<p>Carregando perfil…</p>");
    try {
      const data = await api(`/api/people/${id}`);
      const person = data.person;
      const history = data.history.map((row) => `<tr><td>${esc(row.label)}</td><td>${esc(row.role_name || "—")}</td><td>${esc(row.manager_name || "—")}</td><td>${money(row.gross_revenue)}</td><td>${money(row.total_invested)}</td><td>${money(row.result_amount)}</td><td>${roiText(row.roi)}</td><td>${esc(row.classification || "—")}</td></tr>`).join("");
      panel.innerHTML = box("Perfil", `
        <h2>${esc(person.display_name)}</h2>
        <p>Cargo atual: ${esc(person.current_role || "Não informado")} · Gestor atual: ${esc(person.current_manager_name || "Não informado")}</p>
        <p>Admissão: ${dateBr(person.admission_date)} · Origem do cargo/gestor atual: ${esc(person.structure_source || "—")}</p>
        <div class="grid grid-3">
          <div class="card"><span class="kicker">Trilhas</span><p>${esc(data.unavailable.trilhas)}</p></div>
          <div class="card"><span class="kicker">Treinamentos</span><p>${esc(data.unavailable.treinamentos)}</p></div>
          <div class="card"><span class="kicker">Compliance, 1:1 e PDI</span><p>${esc(data.unavailable.compliance)} ${esc(data.unavailable.oneOnOne)} ${esc(data.unavailable.pdi)}</p></div>
        </div>
        <h3>Histórico de ROI</h3>
        <div class="table-wrap"><table><tr><th>Período</th><th>Cargo no mês</th><th>Gestor no mês</th><th>Receita</th><th>Investido</th><th>Resultado</th><th>ROI</th><th>Classificação</th></tr>${history || "<tr><td colspan='8'>Sem dados disponíveis</td></tr>"}</table></div>`);
    } catch (error) {
      panel.innerHTML = box("Perfil", `<p class="live-error">${esc(error.message)}</p>`);
    }
  }

  async function loadFinance() {
    const root = document.getElementById("finance-root");
    if (!root) return;
    const current = new URLSearchParams(root.dataset.query || "");
    root.innerHTML = box("", "<p>Carregando ROI…</p>");
    try {
      const data = await api(`/api/roi/summary?${current.toString()}`);
      if (!data.period) {
        root.innerHTML = `<div class="empty">Sem dados disponíveis</div>`;
        return;
      }
      const k = data.kpis;
      const rows = data.rows.map((row) => `<tr><td>${esc(row.display_name)}</td><td>${esc(row.role_name || "—")}</td><td>${esc(row.manager_name || "—")}</td><td>${money(row.gross_revenue)}</td><td>${money(row.total_invested)}</td><td>${money(row.result_amount)}</td><td>${roiText(row.roi)}</td><td>${esc(row.classification || "—")}</td></tr>`).join("");
      const managers = data.byManager.map((row) => `<tr><td>${esc(row.manager_name)}</td><td>${num(row.collaborators)}</td><td>${money(row.gross_revenue)}</td><td>${money(row.total_invested)}</td><td>${money(row.result_amount)}</td><td>${roiText(row.avg_roi)}</td></tr>`).join("");
      const history = data.history.map((row) => `<tr><td>${esc(row.label)}</td><td>${money(row.gross_revenue)}</td><td>${money(row.result_amount)}</td><td>${roiText(row.avg_roi)}</td><td>${num(row.collaborators)}</td></tr>`).join("");
      root.innerHTML = `
        <p>Último período disponível: ${esc(data.periods.at(-1)?.label || data.periodLabel)}. Valores importados da planilha, sem recálculo. Gestor e cargo são os registrados naquele mês.</p>
        <div class="filters">
          <select id="roi-period">${options(data.periods, data.period, "Período")}</select>
          <select id="roi-manager">${options(data.filters.managers, current.get("manager"), "Todos os gestores")}</select>
          <select id="roi-role">${options(data.filters.roles, current.get("role"), "Todos os cargos")}</select>
          <select id="roi-person">${options(data.filters.people, current.get("personId"), "Todos os colaboradores")}</select>
        </div>
        <div class="grid grid-4">
          <div class="card"><span class="kicker">Receita bruta</span><div class="stat-value">${money(k.gross_revenue)}</div></div>
          <div class="card"><span class="kicker">Total investido</span><div class="stat-value">${money(k.total_invested)}</div></div>
          <div class="card"><span class="kicker">Resultado</span><div class="stat-value">${money(k.result_amount)}</div></div>
          <div class="card"><span class="kicker">ROI médio</span><div class="stat-value">${roiText(k.avg_roi)}</div><span class="stat-meta">${num(k.positive_roi)} com ROI positivo · ${num(k.without_revenue)} sem receita</span></div>
        </div>
        <div class="grid grid-4" style="margin-top:16px">
          <div class="card"><span class="kicker">Comissão</span><div class="stat-value">${money(k.commission)}</div></div>
          <div class="card"><span class="kicker">Premiação</span><div class="stat-value">${money(k.bonus)}</div></div>
          <div class="card"><span class="kicker">Infraestrutura</span><div class="stat-value">${money(k.infrastructure)}</div></div>
          <div class="card"><span class="kicker">Colaboradores</span><div class="stat-value">${num(k.collaborators)}</div></div>
        </div>
        <div class="section-head"><div><h2>ROI por colaborador</h2></div></div>
        <div class="card table-wrap"><table><tr><th>Colaborador</th><th>Cargo</th><th>Gestor do mês</th><th>Receita</th><th>Investido</th><th>Resultado</th><th>ROI</th><th>Classificação</th></tr>${rows || "<tr><td colspan='8'>Nenhum registro encontrado</td></tr>"}</table></div>
        <div class="section-head"><div><h2>ROI por gestor</h2></div></div>
        <div class="card table-wrap"><table><tr><th>Gestor</th><th>Colaboradores</th><th>Receita</th><th>Investido</th><th>Resultado</th><th>ROI médio</th></tr>${managers}</table></div>
        <div class="section-head"><div><h2>Histórico mensal</h2></div></div>
        <div class="card table-wrap"><table><tr><th>Período</th><th>Receita</th><th>Resultado</th><th>ROI médio</th><th>Colaboradores</th></tr>${history}</table></div>`;
      const apply = () => {
        const params = new URLSearchParams();
        const period = root.querySelector("#roi-period").value;
        const manager = root.querySelector("#roi-manager").value;
        const role = root.querySelector("#roi-role").value;
        const person = root.querySelector("#roi-person").value;
        if (period) params.set("period", period);
        if (manager) params.set("manager", manager);
        if (role) params.set("role", role);
        if (person) params.set("personId", person);
        root.dataset.query = params.toString();
        loadFinance();
      };
      ["#roi-period", "#roi-manager", "#roi-role", "#roi-person"].forEach((selector) => root.querySelector(selector).onchange = apply);
    } catch (error) {
      root.innerHTML = box("Financeiro", `<p class="live-error">${esc(error.message)}</p>`);
    }
  }

  async function loadSales() {
    const root = document.getElementById("sales-root");
    if (!root) return;
    const current = new URLSearchParams(root.dataset.query || "");
    root.innerHTML = box("", "<p>Carregando resultados…</p>");
    try {
      const data = await api(`/api/sales/summary?${current.toString()}`);
      if (!data.period) {
        root.innerHTML = `<div class="empty">Sem dados disponíveis</div>`;
        return;
      }
      const ranking = data.ranking.map((row, index) => `<tr><td>${index + 1}</td><td>${esc(row.display_name)}</td><td>${esc(row.current_manager_name || "—")}</td><td>${money(row.total_amount)}</td><td>${esc(row.reconciliation_status === "matched" ? "ROI" : "Não conciliado")}</td></tr>`).join("");
      const brands = data.byBrand.map((row) => `<tr><td>${esc(row.brand)}</td><td>${money(row.amount)}</td></tr>`).join("");
      const evolution = data.evolution.map((row) => `<tr><td>${esc(row.label)}</td><td>${money(row.revenue)}</td><td>${num(row.collaborators_with_revenue)}</td></tr>`).join("");
      const managers = data.byManager.map((row) => `<tr><td>${esc(row.manager_name)}</td><td>${money(row.revenue)}</td><td>${num(row.collaborators_with_revenue)}</td></tr>`).join("");
      const detail = data.transactions.slice(0, 80).map((row) => `<tr><td>${esc(row.display_name)}</td><td>${esc(row.franchise || "—")}</td><td>${esc(row.franchisee || "—")}</td><td>${money(row.revenue)}</td><td>${row.signal_value == null ? "—" : money(row.signal_value)}</td><td>${dateBr(row.signal_date)}</td><td>${row.closing_value == null ? "—" : money(row.closing_value)}</td><td>${dateBr(row.closing_date)}</td></tr>`).join("");
      root.innerHTML = `
        <p>Último período disponível: ${esc(data.periods.at(-1)?.label || data.periodLabel)}. ${esc(data.note)}</p>
        <div class="filters">
          <select id="sales-period">${options(data.periods, data.period, "Período")}</select>
          <select id="sales-manager">${options(data.filters.managers, current.get("manager"), "Todos os gestores atuais")}</select>
          <select id="sales-person">${options(data.filters.people, current.get("personId"), "Todos os colaboradores")}</select>
        </div>
        <div class="grid grid-4">
          <div class="card"><span class="kicker">Receita realizada</span><div class="stat-value">${money(data.kpis.revenue)}</div></div>
          <div class="card"><span class="kicker">Vendas</span><div class="stat-value">${num(data.kpis.transactions)}</div><span class="stat-meta">transações do período</span></div>
          <div class="card"><span class="kicker">Com receita</span><div class="stat-value">${num(data.kpis.collaborators_with_revenue)}</div></div>
          <div class="card"><span class="kicker">Meta</span><div class="stat-value">—</div><span class="stat-meta">Ainda não configurado</span></div>
        </div>
        <div class="section-head"><div><h2>Ranking por receita</h2></div></div>
        <div class="card table-wrap"><table><tr><th>#</th><th>Colaborador</th><th>Gestor atual</th><th>Receita</th><th>Conciliação</th></tr>${ranking || "<tr><td colspan='5'>Nenhum registro encontrado</td></tr>"}</table></div>
        <div class="grid grid-2" style="margin-top:16px">
          ${box("Receita por marca", `<table><tr><th>Marca</th><th>Receita</th></tr>${brands || "<tr><td colspan='2'>Sem dados disponíveis</td></tr>"}</table>`)}
          ${box("Por gestor atual", `<table><tr><th>Gestor</th><th>Receita</th><th>Com receita</th></tr>${managers}</table>`)}
        </div>
        <div class="section-head"><div><h2>Evolução mensal</h2></div></div>
        <div class="card table-wrap"><table><tr><th>Período</th><th>Receita</th><th>Colaboradores com receita</th></tr>${evolution}</table></div>
        <div class="section-head"><div><h2>Vendas detalhadas</h2></div></div>
        <div class="card table-wrap"><table><tr><th>Colaborador</th><th>Franquia</th><th>Franqueado</th><th>Receita</th><th>Sinal</th><th>Data do sinal</th><th>Finalização</th><th>Data da finalização</th></tr>${detail || "<tr><td colspan='8'>Nenhum registro encontrado</td></tr>"}</table></div>`;
      const apply = () => {
        const params = new URLSearchParams();
        const period = root.querySelector("#sales-period").value;
        const manager = root.querySelector("#sales-manager").value;
        const person = root.querySelector("#sales-person").value;
        if (period) params.set("period", period);
        if (manager) params.set("manager", manager);
        if (person) params.set("personId", person);
        root.dataset.query = params.toString();
        loadSales();
      };
      ["#sales-period", "#sales-manager", "#sales-person"].forEach((selector) => root.querySelector(selector).onchange = apply);
    } catch (error) {
      root.innerHTML = box("Resultados comerciais", `<p class="live-error">${esc(error.message)}</p>`);
    }
  }

  async function loadAdmin() {
    const root = document.getElementById("admin-live");
    if (!root || state.user.role !== "admin") return;
    const data = await api("/api/admin/overview");
    const imports = await api("/api/admin/imports");
    const pending = data.reasons.filter((reason) => reason.config_pending);
    root.innerHTML = `
      <div class="section-head"><div><span class="eyebrow">Operação real</span><h2>ADP, catálogo e acessos</h2></div></div>
      <div class="grid grid-2">
        ${box("Importar ADP", `<form id="import-adp"><input type="file" name="file" accept=".xlsx" required><label><input type="checkbox" name="force"> Forçar reprocessamento</label><button class="btn btn-primary">Importar</button></form><p id="import-adp-msg"></p>`)}
        ${box("Importar catálogo", `<form id="import-catalog"><input type="file" name="file" accept=".xlsx" required><label><input type="checkbox" name="force"> Forçar reprocessamento</label><button class="btn btn-primary">Importar</button></form><p id="import-catalog-msg"></p>`)}
      </div>
      ${box("Importações", `<div class="table-wrap"><table><tr><th>Quando</th><th>Tipo</th><th>Arquivo</th><th>Hash</th><th>Criados</th><th>Avisos</th></tr>${imports.imports.map((item) => `<tr><td>${esc(item.finished_at || item.created_at)}</td><td>${esc(item.kind)}</td><td>${esc(item.filename)}</td><td>${esc(item.sha256.slice(0, 12))}</td><td>${num(item.created_count)}</td><td>${num(item.warning_count)}</td></tr>`).join("")}</table></div>`)}
      ${box("Catálogo pendente", `<p>${pending.length} motivos com configuração pendente.</p><div class="table-wrap"><table><tr><th>Área</th><th>Código</th><th>Motivo</th><th>Faltando</th></tr>${pending.slice(0, 20).map((reason) => `<tr><td>${esc(reason.area_name)}</td><td>${esc(reason.catalog_code || "—")}</td><td>${esc(reason.title)}</td><td>${esc((reason.pending_fields || []).join(", "))}</td></tr>`).join("")}</table></div>`)}
      ${box("Reconciliação de nomes", data.reconciliations.length ? `<ul>${data.reconciliations.map((item) => `<li>${esc(item.raw_name)}</li>`).join("")}</ul>` : "<p>Nenhuma pendência aberta além das já registradas na carga.</p>")}
      ${box("Novo usuário", `<form id="new-user" class="filters"><input name="name" placeholder="Nome" required><input name="email" type="email" placeholder="E-mail" required><input name="password" type="password" placeholder="Senha" required><select name="role"><option>admin</option><option>diretoria</option><option>gg</option><option>gestor</option><option>colaborador</option><option>viewer</option></select><button class="btn btn-primary">Criar</button></form><p id="user-msg"></p>`)}`;
    bindImport("import-adp", "/api/admin/imports/adp");
    bindImport("import-catalog", "/api/admin/imports/tickets");
    root.querySelector("#new-user").onsubmit = async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      await api("/api/admin/users", { method: "POST", body: JSON.stringify(Object.fromEntries(form.entries())) });
      root.querySelector("#user-msg").textContent = "Usuário criado.";
    };
  }

  function bindImport(id, url) {
    const form = document.getElementById(id);
    form.onsubmit = async (event) => {
      event.preventDefault();
      const body = new FormData(form);
      const force = body.get("force") ? "?force=1" : "";
      body.delete("force");
      const msg = document.getElementById(`${id}-msg`);
      msg.textContent = "Importando…";
      try {
        const result = await api(`${url}${force}`, { method: "POST", body });
        msg.textContent = result.alreadyImported ? "Este arquivo já foi importado." : "Importação concluída.";
      } catch (error) {
        msg.textContent = error.message;
      }
    };
  }

  async function boot() {
    mountShell();
    await Promise.allSettled([loadHome(), loadAdp(), loadTickets(), loadReports(), loadAdmin(), loadPeople(), loadFinance(), loadSales()]);
    document.querySelectorAll(".nav-btn").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.page === "adp") loadAdp();
        if (button.dataset.page === "chamados") loadTickets();
        if (button.dataset.page === "relatorios") loadReports();
        if (button.dataset.page === "admin") loadAdmin();
        if (button.dataset.page === "inicio") loadHome();
        if (button.dataset.page === "pessoas") loadPeople();
        if (button.dataset.page === "financeiro") loadFinance();
        if (button.dataset.page === "metas") loadSales();
      });
    });
    const logout = document.createElement("button");
    logout.className = "btn btn-ghost";
    logout.textContent = "Sair";
    logout.onclick = async () => { await api("/api/auth/logout", { method: "POST" }); location.reload(); };
    document.querySelector(".topbar-actions")?.prepend(logout);
  }

  api("/api/auth/me").then((result) => { state.user = result.user; boot(); }).catch(() => gate());
})();
