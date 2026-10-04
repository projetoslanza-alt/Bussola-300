(() => {
  const ROLES = {
    colaborador: "Colaborador",
    gestor: "Gestor",
    gg: "Gente & Gestão",
    diretoria: "Diretoria",
    admin: "Administrador"
  };

  const MODULES = [
    ["inicio", "Início", "Visão geral"],
    ["news", "News", "Visão geral"],
    ["metas", "Metas & Performance", "Visão geral"],
    ["universidade", "Universidade 300", "Conhecimento"],
    ["treinamentos", "Treinamentos", "Conhecimento"],
    ["materiais", "Materiais de Venda", "Conhecimento"],
    ["pessoas", "Gestão de Pessoas", "Pessoas & Governança"],
    ["adp", "ADP", "Pessoas & Governança"],
    ["recrutamento", "Recrutamento & Seleção", "Pessoas & Governança"],
    ["documentos", "Documentos & Compliance", "Pessoas & Governança"],
    ["chamados", "Chamados", "Operação"],
    ["financeiro", "Financeiro", "Gestão"],
    ["gamificacao", "Gamificação", "Gestão"],
    ["relatorios", "Relatórios", "Gestão"],
    ["admin", "Administração", "Sistema"]
  ];

  const LEVELS = ["none", "view", "manage"];

  function accessTemplate() {
    const all = (level) => Object.fromEntries(MODULES.map(([id]) => [id, level]));
    return {
      colaborador: { ...all("view"), pessoas: "none", recrutamento: "none", financeiro: "none", relatorios: "none", admin: "none" },
      gestor: { ...all("view"), recrutamento: "none", financeiro: "none", admin: "none", pessoas: "manage", treinamentos: "manage", metas: "manage", adp: "view", relatorios: "view" },
      gg: { ...all("manage"), financeiro: "none", admin: "none", relatorios: "view", chamados: "view", gamificacao: "view" },
      diretoria: { ...all("view"), recrutamento: "view", admin: "none", financeiro: "view", pessoas: "view", relatorios: "view" },
      admin: all("manage")
    };
  }

  const ROUTES = {
    Comercial: ["Material desatualizado", "Dúvida de proposta", "Apoio a cliente"],
    Operações: ["Processo interno", "Padrão de unidade", "Rotina de equipe"],
    "Gente & Gestão": ["Cadastro", "Benefício", "Documento trabalhista"],
    Financeiro: ["Dúvida de lançamento", "ROI e custos", "Reembolso"],
    Tecnologia: ["Acesso", "Erro de sistema", "Melhoria"],
    Universidade: ["Matrícula", "Conteúdo", "Certificado"],
    Facilities: ["Estrutura", "Suprimento", "Outro"]
  };

  const WIZARD = ["Área", "Motivo", "Contexto", "Impacto", "Evidências", "Encaminhamento", "Revisão"];
  const TICKET_COLUMNS = ["Aberto", "Em atendimento", "Aguardando", "Resolvido"];
  const PIPELINE = ["Inscritos", "Triagem", "Entrevista", "Avaliação", "Proposta", "Contratado"];
  const MATERIAL_TYPES = ["Apresentação", "Script", "Playbook", "Case", "Vídeo", "Documento", "Guia"];
  const NEWS_CATS = ["Todas", "Geral", "Metas", "Treinamento", "Comercial", "Pessoas", "Operação"];

  const REPORTS = {
    exec: ["Visão Geral 300", "Pessoas, metas, treinamentos, ADP, financeiro, chamados e Universidade.", "Este relatório será preenchido quando houver dados disponíveis."],
    people: ["People Analytics", "Headcount, entradas, saídas, desempenho, ADP, 1:1, PDI, treinamento e custo.", "Sem dados disponíveis de pessoas."],
    adp: ["ADP Analytics", "Score, evolução, equipes, distribuição, 9-box, talentos, desenvolvimento e conclusão.", "Nenhuma avaliação registrada."],
    roi: ["ROI & Financeiro", "ROI geral, por equipe, individual, custo, contribuição, evolução e qualidade.", "Ainda não existem dados financeiros integrados."],
    training: ["Treinamentos & NPS", "Realizados, participação, presença, ausência, NPS, avaliações e aderência.", "Nenhum treinamento encontrado."],
    goals: ["Metas & Performance", "Campanhas, atingimento e evolução.", "Nenhuma campanha com realizado."],
    tickets: ["Chamados", "Recebidos, resolvidos, backlog, SLA e tempos.", "Nenhum chamado com medição de prazo."],
    game: ["Gamificação & Engajamento", "Usuários engajados, pontos, desafios, badges, ranking e evolução.", "O ranking será exibido após o início da campanha."]
  };

  const HOME = {
    pessoal: [
      ["Meta atual", "Sem dados disponíveis", "A meta do período aparece quando for publicada.", "metas"],
      ["Cursos", "Nenhum curso em andamento", "O catálogo da Universidade 300 começa vazio.", "universidade"],
      ["Treinamentos", "Nenhum treinamento cadastrado", "A agenda mostra o período, sem eventos inventados.", "treinamentos"],
      ["ADP", "Nenhum ciclo ADP disponível", "O resultado publicado aparecerá para quem for elegível.", "adp"],
      ["Documentos", "Nenhum documento pendente", "Aceites de política, termo e LGPD entram aqui.", "documentos"],
      ["Chamados", "Nenhum chamado nesta sessão", "A abertura segue área, motivo, contexto e impacto.", "chamados"],
      ["Gamificação", "Sem pontos registrados", "Os pontos dependem de regras, não de uma tabela fixa.", "gamificacao"]
    ],
    gestor: [
      ["Pessoas", "Sem dados disponíveis"],
      ["ADP da equipe", "Nenhum ciclo ADP disponível"],
      ["Metas", "Sem dados disponíveis"],
      ["1:1", "Nenhum 1:1 registrado"],
      ["PDI", "Nenhum PDI registrado"],
      ["Treinamentos", "Nenhum treinamento da equipe"],
      ["Evolução", "Sem série histórica"]
    ],
    gg: [
      ["Headcount", "Sem dados disponíveis"],
      ["Treinamentos", "Nenhum treinamento cadastrado"],
      ["ADP", "Nenhum ciclo ADP disponível"],
      ["PDI", "Nenhum PDI registrado"],
      ["Recrutamento", "Nenhuma vaga cadastrada"],
      ["Presença", "Nenhuma lista de presença"],
      ["Desempenho", "Sem dados disponíveis"]
    ],
    diretoria: [
      ["Pessoas", "Sem dados disponíveis"],
      ["Metas", "Sem dados disponíveis"],
      ["Treinamentos", "Nenhum treinamento cadastrado"],
      ["ADP", "Nenhum ciclo ADP disponível"],
      ["Financeiro", "Dados financeiros ainda não integrados"],
      ["Chamados", "Nenhum chamado para consolidar"],
      ["Universidade", "Nenhum curso em andamento"]
    ]
  };

  const state = {
    role: "colaborador",
    view: "inicio",
    access: accessTemplate(),
    seq: 1,
    newsCategory: "Todas",
    materialType: "Todos",
    calendar: { cursor: new Date(), mode: "month", selected: "" },
    manualNotes: {},
    trainingFilters: { team: "", theme: "", format: "", mode: "" },
    wizardStep: 0,
    impact: "",
    courseId: null,
    reviewScore: "",
    npsScore: "",
    drag: null,
    news: [],
    campaigns: [],
    courses: [],
    enrollments: {},
    trainings: [],
    participants: {},
    reviews: [],
    nps: [],
    materials: [],
    brands: [],
    teams: [],
    positions: [],
    departments: [],
    units: [],
    people: [],
    oneOnOnes: [],
    pdis: [],
    adpCycles: [],
    adpFields: [],
    vacancies: [],
    candidates: [],
    interviews: [],
    proposals: [],
    documents: [],
    acks: [],
    tickets: [],
    challenges: [],
    pointRules: [],
    levels: [],
    badges: [],
    history: [],
    notifications: [],
    roiConfig: null
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function id() { return `s${state.seq++}`; }
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }
  function toast(message) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    $("#toasts").appendChild(el);
    setTimeout(() => el.remove(), 3400);
  }
  function fmtDate(value) {
    if (!value) return "Data não informada";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return esc(value);
    return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  }
  function todayISO() {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  }
  function roleCan(moduleId, level = "view") {
    const current = state.access[state.role][moduleId] || "none";
    return LEVELS.indexOf(current) >= LEVELS.indexOf(level);
  }
  function notify(text) {
    state.notifications.unshift({ id: id(), text, at: new Date().toISOString() });
    renderNotifications();
  }
  function pushHistory(text) {
    state.history.unshift({ id: id(), text, at: new Date().toISOString() });
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }
  function markError(form, message) {
    const el = $("[data-error]", form);
    if (el) el.textContent = message || "";
    if (message) toast(message);
  }
  function requireForm(form) {
    const missing = [...form.querySelectorAll("[required]")].filter((field) => !String(field.value).trim());
    if (missing.length) {
      missing[0].focus();
      markError(form, "Preencha os campos obrigatórios.");
      return false;
    }
    markError(form, "");
    return true;
  }

  function openModal(title, body, foot = "") {
    $("#modal-title").textContent = title;
    $("#modal-body").innerHTML = body;
    $("#modal-foot").innerHTML = foot;
    $("#modal-root").hidden = false;
    const focusable = $("#modal-root button, #modal-root input, #modal-root textarea, #modal-root select");
    if (focusable) focusable.focus();
  }
  function closeModal() {
    $("#modal-root").hidden = true;
    $("#modal-body").innerHTML = "";
    $("#modal-foot").innerHTML = "";
  }
  function closeDropdowns() {
    $$(".dropdown").forEach((el) => { el.hidden = true; });
    $$("[data-dropdown]").forEach((el) => el.setAttribute("aria-expanded", "false"));
  }

  function go(view, options = {}) {
    const moduleId = $(`#view-${view}`)?.dataset.module;
    if (moduleId && !roleCan(moduleId)) {
      toast("Esta visão do protótipo não inclui esse módulo.");
      view = "inicio";
    }
    state.view = view;
    $$(".view").forEach((el) => { el.hidden = el.id !== `view-${view}`; });
    const currentModule = $(`#view-${view}`)?.dataset.module;
    const isSub = !MODULES.some(([moduleId]) => moduleId === view);
    $$(".nav-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.nav === view || (isSub && btn.dataset.module === currentModule));
    });
    const meta = MODULES.find(([id]) => id === ($(`#view-${view}`)?.dataset.module));
    $("#crumb-group").textContent = meta ? meta[2] : "Bússola 300";
    const titles = {
      curso: "Curso",
      "roi-detalhe": "Detalhe do ROI",
      relatorio: "Relatório"
    };
    $("#crumb-title").textContent = titles[view] || (meta ? meta[1] : "Início");
    if (!options.silent) location.hash = view;
    closeDropdowns();
    if (window.innerWidth < 1024) closeSidebar();
    $("#global-search").value = "";
    applySearch();
    if (view === "curso") renderCourse();
    if (view === "treinamentos") renderCalendar();
  }

  function applyAccess() {
    $$("[data-module]").forEach((el) => {
      if (el.classList.contains("view")) return;
      const allowed = roleCan(el.dataset.module);
      el.hidden = !allowed;
    });
    $$("[data-requires='manage']").forEach((el) => {
      const moduleId = el.closest("[data-module]")?.dataset.module || state.view;
      el.hidden = !roleCan(moduleId, "manage");
    });
    $$("[data-roles]").forEach((el) => {
      const roles = el.dataset.roles.split(",");
      el.hidden = !roles.includes(state.role);
    });
    $$(".view").forEach((view) => {
      const selected = view.querySelector("[role='tablist'] [aria-selected='true']");
      if (selected?.hidden) {
        const next = [...view.querySelectorAll("[role='tablist'] [data-tab]")].find((btn) => !btn.hidden);
        if (next) activateTab(next);
      }
    });
    $("#profile-role").textContent = `Visão atual: ${ROLES[state.role]}`;
    $("#role-switch").value = state.role;
    if (!roleCan($(`#view-${state.view}`)?.dataset.module || "inicio")) go("inicio");
  }

  function card(kicker, title, text, nav) {
    const button = nav ? `<button class="btn btn-secondary" type="button" data-nav="${nav}">Abrir módulo</button>` : "";
    return `<article class="card" data-search="${esc(kicker)} ${esc(title)}"><p class="card-kicker">${esc(kicker)}</p><p class="strong-empty">${esc(title)}</p><p class="muted">${esc(text || "")}</p>${button}</article>`;
  }

  function renderHome() {
    $("#home-cards").innerHTML = HOME.pessoal.map(([k, t, d, n]) => card(k, t, d, n)).join("");
    $$("[data-home]").forEach((el) => {
      el.innerHTML = HOME[el.dataset.home].map(([k, t]) => card(k, t, "Estrutura pronta. Sem dado real para preencher.")).join("");
    });
    const items = [];
    state.news.filter((item) => item.important && visibleNews(item)).forEach((item) => items.push(`News importante: ${item.title}`));
    state.trainings.forEach((item) => items.push(`Treinamento nesta sessão: ${item.title}`));
    state.documents.filter((doc) => !state.acks.includes(doc.id) && doc.status === "publicado").forEach((doc) => items.push(`Documento aguardando aceite: ${doc.title}`));
    state.adpCycles.filter((cycle) => cycle.status === "aberto" || cycle.status === "publicado").forEach((cycle) => items.push(`Ciclo ADP ${cycle.status}: ${cycle.name}`));
    state.tickets.filter((ticket) => ticket.status !== "Resolvido").forEach((ticket) => items.push(`Chamado em aberto: ${ticket.area}`));
    Object.entries(state.enrollments).forEach(([courseId, enrollment]) => {
      const course = state.courses.find((item) => item.id === courseId);
      if (!course || enrollment.done) return;
      items.push(`Curso em andamento: ${course.title}`);
    });
    const prepared = [
      ["Avaliação pendente", "Nenhuma avaliação de treinamento pendente.", "treinamentos"],
      ["Treinamento", "Nenhum treinamento próximo.", "treinamentos"],
      ["Documento", "Nenhum documento aguardando aceite.", "documentos"],
      ["ADP", "Nenhum ciclo ADP disponível.", "adp"],
      ["Curso", "Nenhum curso pendente.", "universidade"],
      ["Chamado", "Nenhum chamado atualizado.", "chamados"]
    ];
    $("#attention-list").innerHTML = items.length
      ? `<div class="stack">${items.map((text) => `<article class="item"><strong>${esc(text)}</strong><p class="meta">Gerado nesta sessão do protótipo.</p></article>`).join("")}</div>`
      : `<div class="grid grid-3">${prepared.map(([title, text, nav]) => card(title, text, "O item aparece quando houver dado real.", nav)).join("")}</div>`;
  }

  function visibleNews(item) {
    if (item.status === "rascunho" || item.status === "arquivado") return roleCan("news", "manage");
    if (item.schedule && new Date(item.schedule).getTime() > Date.now() && !roleCan("news", "manage")) return false;
    if (item.audience === "Todos" || item.audience === "Colaboradores") return true;
    if (item.audience === "Gestores") return ["gestor", "gg", "diretoria", "admin"].includes(state.role);
    if (item.audience === "Gente & Gestão") return ["gg", "admin"].includes(state.role);
    if (item.audience === "Diretoria") return ["diretoria", "admin"].includes(state.role);
    return true;
  }

  function renderList(name, html, emptyHtml) {
    const nodes = $$(`[data-list="${name}"]`);
    if (!nodes.length) return;
    nodes.forEach((el) => { el.innerHTML = html || emptyHtml; });
  }

  function emptyBox(title, text) {
    return `<div class="empty"><div class="mark"></div><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
  }

  function removeButton(kind, itemId) {
    return `<button class="btn btn-ghost" type="button" data-action="remove" data-kind="${kind}" data-id="${itemId}">Remover desta sessão</button>`;
  }

  function newsCard(item, featured) {
    return `<article class="${featured ? "panel" : "item"}" data-search="${esc(item.title)} ${esc(item.description)}">
      <div class="news-visual">${item.image ? `<img alt="" src="${esc(item.image)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'Imagem indisponível'}))">` : "Sem imagem"}</div>
      <header><div><p class="card-kicker">${esc(item.category)}</p><h3>${esc(item.title)}</h3><p class="meta">Publicado em ${fmtDate(item.publishedAt || item.schedule)} · ${esc(item.author || "Autor não informado")}</p></div>
      <span class="badge ${item.status === "publicado" ? "badge-published" : "badge-pending"}">${esc(item.status)}</span></header>
      <p>${esc(item.description)}</p>
      ${featured ? `<p>${esc(item.content)}</p>` : ""}
      <p class="meta">Público: ${esc(item.audience)}${item.linkType ? ` · Vínculo com ${esc(item.linkType)}` : ""}</p>
      <div class="inline-actions">
        ${item.cta && item.linkType ? `<button class="btn btn-primary" type="button" data-nav="${esc(item.linkType)}">${esc(item.cta)}</button>` : ""}
        ${removeButton("news", item.id)}
      </div>
    </article>`;
  }

  function renderNews() {
    const query = ($("#news-q")?.value || "").toLowerCase();
    const rows = state.news.filter((item) => {
      if (!visibleNews(item)) return false;
      if (state.newsCategory !== "Todas" && item.category !== state.newsCategory) return false;
      if (query && !`${item.title} ${item.category} ${item.author || ""} ${item.description}`.toLowerCase().includes(query)) return false;
      return true;
    });
    const feature = $("#news-feature");
    if (feature) {
      feature.innerHTML = rows[0]
        ? newsCard(rows[0], true)
        : emptyBox("Nenhum destaque", "Comunicados estratégicos publicados nesta sessão ocupam este espaço.");
    }
    const feed = rows.slice(rows.length ? 1 : 0);
    renderList("news", feed.map((item) => newsCard(item, false)).join(""), emptyBox("Nenhuma news no feed", "Os demais comunicados aparecem aqui. Nada foi pré-carregado."));
  }

  function sourceLabel(source) {
    if (source === "Integração") return "Aguardando integração";
    if (source === "Importação") return "Aguardando importação";
    if (source === "Cálculo") return "Aguardando cálculo";
    return "Não informado";
  }

  function renderCampaigns() {
    renderList("campaigns", state.campaigns.map((item) => `
      <article class="item"><header><h3>${esc(item.name)}</h3><span class="badge badge-source">${esc(item.source)}</span></header>
      <p>${esc(item.description || "Sem descrição.")}</p>
      <p class="meta">${esc(item.scope)} · ${esc(item.period)}${item.customPeriod ? ` · ${esc(item.customPeriod)}` : ""} · Indicador: ${esc(item.indicator)} (${esc(item.unit || "unidade não informada")})</p>
      <p>Realizado: ${sourceLabel(item.source)}. Percentual de atingimento não calculado.</p>
      ${removeButton("campaigns", item.id)}</article>`).join(""),
      `<div class="empty"><div class="mark"></div><h3>Nenhuma campanha cadastrada</h3><p>Periodicidades previstas: diária, semanal, mensal, trimestral e customizada.</p></div>`);
    const board = $("#metas-board");
    if (board) {
      const current = state.campaigns[0];
      const blocks = [
        ["Campanha atual", current ? current.name : "Nenhuma campanha ativa", current ? "Realizado ainda não informado pela origem." : "A campanha do período aparece aqui quando for publicada."],
        ["Minha meta", "Sem dados disponíveis", "A meta individual depende de atribuição e de realizado da origem."],
        ["Minha equipe", "Sem dados disponíveis", "O recorte de equipe, função e área fica vazio até haver realizado."],
        ["Indicadores", state.campaigns.length ? `${state.campaigns.length} indicador(es) nesta sessão` : "Nenhum indicador disponível", "Nome, unidade, meta, realizado e origem entram com a campanha. Sem percentual inventado."],
        ["Evolução", "Sem série histórica", "O gráfico só nasce com períodos reais."],
        ["Histórico de campanhas", state.campaigns.length > 1 ? "Há campanhas nesta sessão" : "Nenhuma campanha anterior", "Campanhas desta sessão aparecem na aba Campanhas."]
      ];
      board.innerHTML = blocks.map(([title, strong, text], index) => `<article class="card"><p class="card-kicker">${title}</p><p class="strong-empty">${esc(strong)}</p><p class="muted">${esc(text)}</p>${index === 5 ? `<button class="btn btn-secondary" type="button" data-tab="metas-campanhas">Ver campanhas</button>` : ""}</article>`).join("");
    }
    renderList("indicators", state.campaigns.map((item) => `
      <article class="item"><h3>${esc(item.indicator)}</h3><p class="meta">${esc(item.name)} · origem ${esc(item.source)} · responsável ${esc(item.owner || "não informado")}</p><p>Meta e realizado ainda não formam um percentual.</p></article>`).join(""),
      `<div class="empty"><h3>Nenhum indicador disponível</h3><p>Os indicadores nascem junto com a campanha.</p></div>`);
  }

  function lessonsOf(course) {
    return course.modules.flatMap((mod) => mod.lessons);
  }

  function renderCourses() {
    const tab = $("[data-tab^='uni-'][aria-selected='true']")?.dataset.tab || "uni-andamento";
    if (tab === "uni-trilhas") {
      renderList("courses", "", emptyBox("Nenhuma trilha recomendada", "Trilhas aparecem quando houver regra de recomendação. Nenhum curso foi inventado para preencher esta seção."));
      return;
    }
    let rows = state.courses;
    if (tab === "uni-andamento") rows = rows.filter((course) => state.enrollments[course.id] && !state.enrollments[course.id].done);
    if (tab === "uni-presencial") rows = rows.filter((course) => course.modality === "Presencial");
    if (tab === "uni-obrigatorios") rows = rows.filter((course) => course.required === "Obrigatório");
    if (tab === "uni-concluidos") rows = rows.filter((course) => state.enrollments[course.id]?.done);
    const copy = {
      "uni-catalogo": ["Nenhum curso no catálogo", "O fluxo previsto é catálogo, matrícula, conteúdo, progresso, conclusão e certificado."],
      "uni-andamento": ["Nenhum curso em andamento", "A matrícula feita nesta sessão aparece em Continue aprendendo."],
      "uni-presencial": ["Nenhum curso presencial", "Cursos EAD ficam de fora deste recorte."],
      "uni-obrigatorios": ["Nenhum curso obrigatório", "Cursos marcados como obrigatórios aparecem aqui."],
      "uni-concluidos": ["Nenhum certificado disponível", "O certificado depende da conclusão das aulas nesta sessão."]
    }[tab];
    renderList("courses", rows.map((course) => `
      <article class="item" data-search="${esc(course.title)}"><header><h3>${esc(course.title)}</h3><span class="badge">${esc(course.modality)}</span></header>
      <p>${esc(course.description)}</p>
      <p class="meta">${esc(course.category)} · ${esc(course.required)} · ${esc(course.instructor || "Instrutor não informado")}</p>
      <div class="inline-actions"><button class="btn btn-primary" type="button" data-action="open-course" data-id="${course.id}">Abrir curso</button>${removeButton("courses", course.id)}</div></article>`).join(""),
      emptyBox(copy[0], copy[1]));
  }

  function renderCourse() {
    const course = state.courses.find((item) => item.id === state.courseId);
    const root = $("#course-detail");
    if (!course) {
      root.innerHTML = `<div class="empty"><h3>Nenhum curso selecionado</h3><p>Volte ao catálogo e abra um curso criado nesta sessão.</p></div>`;
      return;
    }
    const enrollment = state.enrollments[course.id];
    const lessons = lessonsOf(course);
    const doneCount = enrollment ? enrollment.lessons.length : 0;
    const width = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;
    root.innerHTML = `
      <div class="news-visual">${course.cover ? `<img alt="" src="${esc(course.cover)}">` : "Capa não informada"}</div>
      <h1>${esc(course.title)}</h1>
      <p class="lede">${esc(course.description)}</p>
      <p class="meta">Instrutor: ${esc(course.instructor || "não informado")} · ${esc(course.modality)} · ${esc(course.required)} · ${esc(course.duration || "Duração não informada")} · ${esc(course.audience || "Público não informado")}</p>
      <div class="progress" aria-hidden="true"><span style="width:${width}%"></span></div>
      <p class="muted">${enrollment ? `${doneCount} de ${lessons.length} aulas concluídas nesta sessão.` : "Sem matrícula. O progresso não é calculado só na tela."}</p>
      <div class="inline-actions section">
        ${enrollment ? "" : `<button class="btn btn-primary" type="button" data-action="enroll" data-id="${course.id}">Iniciar matrícula nesta sessão</button>`}
        ${enrollment && lessons.length && doneCount === lessons.length ? `<button class="btn btn-secondary" type="button" data-action="certificate" data-id="${course.id}">Ver certificado demonstrativo</button>` : ""}
      </div>
      <div class="panel section" data-requires="manage" ${roleCan("universidade", "manage") ? "" : "hidden"}>
        <h2>Adicionar módulo</h2>
        <form data-form="module" class="form-grid"><label class="field"><span>Título do módulo</span><input name="title" required></label><div class="field"><span>&nbsp;</span><button class="btn btn-secondary" type="submit">Adicionar módulo</button></div></form>
      </div>
      <div class="section stack">${course.modules.map((mod) => `
        <details class="acc" open><summary>${esc(mod.title)}</summary><div class="acc-body">
          ${mod.lessons.map((lesson) => `<article class="item"><header><strong>${esc(lesson.title)}</strong><span class="badge">${esc(lesson.type)}</span></header>
            ${enrollment ? `<button class="btn btn-secondary" type="button" data-action="complete-lesson" data-course="${course.id}" data-lesson="${lesson.id}" ${enrollment.lessons.includes(lesson.id) ? "disabled" : ""}>${enrollment.lessons.includes(lesson.id) ? "Aula concluída" : "Concluir aula"}</button>` : `<p class="muted">Matricule-se para registrar a aula.</p>`}
          </article>`).join("") || `<p>Nenhuma aula neste módulo.</p>`}
          <form data-form="lesson" data-module="${mod.id}" class="form-grid" ${roleCan("universidade", "manage") ? "" : "hidden"}>
            <label class="field"><span>Aula</span><input name="title" required></label>
            <label class="field"><span>Tipo</span><select name="type"><option>Vídeo</option><option>Texto</option><option>Arquivo</option><option>Link</option><option>Quiz</option></select></label>
            <div class="field"><span>&nbsp;</span><button class="btn btn-secondary" type="submit">Adicionar aula</button></div>
          </form>
        </div></details>`).join("") || `<div class="empty"><h3>Nenhum módulo</h3><p>O conteúdo do curso ainda não foi estruturado.</p></div>`}
      </div>
      <div class="grid grid-2 section">
        <article class="card"><h2>Materiais</h2><p class="muted">Nenhum material anexado a este curso.</p></article>
        <article class="card"><h2>Certificado</h2><p class="muted">${enrollment?.done ? "A conclusão desta sessão libera o certificado demonstrativo." : "O certificado aparece depois da conclusão de todas as aulas."}</p></article>
      </div>`;
  }

  function monthLabel(date) {
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
  }

  function filteredTrainings() {
    return state.trainings.filter((item) => {
      const filters = state.trainingFilters;
      if (filters.team && item.team !== filters.team) return false;
      if (filters.theme && !item.theme.toLowerCase().includes(filters.theme.toLowerCase())) return false;
      if (filters.format && item.format !== filters.format) return false;
      if (filters.mode && item.format !== filters.mode) return false;
      return true;
    });
  }

  function renderCalendar() {
    const root = $("#calendar");
    if (!root) return;
    const cursor = new Date(state.calendar.cursor);
    const items = filteredTrainings();
    $("#training-filter-note").textContent = items.length !== state.trainings.length
      ? "Filtro aplicado. A agenda mostra só os treinamentos desta sessão que combinam com o recorte."
      : "";
    if (state.calendar.mode === "list") {
      root.innerHTML = items.length ? items.map((item) => trainingCard(item)).join("") : `<div class="empty"><h3>Nenhum treinamento encontrado</h3><p>A lista acompanha os filtros e o que for cadastrado nesta sessão.</p></div>`;
      renderDayList(items);
      return;
    }
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = new Date(start);
    gridStart.setDate(1 - gridStart.getDay());
    let cells = "";
    for (let i = 0; i < (state.calendar.mode === "week" ? 7 : 42); i += 1) {
      const day = new Date(gridStart);
      if (state.calendar.mode === "week") {
        const weekStart = new Date(cursor);
        weekStart.setDate(cursor.getDate() - cursor.getDay());
        day.setTime(weekStart.getTime());
        day.setDate(weekStart.getDate() + i);
      } else {
        day.setDate(gridStart.getDate() + i);
      }
      const iso = day.toLocaleDateString("sv-SE");
      const hits = items.filter((item) => item.date === iso);
      const outside = day.getMonth() !== cursor.getMonth() && state.calendar.mode === "month";
      const selected = iso === (state.calendar.selected || todayISO());
      cells += `<button type="button" class="day${outside ? " is-out" : ""}${selected ? " is-selected" : ""}" data-action="pick-day" data-date="${iso}"><strong>${day.getDate()}</strong>${hits.map((hit) => `<em>${esc(hit.title)}</em>`).join("")}</button>`;
    }
    const title = state.calendar.mode === "week" ? "Semana em exibição" : monthLabel(cursor);
    root.innerHTML = `<div class="cal"><div class="split"><strong>${title}</strong><span class="muted">${items.length ? "Há treinamentos desta sessão no recorte." : "Nenhum treinamento neste período."}</span></div><div class="cal-head">${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => `<span class="dow">${d}</span>`).join("")}</div><div class="cal-grid">${cells}</div></div>`;
    renderDayList(items);
  }

  function renderDayList(items) {
    const box = $("#day-list");
    if (!box) return;
    const day = state.calendar.selected || todayISO();
    const hits = (items || filteredTrainings()).filter((item) => item.date === day);
    box.innerHTML = `<h2>Dia selecionado</h2><p class="meta">${esc(day)}</p>${hits.length ? hits.map((item) => `<button class="btn btn-secondary" type="button" data-action="show-training" data-id="${item.id}">${esc(item.title)}</button>`).join("") : `<p class="muted">Nenhum treinamento neste dia.</p>`}`;
  }

  function trainingCard(item) {
    return `<article class="item" data-search="${esc(item.title)} ${esc(item.theme)}"><header><h3>${esc(item.title)}</h3><span class="badge">${esc(item.format)}</span></header><p class="meta">${esc(item.date)} · ${esc(item.theme)} · ${esc(item.team || "Equipe não informada")} · ${esc(item.owner || "Responsável não informado")}</p>${item.newsId ? `<p class="meta">Vinculado a uma news desta sessão.</p>` : ""}${removeButton("trainings", item.id)}</article>`;
  }

  function renderTrainings() {
    const overview = $("#training-overview");
    if (overview) {
      const upcoming = state.trainings.filter((item) => item.date >= todayISO());
      const done = state.trainings.filter((item) => item.date < todayISO());
      const pendingReviews = state.trainings.filter((item) => !state.reviews.some((review) => review.trainingId === item.id));
      const cards = [
        ["Próximos treinamentos", upcoming.length ? `${upcoming.length} nesta sessão` : "Nenhum treinamento próximo", "A agenda mostra só o que for cadastrado aqui."],
        ["Treinamentos realizados", done.length ? `${done.length} com data anterior` : "Nenhum treinamento realizado", "Datas passadas desta sessão entram neste cartão."],
        ["Avaliações pendentes", state.trainings.length ? (pendingReviews.length ? "Há treinamento sem avaliação nesta sessão" : "Avaliações desta sessão registradas") : "Nenhuma avaliação pendente", "A nota não é estimada."],
        ["Participação", "Sem presença consolidada", "P, F e J aparecem depois da marcação na gestão."],
        ["NPS", npsValue() === null ? "Nenhuma resposta de NPS" : `NPS desta sessão: ${npsValue()}`, "O índice usa só respostas enviadas agora."]
      ];
      overview.innerHTML = cards.map(([title, strong, text]) => `<article class="card"><p class="card-kicker">${title}</p><p class="strong-empty">${esc(strong)}</p><p class="muted">${esc(text)}</p></article>`).join("");
    }
    renderList("trainings", state.trainings.map(trainingCard).join(""), `<div class="empty"><div class="mark"></div><h3>Nenhum treinamento cadastrado</h3><p>Crie um treinamento nesta sessão para vê-lo na agenda, na biblioteca e na presença.</p></div>`);
    renderLibrary();
    renderCalendar();
    renderReviews();
  }

  function renderLibrary() {
    const query = ($("#lib-q")?.value || "").toLowerCase();
    const theme = ($("#lib-theme")?.value || "").toLowerCase();
    const format = $("#lib-format")?.value || "";
    const year = $("#lib-year")?.value || "";
    const team = $("#lib-team")?.value || "";
    const owner = ($("#lib-owner")?.value || "").toLowerCase();
    const rows = state.trainings.filter((item) => {
      const blob = `${item.title} ${item.theme} ${item.owner || ""}`.toLowerCase();
      if (query && !blob.includes(query)) return false;
      if (theme && !item.theme.toLowerCase().includes(theme)) return false;
      if (format && item.format !== format) return false;
      if (year && !item.date.startsWith(year)) return false;
      if (team && item.team !== team) return false;
      if (owner && !(item.owner || "").toLowerCase().includes(owner)) return false;
      return true;
    });
    renderList("library", rows.map((item) => `<article class="item"><h3>${esc(item.title)}</h3><p class="meta">${esc(item.theme)} · ${esc(item.format)} · ${esc(item.date.slice(0, 4))} · ${esc(item.team || "Equipe não informada")}</p><p class="muted">Materiais, apresentação, gravação e NPS ficam disponíveis conforme o que for registrado. Nesta sessão, o histórico é o próprio cadastro.</p><button class="btn btn-secondary" type="button" data-action="show-training" data-id="${item.id}">Ver registro</button></article>`).join(""),
      `<div class="empty"><h3>Nenhum treinamento encontrado</h3><p>A biblioteca reúne treinamentos anteriores. Ainda não há itens para o filtro.</p></div>`);
  }

  function npsValue() {
    if (!state.nps.length) return null;
    const promoters = state.nps.filter((item) => item.score >= 9).length;
    const detractors = state.nps.filter((item) => item.score <= 6).length;
    return Math.round(((promoters - detractors) / state.nps.length) * 100);
  }

  function renderReviews() {
    const nps = npsValue();
    $("#nps-summary").innerHTML = nps === null
      ? `<div class="empty"><h3>Nenhuma resposta de NPS</h3><p>O índice não é estimado.</p></div>`
      : `<article class="card"><p class="card-kicker">NPS desta sessão</p><p class="strong-empty">${nps}</p><p class="muted">Calculado só com as respostas enviadas agora. Promotores menos detratores, sobre o total.</p></article>`;
    const rows = [
      ...state.reviews.map((item) => `<article class="item"><h3>Avaliação geral · ${esc(item.score)}</h3><p class="meta">Conteúdo ${esc(item.content || "—")} · Instrutor ${esc(item.instructor || "—")} · Aplicabilidade ${esc(item.applicability || "—")} · Organização ${esc(item.organization || "—")}</p><p>${esc(item.comment)}</p><p class="meta">${esc(trainingName(item.trainingId))} · ${fmtDate(item.at)}</p></article>`),
      ...state.nps.map((item) => `<article class="item"><h3>NPS · nota ${esc(item.score)}</h3><p>${esc(item.comment || "Sem comentário.")}</p><p class="meta">${esc(trainingName(item.trainingId))} · ${fmtDate(item.at)}</p></article>`)
    ];
    renderList("reviews", rows.join(""), `<div class="empty"><h3>Nenhuma avaliação registrada</h3><p>Escolha um treinamento desta sessão, informe a nota e o comentário.</p></div>`);
  }

  function trainingName(itemId) {
    return state.trainings.find((item) => item.id === itemId)?.title || "Treinamento removido";
  }

  function renderAttendance(root) {
    const select = $("[data-attendance-select]", root);
    const list = $("[data-attendance-list]", root);
    const trainingId = select.value;
    const people = state.participants[trainingId] || [];
    const legend = `<div class="legend"><span class="badge badge-done">P · Presente</span><span class="badge badge-pending">F · Falta</span><span class="badge">J · Justificada</span></div>`;
    if (!trainingId) {
      list.innerHTML = `${legend}<div class="empty"><h3>Nenhum participante vinculado</h3><p>Selecione um treinamento criado nesta sessão.</p></div>`;
      return;
    }
    const labels = { P: "Presente", F: "Falta", J: "Justificada" };
    list.innerHTML = legend + (people.length ? people.map((person) => `
      <article class="item"><header><strong>${esc(person.name)}</strong><span class="badge">${esc(labels[person.status] || "Sem marcação")}</span></header>
      <div class="choices">
        ${["P", "F", "J"].map((status) => `<button class="btn btn-secondary" type="button" data-action="set-attendance" data-training="${trainingId}" data-person="${person.id}" data-status="${status}" aria-pressed="${person.status === status}">${status}</button>`).join("")}
      </div>
      <p class="meta">${person.updatedAt ? `Atualizado ${fmtDate(person.updatedAt)}` : "Sem marcação"}</p></article>`).join("")
      : `<div class="empty"><h3>Nenhum participante vinculado</h3><p>Adicione um nome para marcar P, F ou J.</p></div>`);
  }

  function renderAllAttendance() {
    $$("[data-attendance]").forEach(renderAttendance);
  }

  function renderMaterials() {
    const query = ($("#mat-q")?.value || "").toLowerCase();
    const brand = $("#mat-brand")?.value || "";
    const category = ($("#mat-category")?.value || "").toLowerCase();
    const format = ($("#mat-format")?.value || "").toLowerCase();
    const version = ($("#mat-version")?.value || "").toLowerCase();
    const updated = $("#mat-updated")?.value || "";
    const rows = state.materials.filter((item) => {
      const current = item.versions[item.versions.length - 1];
      if (state.materialType !== "Todos" && item.type !== state.materialType) return false;
      if (query && !`${item.title} ${item.category}`.toLowerCase().includes(query)) return false;
      if (brand && item.brandId !== brand) return false;
      if (category && !item.category.toLowerCase().includes(category)) return false;
      if (format && !current.format.toLowerCase().includes(format)) return false;
      if (version && !item.versions.some((entry) => entry.version.toLowerCase().includes(version))) return false;
      if (updated && current.date !== updated) return false;
      return true;
    });
    renderList("materials", rows.map((item) => {
      const current = item.versions[item.versions.length - 1];
      const brandName = state.brands.find((brandItem) => brandItem.id === item.brandId)?.name || "Marca não associada";
      return `<article class="item"><header><h3>${esc(item.title)}</h3><span class="badge">${esc(current.status)}</span></header>
        <p class="meta">${esc(brandName)} · ${esc(item.type)} · versão ${esc(current.version)} · atualizado em ${esc(current.date || "sem data")} · ${esc(current.status)}</p>
        <p class="muted">${item.versions.length > 1 ? `${item.versions.length} versões nesta sessão. A vigente é a última.` : "Histórico inicia nesta versão."}</p>
        <div class="inline-actions">
          <button class="btn btn-secondary" type="button" data-action="material-version" data-id="${item.id}">Registrar nova versão</button>
          <button class="btn btn-ghost" type="button" data-action="material-history" data-id="${item.id}">Ver histórico</button>
          ${removeButton("materials", item.id)}
        </div></article>`;
    }).join(""), `<div class="empty"><div class="mark"></div><h3>Nenhum material encontrado</h3><p>A biblioteca espera cadastro e marcas vindas da Administração. Nenhum arquivo oficial foi carregado.</p></div>`);
  }

  function namedList(name, items, emptyTitle) {
    renderList(name, items.map((item) => `<article class="item"><strong>${esc(item.name)}</strong>${removeButton(name, item.id)}</article>`).join(""),
      `<div class="empty"><h3>${emptyTitle}</h3><p>Nada cadastrado nesta sessão.</p></div>`);
  }

  function renderPeople() {
    const active = state.people.filter((person) => person.status === "ativo").length;
    const kpis = [
      ["Colaboradores ativos", active ? `${active} nesta sessão` : "Sem dados disponíveis"],
      ["Entradas", "Sem dados disponíveis"],
      ["Saídas", "Sem dados disponíveis"],
      ["Custo médio da operação", "Dados financeiros ainda não integrados"],
      ["ADP", state.adpCycles.length ? "Há ciclo nesta sessão" : "Nenhum ciclo ADP disponível"],
      ["PDI", state.pdis.length ? "Há PDI nesta sessão" : "Nenhum PDI registrado"],
      ["Frequência de 1:1", state.oneOnOnes.length ? "Há 1:1 nesta sessão" : "Nenhum 1:1 registrado"],
      ["Aderência de treinamento", "Sem presença consolidada"]
    ];
    $("#people-kpis").innerHTML = kpis.map(([title, text]) => card(title, text, "Sem número estimado.")).join("");
    renderList("oneOnOnes", state.oneOnOnes.map((item) => `<article class="item"><header><h3>${esc(item.person)}</h3><span class="badge">${esc(item.date)}</span></header><p><strong>Pauta.</strong> ${esc(item.agenda)}</p><p class="meta">Pontos fortes: ${esc(item.positives || "não informado")} · Dificuldades: ${esc(item.challenges || "não informado")}</p><p>Feedback: ${esc(item.feedback || "não informado")}</p><p>Combinados: ${esc(item.agreements || "não informado")}</p><p>Ações: ${esc(item.actions || "não informado")}</p><p>Próximo acompanhamento: ${esc(item.followUp || "não informado")}</p><p>Próximos passos: ${esc(item.nextSteps || "não informado")}</p>${removeButton("oneOnOnes", item.id)}</article>`).join(""),
      `<div class="empty"><h3>Nenhum 1:1 registrado</h3><p>O histórico aparece depois do primeiro registro desta sessão.</p></div>`);
    const peopleQuery = ($("#pe-q")?.value || "").toLowerCase();
    const peopleTeam = $("#pe-team")?.value || "";
    const peoplePosition = $("#pe-position")?.value || "";
    const peopleStatus = $("#pe-status")?.value || "";
    const peopleRows = state.people.filter((person) => {
      if (peopleQuery && !`${person.name} ${person.email || ""}`.toLowerCase().includes(peopleQuery)) return false;
      if (peopleTeam && person.team !== peopleTeam) return false;
      if (peoplePosition && person.position !== peoplePosition) return false;
      if (peopleStatus && person.status !== peopleStatus) return false;
      return true;
    });
    const peopleTable = peopleRows.length ? `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Função</th><th>Equipe</th><th>Gestor</th><th>Unidade</th><th>Marca</th><th>Status</th><th></th></tr></thead><tbody>${peopleRows.map((person) => `<tr><td>${esc(person.name)}</td><td>${esc(person.position || "—")}</td><td>${esc(person.team || "—")}</td><td>${esc(person.manager || "—")}</td><td>${esc(person.unit || "—")}</td><td>${esc(person.brand || "—")}</td><td>${esc(person.status)}</td><td><button class="btn btn-secondary" type="button" data-action="open-person" data-id="${person.id}">Abrir</button></td></tr>`).join("")}</tbody></table></div>` : "";
    renderList("people", peopleTable, "");
    const emptyCopy = $("#people-empty-copy");
    if (emptyCopy) emptyCopy.hidden = peopleRows.length > 0;
    renderList("peopleAdmin", state.people.map((person) => `<article class="item"><strong>${esc(person.name)}</strong><p class="meta">${esc(person.email)} · ${esc(person.team || "sem equipe")} · ${esc(person.position || "sem função")} · ${esc(person.unit || "sem unidade")} · ${esc(person.brand || "sem marca")}</p>${removeButton("people", person.id)}</article>`).join(""),
      `<div class="empty"><h3>Nenhum usuário nesta sessão</h3><p>O cadastro não cria uma pessoa fictícia sozinho.</p></div>`);
  }

  function renderOrg() {
    namedList("teams", state.teams, "Nenhuma equipe");
    namedList("positions", state.positions, "Nenhuma função");
    namedList("departments", state.departments, "Nenhum departamento");
    namedList("brands", state.brands, "Nenhuma marca");
    namedList("units", state.units, "Nenhuma unidade");
    fillDataList("people-list", state.people.map((item) => item.name));
    fillDataList("teams-list", state.teams.map((item) => item.name));
    fillDataList("positions-list", state.positions.map((item) => item.name));
    fillDataList("departments-list", state.departments.map((item) => item.name));
    fillDataList("brands-list", state.brands.map((item) => item.name));
    fillDataList("units-list", state.units.map((item) => item.name));
  }

  function fillDataList(listId, values) {
    const list = document.getElementById(listId);
    if (list) list.innerHTML = values.map((value) => `<option value="${esc(value)}"></option>`).join("");
  }

  function fillSelect(select) {
    const kind = select.dataset.fill;
    const current = select.value;
    let options = [{ value: "", label: "Todos" }];
    if (kind === "trainings") options = [{ value: "", label: state.trainings.length ? "Selecione" : "Nenhum treinamento cadastrado" }, ...state.trainings.map((item) => ({ value: item.id, label: item.title }))];
    if (kind === "teams") options = [{ value: "", label: state.teams.length ? "Todas" : "Nenhuma equipe cadastrada" }, ...state.teams.map((item) => ({ value: item.name, label: item.name }))];
    if (kind === "people") options = [{ value: "", label: state.people.length ? "Todas" : "Nenhuma pessoa cadastrada" }, ...state.people.map((item) => ({ value: item.name, label: item.name }))];
    if (kind === "positions") options = [{ value: "", label: state.positions.length ? "Todas" : "Nenhuma função cadastrada" }, ...state.positions.map((item) => ({ value: item.name, label: item.name }))];
    if (kind === "brands") options = [{ value: "", label: state.brands.length ? "Todas as marcas" : "Nenhuma marca cadastrada" }, ...state.brands.map((item) => ({ value: item.id, label: item.name }))];
    if (kind === "units") options = [{ value: "", label: state.units.length ? "Todas" : "Nenhuma unidade cadastrada" }, ...state.units.map((item) => ({ value: item.name, label: item.name }))];
    if (kind === "vacancies") options = [{ value: "", label: state.vacancies.length ? "Selecione" : "Nenhuma vaga cadastrada" }, ...state.vacancies.map((item) => ({ value: item.id, label: item.title }))];
    if (kind === "candidates") options = [{ value: "", label: state.candidates.length ? "Selecione" : "Nenhum candidato no pipeline" }, ...state.candidates.map((item) => ({ value: item.id, label: item.name }))];
    if (kind === "years") {
      const years = [...new Set(state.trainings.map((item) => item.date.slice(0, 4)))];
      options = [{ value: "", label: years.length ? "Todos os anos" : "Nenhum ano disponível" }, ...years.map((year) => ({ value: year, label: year }))];
    }
    select.innerHTML = options.map((option) => `<option value="${esc(option.value)}">${esc(option.label)}</option>`).join("");
    if (options.some((option) => option.value === current)) select.value = current;
  }

  function renderAdp() {
    renderList("adpCycles", state.adpCycles.map((item) => `<article class="item"><header><h3>${esc(item.name)}</h3><span class="badge">${esc(item.status)}</span></header><p class="meta">${esc(item.start)} a ${esc(item.end)} · ${esc(item.population || "População não informada")}</p>${removeButton("adpCycles", item.id)}</article>`).join(""),
      `<div class="empty"><h3>Nenhum ciclo ADP disponível</h3><p>Quando um ciclo for criado, os resultados aparecem aqui.</p></div>`);
    renderList("adpFields", state.adpFields.map((item) => `<article class="item"><header><h3>${esc(item.name)}</h3><span class="badge badge-new">Manual</span></header><p>${esc(item.description || "Sem descrição.")}</p><p class="meta">${esc(item.type)} · obrigatório: ${esc(item.required)} · ordem ${esc(item.order || "não definida")} · peso ${esc(item.weight || "não definido")}</p>${item.options ? `<p class="meta">Opções: ${esc(item.options)}</p>` : ""}${removeButton("adpFields", item.id)}</article>`).join(""),
      `<div class="empty"><h3>Nenhum campo manual configurado</h3><p>Resultados e CRM continuam aguardando integração e não são editáveis.</p></div>`);
    renderList("pdis", state.pdis.map((item) => `<article class="item"><header><h3>${esc(item.person)}</h3><span class="badge">${esc(item.status)}</span></header><p>${esc(item.goal)}</p><p class="meta">${esc(item.actions || "Sem ações")} · prazo ${esc(item.due || "não informado")}</p>${removeButton("pdis", item.id)}</article>`).join(""),
      `<div class="empty"><h3>Nenhum PDI ativo</h3><p>O plano registrado nesta sessão aparece aqui e na Gestão de Pessoas.</p></div>`);
    const body = $("#adp-matrix-body");
    if (!state.people.length || !state.adpCycles.length) {
      body.innerHTML = `<tr><td colspan="9">Nenhum ciclo ADP disponível para montar a matriz. Cadastre pessoas e um ciclo nesta sessão. Scores não são estimados.</td></tr>`;
    } else {
      body.innerHTML = state.people.map((person) => `<tr><td><button class="btn btn-ghost" type="button" data-action="open-adp-person" data-id="${person.id}">${esc(person.name)}</button></td><td>${esc(person.team || "—")}</td><td>${esc(person.manager || "—")}</td><td>Aguardando Resultados</td><td>Aguardando CRM</td><td>${state.manualNotes[person.id] ? "Nota desta sessão" : (state.adpFields.length ? "Não preenchido" : "Sem campo manual")}</td><td>Não calculado</td><td>${esc(state.adpCycles[0].status)}</td><td>Incompleta</td></tr>`).join("");
    }
    $("#adp-matrix-note").textContent = "Score em branco não significa zero. A completude só muda quando houver valor de origem conhecida.";
    const kpis = [
      ["Ciclo atual", state.adpCycles[0] ? state.adpCycles[0].name : "Nenhum ciclo ADP disponível"],
      ["Conclusão", "Nenhuma avaliação registrada"],
      ["Score geral", "Sem dados disponíveis"],
      ["Alta performance", "Sem dados disponíveis"],
      ["Em desenvolvimento", "Sem dados disponíveis"],
      ["PDI", state.pdis.length ? "Há PDI nesta sessão" : "Nenhum PDI ativo"],
      ["Pendências", "Nenhum ciclo pendente"]
    ];
    const kpiHtml = kpis.map(([title, text]) => card(title, text, "Faixas e médias não foram preenchidas.")).join("");
    if ($("#adp-kpi")) $("#adp-kpi").innerHTML = kpiHtml;
    if ($("#adp-dash")) $("#adp-dash").innerHTML = kpiHtml;
    const cycleNames = state.adpCycles.map((item) => item.name).join(", ");
    $("#adp-cycle-axis").textContent = cycleNames ? `Ciclos desta sessão: ${cycleNames}. Sem score histórico.` : "Nenhum ciclo anterior";
    renderList("adpTeams", state.teams.map((team) => `<article class="item"><h3>${esc(team.name)}</h3><p class="meta">Score: sem dado · evolução: sem série · conclusão: sem avaliação · quantidade avaliada: não mensurável</p></article>`).join(""),
      `<div class="empty"><h3>Nenhuma equipe para comparar</h3><p>A comparação usa equipes cadastradas e avaliações reais. As duas bases estão vazias.</p></div>`);
  }

  function boardHtml(columns, cards, board) {
    return `<div class="kanban ${columns.length > 4 ? "kanban-6" : ""}" data-board="${board}">${columns.map((column) => {
      const mine = cards.filter((cardItem) => cardItem.status === column);
      return `<section class="kanban-col" data-status="${esc(column)}"><h3>${esc(column)}</h3><div class="stack">${mine.map((cardItem) => `
        <article class="item" draggable="true" data-drag="${board}" data-id="${cardItem.id}"><strong>${esc(cardItem.name || cardItem.title || cardItem.area)}</strong><p class="meta">${esc(cardItem.meta || "")}</p>
        <div class="inline-actions">
          ${board === "tickets" ? `<button class="btn btn-secondary" type="button" data-action="open-ticket" data-id="${cardItem.id}">Abrir detalhe</button>` : ""}
          <label class="field"><span>Mover</span><select data-action="move-card" data-board="${board}" data-id="${cardItem.id}">${columns.map((option) => `<option ${option === column ? "selected" : ""}>${esc(option)}</option>`).join("")}</select></label>
        </div></article>`).join("") || `<p class="drop-hint">Nenhum item</p>`}</div></section>`;
    }).join("")}</div>`;
  }

  function renderBoards() {
    $("#board-tickets").innerHTML = boardHtml(TICKET_COLUMNS, state.tickets.map((item) => ({ ...item, meta: `${item.motivo} · ${item.level}` })), "tickets");
    const board = $("#board-candidates");
    if (board) {
      board.innerHTML = boardHtml(PIPELINE, state.candidates.map((item) => ({ ...item, meta: state.vacancies.find((vacancy) => vacancy.id === item.vacancyId)?.title || "Vaga não informada" })), "candidates");
    }
  }

  function renderRecruitment() {
    renderList("vacancies", state.vacancies.map((item) => `<article class="item"><header><h3>${esc(item.title)}</h3><span class="badge">${esc(item.status)}</span></header><p>${esc(item.description || "Sem descrição.")}</p><p class="meta">${esc(item.area)}</p>${removeButton("vacancies", item.id)}</article>`).join(""),
      `<div class="empty"><h3>Nenhuma vaga cadastrada</h3><p>O pipeline permanece vazio até existir uma vaga e um candidato nesta sessão.</p></div>`);
    renderList("interviews", state.interviews.map((item) => `<article class="item"><h3>${esc(candidateName(item.candidateId))}</h3><p>${esc(item.agenda)}</p><p class="meta">${fmtDate(item.date)} · ${esc(item.notes || "Sem registro complementar")}</p></article>`).join(""),
      `<div class="empty"><h3>Nenhuma entrevista registrada</h3><p>Cadastre um candidato antes de lançar a entrevista.</p></div>`);
    renderList("proposals", state.proposals.map((item) => `<article class="item"><header><h3>${esc(candidateName(item.candidateId))}</h3><span class="badge">${esc(item.status)}</span></header><p>${esc(item.notes || "Sem observação.")}</p><p class="muted">Valor não informado.</p></article>`).join(""),
      `<div class="empty"><h3>Nenhuma proposta registrada</h3></div>`);
    renderList("candidates", state.candidates.map((item) => `<article class="item"><header><h3>${esc(item.name)}</h3><span class="badge">${esc(item.status)}</span></header><p class="meta">${esc(state.vacancies.find((vacancy) => vacancy.id === item.vacancyId)?.title || "Vaga não informada")}</p></article>`).join(""),
      `<div class="empty"><div class="mark"></div><h3>Nenhum candidato no pipeline</h3><p>Crie um candidato temporário nesta sessão para testar o quadro.</p></div>`);
    renderBoards();
  }

  function candidateName(itemId) {
    return state.candidates.find((item) => item.id === itemId)?.name || "Candidato";
  }

  function renderDocuments() {
    const tab = document.querySelector("#view-documentos [data-tab][aria-selected='true']")?.dataset.tab || "doc-bib";
    const cat = $("#doc-cat")?.value || "";
    const status = $("#doc-status")?.value || "";
    const version = ($("#doc-version")?.value || "").toLowerCase();
    const required = $("#doc-required")?.value || "";
    const rows = state.documents.filter((doc) => {
      const accepted = state.acks.includes(doc.id);
      if (tab === "doc-aceites" && !accepted) return false;
      if (tab === "doc-pend" && (accepted || doc.status !== "publicado")) return false;
      if (cat && doc.category !== cat) return false;
      if (status && doc.status !== status) return false;
      if (version && !String(doc.version).toLowerCase().includes(version)) return false;
      if (required && doc.required !== required) return false;
      return true;
    });
    const emptyTitle = tab === "doc-aceites" ? "Nenhum aceite nesta sessão" : tab === "doc-pend" ? "Nenhuma pendência de aceite" : "Nenhum documento cadastrado";
    renderList("documents", rows.map((doc) => {
      const accepted = state.acks.includes(doc.id);
      return `<article class="item"><header><h3>${esc(doc.title)}</h3><span class="badge ${accepted ? "badge-done" : "badge-pending"}">${accepted ? "aceito nesta sessão" : "aceite pendente"}</span></header>
        <p class="meta">${esc(doc.category)} · versão ${esc(doc.version)} · ${esc(doc.status)} · obrigatório ${esc(doc.required || "não")} · vencimento ${esc(doc.expiry || "não informado")}</p>
        <div class="inline-actions"><button class="btn btn-primary" type="button" data-action="open-document" data-id="${doc.id}">Abrir e ler</button>${roleCan("documentos", "manage") ? `<button class="btn btn-secondary" type="button" data-action="new-version" data-id="${doc.id}">Registrar nova versão</button>` : ""}${removeButton("documents", doc.id)}</div></article>`;
    }).join(""), `<div class="empty"><div class="mark"></div><h3>${emptyTitle}</h3><p>Políticas, termos, LGPD, procedimentos e contratos aparecem com versão, status, obrigatoriedade e aceite.</p></div>`);
  }

  function renderFinance() {
    const kpis = [
      ["Custo total", "Nenhum dado financeiro disponível"],
      ["Custo médio", "Dados financeiros ainda não integrados"],
      ["Resultado líquido atribuível", "Aguardando integração"],
      ["ROI médio", "Não mensurável"],
      ["Contribuição", "Não mensurável"],
      ["Payback", "Sem base adequada"]
    ];
    $("#roi-kpis").innerHTML = kpis.map(([title, text]) => card(title, text, "Nenhum valor foi estimado.")).join("");
    const parts = ["Remuneração", "Encargos", "Benefícios", "Variável", "Rateio operacional", "Outros"];
    $("#cost-rows").innerHTML = parts.map((part) => `<article class="item"><strong>${part}</strong><p class="muted">Sem valor informado.</p></article>`).join("");
    const allocation = state.roiConfig?.allocation?.trim();
    const qualities = [
      ["Completo", "Nenhum registro com custo e resultado suficientes."],
      ["Custo ausente", "Nenhum componente de custo foi carregado."],
      ["Resultado ausente", "Não há resultado atribuído."],
      ["Integração pendente", "CRM e Resultados ainda não alimentam este módulo."],
      ["Atribuição pendente", "Não há vínculo entre resultado e colaborador."],
      [allocation ? "Rateio descrito nesta sessão" : "Rateio pendente", allocation || "Sem regra de rateio, o custo compartilhado não é distribuído."],
      ["Não mensurável", "Sem resultado individual confiável, a pessoa não vira zero nem recebe fatia genérica."]
    ];
    $("#quality-list").innerHTML = qualities.map(([title, text]) => `<article class="item"><h3>${esc(title)}</h3><p class="muted">${esc(text)}</p></article>`).join("");
    const config = state.roiConfig;
    $("#roi-config-view").innerHTML = config ? `<article class="item"><h3>Regra desta sessão</h3><p class="meta">Métrica: ${esc(config.metric || "não informada")} · meta: ${esc(config.target || "não informada")} · ${esc(config.periodicity)}</p><p>${esc(config.allocation || "Rateio ainda não descrito.")}</p></article>` : `<div class="empty"><h3>Nenhuma regra salva</h3><p>Definir a regra não gera ROI.</p></div>`;
  }

  function renderGame() {
    const points = state.history.filter((item) => item.points).reduce((sum, item) => sum + item.points, 0);
    const level = state.levels.filter((item) => points >= Number(item.min)).sort((a, b) => Number(b.min) - Number(a.min))[0];
    $("#game-cards").innerHTML = [
      card("Pontos", points ? `${points} nesta sessão` : "Nenhum ponto disponível", "Os pontos só aparecem quando uma regra e um evento desta sessão coincidem. O zero não é exibido."),
      card("Nível", level ? level.name : "Nenhum nível configurado", "O nível usa a faixa mínima cadastrada, sem escala pronta."),
      card("Badges", state.badges.length ? "Há badges configuradas" : "Nenhuma badge configurada", "Configurar não concede a badge."),
      card("Desafios", state.challenges.length ? "Há desafios nesta sessão" : "Nenhum desafio ativo", "A conclusão depende de evento real, não de um botão de completar."),
      card("Conquistas", "Nenhuma conquista concedida", "Sem evento suficiente para conceder."),
      card("Histórico", state.history.length ? "Há eventos nesta sessão" : "Sem histórico", "O histórico lista o que acontecer agora.")
    ].join("");
    renderList("history", state.history.map((item) => `<article class="item"><strong>${esc(item.text)}</strong><p class="meta">${fmtDate(item.at)}</p></article>`).join(""),
      `<div class="empty"><h3>Sem histórico</h3><p>Conclusões e regras aplicadas nesta sessão aparecem aqui.</p></div>`);
    $("#ranking-session").innerHTML = points
      ? `<article class="item"><h3>Sessão do protótipo</h3><p class="meta">${points} pontos aplicados por regra nesta sessão. Isso não é um ranking de colaboradores.</p></article>`
      : "";
    renderList("challenges", state.challenges.map((item) => `<article class="item"><header><h3>${esc(item.name)}</h3><span class="badge">${esc(item.status)}</span></header><p>${esc(item.objective)}</p><p class="meta">${esc(item.criteria)} · ${esc(item.points)} pontos na regra · ${esc(item.audience || "público não informado")}</p><p class="muted">Conclusão não marcada. Ela dependerá de um evento real.</p>${removeButton("challenges", item.id)}</article>`).join(""),
      `<div class="empty"><h3>Nenhum desafio configurado</h3></div>`);
    renderList("pointRules", state.pointRules.map((item) => `<article class="item"><strong>${esc(item.event)}</strong><p class="meta">${esc(item.points)} pontos</p>${removeButton("pointRules", item.id)}</article>`).join(""), `<div class="empty"><h3>Nenhuma regra de pontos</h3></div>`);
    renderList("levels", state.levels.map((item) => `<article class="item"><strong>${esc(item.name)}</strong><p class="meta">A partir de ${esc(item.min)} pontos</p>${removeButton("levels", item.id)}</article>`).join(""), "");
    renderList("badges", state.badges.map((item) => `<article class="item"><strong>${esc(item.name)}</strong><p class="meta">${esc(item.criterion)} · não concedida</p>${removeButton("badges", item.id)}</article>`).join(""), "");
  }

  function renderReports() {
    const groups = [
      ["Executivo", ["exec"]],
      ["Pessoas", ["people"]],
      ["Performance", ["adp", "goals"]],
      ["Financeiro", ["roi"]],
      ["Aprendizagem", ["training"]],
      ["Operação", ["tickets", "game"]]
    ];
    $("#report-cards").innerHTML = groups.map(([label, keys]) => `
      <section class="report-group section"><h2>${label}</h2><div class="grid grid-3">${keys.map((key) => {
        const [title, text] = REPORTS[key];
        return `<article class="card" data-search="${esc(title)}"><h3>${esc(title)}</h3><p class="muted">${esc(text)}</p><button class="btn btn-primary" type="button" data-action="open-report" data-report="${key}">Abrir relatório</button></article>`;
      }).join("")}</div></section>`).join("");
  }

  function renderMatrix() {
    const head = `<tr><th>Módulo</th>${Object.values(ROLES).map((label) => `<th>${label}</th>`).join("")}</tr>`;
    const body = MODULES.map(([moduleId, label]) => `<tr><th>${label}</th>${Object.keys(ROLES).map((role) => {
      const value = state.access[role][moduleId];
      return `<td><select aria-label="${label} para ${ROLES[role]}" data-perm-role="${role}" data-perm-module="${moduleId}">${LEVELS.map((level) => `<option value="${level}" ${level === value ? "selected" : ""}>${level === "none" ? "Oculto" : level === "view" ? "Ver" : "Gerir"}</option>`).join("")}</select></td>`;
    }).join("")}</tr>`).join("");
    $("#perm-matrix").innerHTML = `<table class="matrix"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

  function renderNotifications() {
    const list = $("#notif-list");
    $("#notif-empty").hidden = state.notifications.length > 0;
    $("#notif-dot").hidden = state.notifications.length === 0;
    list.innerHTML = state.notifications.map((item) => `<article class="item"><p>${esc(item.text)}</p><p class="meta">${fmtDate(item.at)}</p></article>`).join("");
  }

  function renderChips() {
    $("#news-chips").innerHTML = NEWS_CATS.map((cat) => `<button class="chip" type="button" data-action="news-cat" data-cat="${esc(cat)}" aria-pressed="${state.newsCategory === cat}">${esc(cat)}</button>`).join("");
    $("#material-chips").innerHTML = ["Todos", ...MATERIAL_TYPES].map((type) => `<button class="chip" type="button" data-action="material-type" data-type="${esc(type)}" aria-pressed="${state.materialType === type}">${esc(type)}</button>`).join("");
    $("#nps-choices").innerHTML = Array.from({ length: 11 }, (_, score) => `<button class="btn btn-secondary" type="button" data-action="set-score" data-target="nps-score" data-score="${score}">${score}</button>`).join("");
    $("#wizard-steps").innerHTML = WIZARD.map((label, index) => `<span class="${index === state.wizardStep ? "is-current" : ""} ${index < state.wizardStep ? "is-done" : ""}">${index + 1}. ${label}</span>`).join("");
  }

  function refreshSelects() {
    $$("[data-fill]").forEach(fillSelect);
  }

  function renderAll() {
    renderHome();
    renderNews();
    renderCampaigns();
    renderCourses();
    renderTrainings();
    renderMaterials();
    renderPeople();
    renderOrg();
    renderAdp();
    renderRecruitment();
    renderDocuments();
    renderFinance();
    renderGame();
    renderReports();
    renderNotifications();
    renderChips();
    refreshSelects();
    renderAllAttendance();
    applyAccess();
  }

  function activateTab(tab) {
    const tablist = tab.closest("[role='tablist']");
    const view = tab.closest(".view");
    $$("[data-tab]", tablist).forEach((btn) => btn.setAttribute("aria-selected", String(btn === tab)));
    $$("[data-panel]", view).forEach((panel) => { panel.hidden = panel.dataset.panel !== tab.dataset.tab; });
    if (tab.dataset.tab.startsWith("uni-")) renderCourses();
    if (tab.dataset.tab.startsWith("doc-")) renderDocuments();
  }

  function toggleForm(target) {
    const form = document.getElementById(target);
    if (!form) return;
    form.hidden = !form.hidden;
    if (!form.hidden) {
      const field = form.querySelector("input, select, textarea");
      if (field) field.focus();
    }
  }

  function award(eventName, text) {
    const rule = state.pointRules.find((item) => item.event === eventName);
    if (!rule) {
      pushHistory(text);
      return;
    }
    const points = Number(rule.points);
    state.history.unshift({ id: id(), text: `${text} Regra aplicada: +${points} pontos.`, at: new Date().toISOString(), points });
    toast(`Regra de pontos aplicada nesta sessão: +${points}.`);
  }

  function setWizard(step) {
    state.wizardStep = step;
    $$("[data-wizard-step]").forEach((el) => { el.hidden = Number(el.dataset.wizardStep) !== step; });
    $("#wizard-next").textContent = step === WIZARD.length - 1 ? "Enviar chamado" : "Continuar";
    renderChips();
    if (step === 5 || step === 6) {
      const area = $("#ticket-area").value;
      const motivo = $("#ticket-motivo").value;
      const route = `Este chamado segue para a fila de ${area || "área não selecionada"}, motivo ${motivo || "não selecionado"}. O responsável será definido pela regra Área + Motivo.`;
      $("#ticket-route").textContent = route;
      const file = $("#ticket-file").files[0];
      $("#ticket-review").innerHTML = [
        ["Área", area],
        ["Motivo", motivo],
        ["Contexto", $("#ticket-context").value],
        ["Impacto", `${state.impact || "não informado"} — ${$("#ticket-impact").value}`],
        ["Evidências", $("#ticket-evidence").value || "sem relato"],
        ["Link", $("#ticket-link").value || "sem link"],
        ["Protocolo", $("#ticket-protocol").value || "sem protocolo"],
        ["Erro", $("#ticket-error").value || "sem erro"],
        ["Arquivo", file ? `${file.name} (${file.size} bytes, só nesta sessão)` : "nenhum"],
        ["Encaminhamento", route]
      ].map(([label, value]) => `<p><strong>${label}.</strong> ${esc(value)}</p>`).join("");
    }
  }

  function submitWizard() {
    const area = $("#ticket-area").value;
    const motivo = $("#ticket-motivo").value;
    const context = $("#ticket-context").value.trim();
    if (!area || !motivo || !context || !state.impact) {
      toast("Revise área, motivo, contexto e impacto antes de enviar.");
      return;
    }
    const file = $("#ticket-file").files[0];
    state.tickets.unshift({
      id: id(),
      area,
      motivo,
      context,
      impact: $("#ticket-impact").value.trim(),
      level: state.impact,
      status: "Aberto",
      name: area,
      fileName: file ? file.name : "",
      comments: [],
      log: ["Aberto nesta sessão"]
    });
    notify(`Chamado aberto para ${area}.`);
    pushHistory(`Chamado aberto: ${area} / ${motivo}.`);
    toast("Chamado criado nesta sessão e colocado em Aberto.");
    ["ticket-context", "ticket-impact", "ticket-evidence", "ticket-link", "ticket-protocol", "ticket-error", "ticket-notes"].forEach((fieldId) => { $(`#${fieldId}`).value = ""; });
    $("#ticket-file").value = "";
    $("#ticket-area").value = "";
    state.impact = "";
    $$("#impact-choices button").forEach((btn) => btn.setAttribute("aria-pressed", "false"));
    setWizard(0);
    renderBoards();
    renderHome();
  }

  function exportCsv() {
    const header = "colaborador;equipe;funcao;custo;resultado;contribuicao;roi;variacao;qualidade";
    const blob = new Blob([`\uFEFF${header}\n`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "bussola-300-roi-sem-dados.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    toast("CSV gerado só com o cabeçalho. Não há linhas de dados.");
  }

  function openReport(key) {
    const report = REPORTS[key];
    if (!report) return;
    go("relatorio");
    const skeleton = $("#report-skeleton");
    const detail = $("#report-detail");
    skeleton.hidden = false;
    detail.hidden = true;
    setTimeout(() => {
      skeleton.hidden = true;
      detail.hidden = false;
      detail.innerHTML = `<header class="page-head"><div><h1>${esc(report[0])}</h1><p class="lede">${esc(report[1])}</p></div><button class="btn btn-secondary" type="button" data-action="export-csv" data-export="${esc(key)}">Exportar</button></header>
        <div class="filters"><label class="field"><span>Período</span><select data-action="report-filter"><option value="">Não definido</option><option>Mensal</option><option>Trimestral</option><option>Anual</option></select></label><label class="field"><span>Equipe</span><select data-action="report-filter" data-fill="teams"></select></label><button class="btn btn-primary" type="button" data-action="report-filter">Aplicar filtros</button></div>
        <div class="grid grid-3 section">${["Indicador 1", "Indicador 2", "Indicador 3"].map((label) => card(label, "Sem dados disponíveis", report[2])).join("")}</div>
        <div class="chart section"><strong>Série</strong><div class="chart-plot" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div><div class="empty"><div class="mark"></div><h3>${esc(report[2])}</h3><p>O gráfico permanece sem barras. Nenhum valor foi colocado para simular a série.</p></div></div>
        <div class="table-wrap"><table><thead><tr><th>Dimensão</th><th>Valor</th><th>Status</th></tr></thead><tbody><tr><td colspan="3">Nenhum registro para este relatório.</td></tr></tbody></table></div>`;
      refreshSelects();
    }, 350);
  }

  function removeItem(kind, itemId) {
    const lists = {
      news: "news", campaigns: "campaigns", courses: "courses", trainings: "trainings", materials: "materials",
      oneOnOnes: "oneOnOnes", pdis: "pdis", adpCycles: "adpCycles", adpFields: "adpFields", vacancies: "vacancies",
      documents: "documents", challenges: "challenges", pointRules: "pointRules", levels: "levels", badges: "badges",
      teams: "teams", positions: "positions", departments: "departments", brands: "brands", units: "units", people: "people"
    };
    const key = lists[kind];
    if (!key) return;
    state[key] = state[key].filter((item) => item.id !== itemId);
    if (kind === "trainings") delete state.participants[itemId];
    toast("Item removido desta sessão.");
    renderAll();
  }

  function handleSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.dataset.form) return;
    event.preventDefault();
    const type = form.dataset.form;
    if (!requireForm(form)) return;
    const data = formData(form);

    if (type === "news") {
      state.news.unshift({ id: id(), ...data, important: Boolean(form.elements.important.checked), image: data.image });
      notify(`News registrada: ${data.title}`);
      toast("News salva nesta sessão.");
      form.reset();
      form.hidden = true;
    }
    if (type === "campaign") {
      state.campaigns.unshift({ id: id(), ...data });
      toast("Campanha salva nesta sessão, sem realizado.");
      form.reset();
      form.hidden = true;
    }
    if (type === "course") {
      state.courses.unshift({ id: id(), ...data, modules: [] });
      toast("Curso salvo no catálogo desta sessão.");
      form.reset();
      form.hidden = true;
    }
    if (type === "module") {
      const course = state.courses.find((item) => item.id === state.courseId);
      course?.modules.push({ id: id(), title: data.title, lessons: [] });
      toast("Módulo adicionado.");
      form.reset();
    }
    if (type === "lesson") {
      const course = state.courses.find((item) => item.id === state.courseId);
      const moduleItem = course?.modules.find((item) => item.id === form.dataset.module);
      moduleItem?.lessons.push({ id: id(), title: data.title, type: data.type });
      toast("Aula adicionada.");
      form.reset();
    }
    if (type === "training") {
      const training = { id: id(), ...data, newsId: "" };
      if (form.elements.publishNews.checked) {
        const newsItem = {
          id: id(), title: data.title, description: `Treinamento ${data.format} em ${data.date}.`, content: data.theme,
          category: "Treinamento", audience: "Todos", status: "publicado", author: data.owner, cta: "Ver treinamento",
          linkType: "treinamentos", important: false, publishedAt: new Date().toISOString()
        };
        state.news.unshift(newsItem);
        training.newsId = newsItem.id;
        notify(`News vinculada ao treinamento ${data.title}.`);
      }
      state.trainings.unshift(training);
      state.participants[training.id] = [];
      toast("Treinamento salvo nesta sessão.");
      form.reset();
      form.hidden = true;
    }
    if (type === "participant") {
      const root = form.closest("[data-attendance]");
      const trainingId = $("[data-attendance-select]", root).value;
      if (!trainingId) {
        markError(form, "Selecione um treinamento.");
        return;
      }
      const bucket = state.participants[trainingId] || [];
      bucket.push({ id: id(), name: data.name, status: "sem marcação", updatedAt: "" });
      state.participants[trainingId] = bucket;
      toast("Participante adicionado nesta sessão.");
      form.reset();
    }
    if (type === "review" || type === "nps") {
      const score = type === "review" ? $("#review-score").value : $("#nps-score").value;
      const content = $("#score-conteudo")?.value || "";
      const instructor = $("#score-instrutor")?.value || "";
      const applicability = $("#score-aplic")?.value || "";
      const organization = $("#score-org")?.value || "";
      if (!score || (type === "review" && (!content || !instructor || !applicability || !organization))) {
        markError(form, "Escolha a nota de cada critério.");
        return;
      }
      const list = type === "review" ? state.reviews : state.nps;
      if (list.some((item) => item.trainingId === data.trainingId)) {
        markError(form, "Esta sessão já possui esse registro para o treinamento.");
        return;
      }
      list.unshift({
        id: id(), trainingId: data.trainingId, score: Number(score), comment: data.comment || "", at: new Date().toISOString(),
        content, instructor, applicability, organization
      });
      toast(type === "review" ? "Avaliação registrada nesta sessão." : "NPS registrado nesta sessão.");
      form.reset();
      ["review-score", "nps-score", "score-conteudo", "score-instrutor", "score-aplic", "score-org"].forEach((fieldId) => {
        const field = document.getElementById(fieldId);
        if (field) field.value = "";
      });
      $$(".choices button").forEach((btn) => btn.setAttribute("aria-pressed", "false"));
    }
    if (type === "ticketNote") {
      const ticket = state.tickets.find((item) => item.id === form.dataset.id);
      if (!ticket || !data.comment.trim()) {
        markError(form, "Escreva o comentário.");
        return;
      }
      ticket.comments = ticket.comments || [];
      ticket.log = ticket.log || [];
      ticket.comments.unshift({ text: data.comment.trim(), at: new Date().toISOString() });
      ticket.log.unshift("Comentário registrado nesta sessão.");
      toast("Comentário salvo nesta sessão.");
      closeModal();
    }
    if (type === "material") {
      if (!state.brands.length) {
        markError(form, "Cadastre uma marca na Administração antes de associar o material.");
        return;
      }
      if (!data.brandId) {
        markError(form, "Selecione uma marca.");
        return;
      }
      state.materials.unshift({
        id: id(), title: data.title, type: data.type, brandId: data.brandId, category: data.category,
        versions: [{ version: data.version, date: data.date, owner: data.owner, status: data.status, format: data.format }]
      });
      toast("Material salvo nesta sessão.");
      form.reset();
      form.hidden = true;
    }
    if (type === "oneOnOne") {
      state.oneOnOnes.unshift({ id: id(), ...data });
      pushHistory(`1:1 registrado para ${data.person}.`);
      toast("1:1 salvo nesta sessão.");
      form.reset();
    }
    if (type === "pdi") {
      state.pdis.unshift({ id: id(), ...data });
      toast("PDI salvo nesta sessão.");
      form.reset();
    }
    if (type === "adpCycle") {
      state.adpCycles.unshift({ id: id(), ...data });
      notify(`Ciclo ADP ${data.status}: ${data.name}`);
      toast("Ciclo salvo nesta sessão.");
      form.reset();
    }
    if (type === "adpField") {
      if (data.type === "lista" && !data.options.trim()) {
        markError(form, "Informe as opções da lista.");
        return;
      }
      state.adpFields.unshift({ id: id(), ...data });
      toast("Campo manual adicionado. Resultados e CRM continuam bloqueados.");
      form.reset();
    }
    if (type === "vacancy") {
      state.vacancies.unshift({ id: id(), ...data });
      toast("Vaga salva nesta sessão.");
      form.reset();
      form.hidden = true;
    }
    if (type === "candidate") {
      if (!data.vacancyId) {
        markError(form, "Cadastre e selecione uma vaga.");
        return;
      }
      state.candidates.unshift({ id: id(), name: data.name, vacancyId: data.vacancyId, status: "Inscritos" });
      toast("Candidato incluído em Inscritos.");
      form.reset();
      form.hidden = true;
    }
    if (type === "interview") {
      if (!data.candidateId) {
        markError(form, "Cadastre um candidato nesta sessão antes de registrar a entrevista.");
        return;
      }
      state.interviews.unshift({ id: id(), ...data });
      toast("Entrevista registrada nesta sessão.");
      form.reset();
    }
    if (type === "proposal") {
      if (!data.candidateId) {
        markError(form, "Cadastre um candidato nesta sessão antes de registrar a proposta.");
        return;
      }
      state.proposals.unshift({ id: id(), ...data });
      toast("Proposta registrada sem valor inventado.");
      form.reset();
    }
    if (type === "document") {
      state.documents.unshift({ id: id(), ...data });
      notify(`Documento disponível: ${data.title}`);
      toast("Documento salvo nesta sessão.");
      form.reset();
      form.hidden = true;
    }
    if (type === "person") {
      state.people.unshift({ id: id(), ...data });
      toast("Usuário adicionado só nesta sessão.");
      form.reset();
    }
    if (["team", "position", "department", "brand", "unit"].includes(type)) {
      const key = `${type}s`;
      state[key].unshift({ id: id(), name: data.name });
      toast("Cadastro adicionado nesta sessão.");
      form.reset();
    }
    if (type === "challenge") {
      state.challenges.unshift({ id: id(), ...data });
      toast("Desafio configurado. A conclusão não foi marcada.");
      form.reset();
    }
    if (type === "pointRule") {
      if (state.pointRules.some((item) => item.event === data.event)) {
        markError(form, "Já existe uma regra para esse evento nesta sessão.");
        return;
      }
      state.pointRules.unshift({ id: id(), event: data.event, points: data.points });
      toast("Regra salva. Nenhum ponto foi lançado ainda.");
      form.reset();
    }
    if (type === "levelRule") {
      state.levels.unshift({ id: id(), name: data.name, min: data.min });
      toast("Nível configurado.");
      form.reset();
    }
    if (type === "badgeRule") {
      state.badges.unshift({ id: id(), name: data.name, criterion: data.criterion });
      toast("Badge configurada e ainda não concedida.");
      form.reset();
    }
    if (type === "roiConfig") {
      state.roiConfig = data;
      toast("Regra de ROI salva nesta sessão. Nenhum valor financeiro foi criado.");
      form.reset();
    }
    renderAll();
    if (type === "module" || type === "lesson") renderCourse();
  }

  function handleClick(event) {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      activateTab(tab);
      return;
    }
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      go(nav.dataset.nav);
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "toggle-sidebar") {
      $("#sidebar").classList.add("is-open");
      $("#backdrop").hidden = false;
    }
    if (action === "close-sidebar") closeSidebar();
    if (action === "toggle-dropdown") {
      const idName = `dropdown-${button.dataset.dropdown}`;
      const opening = $(`#${idName}`).hidden;
      closeDropdowns();
      $(`#${idName}`).hidden = !opening;
      button.setAttribute("aria-expanded", String(opening));
    }
    if (action === "dismiss-banner") $("#proto-banner").hidden = true;
    if (action === "clear-search") {
      $("#global-search").value = "";
      applySearch();
    }
    if (action === "clear-session") location.reload();
    if (action === "toggle-form") toggleForm(button.dataset.target);
    if (action === "close-modal") closeModal();
    if (action === "open-modal" && button.dataset.modal === "help") {
      openModal("Telas sem números", "<p>Onde não existe base, o Bússola 300 mostra o estado vazio. Gráficos mantêm eixos e não desenham barras com valores. O que você salvar agora vive só na memória da aba.</p>", `<button class="btn btn-primary" type="button" data-action="close-modal">Entendi</button>`);
    }
    if (action === "news-cat") {
      state.newsCategory = button.dataset.cat;
      renderNews();
      renderChips();
    }
    if (action === "material-type") {
      state.materialType = button.dataset.type;
      renderMaterials();
      renderChips();
    }
    if (action === "set-score") {
      const input = document.getElementById(button.dataset.target);
      input.value = button.dataset.score;
      button.parentElement.querySelectorAll("button").forEach((peer) => peer.setAttribute("aria-pressed", String(peer === button)));
    }
    if (action === "set-impact") {
      state.impact = button.dataset.level;
      $$("#impact-choices button").forEach((peer) => peer.setAttribute("aria-pressed", String(peer === button)));
    }
    if (action === "wizard-back") setWizard(Math.max(0, state.wizardStep - 1));
    if (action === "wizard-next") {
      if (state.wizardStep === 0 && !$("#ticket-area").value) return toast("Selecione a área.");
      if (state.wizardStep === 1 && !$("#ticket-motivo").value) return toast("Selecione o motivo.");
      if (state.wizardStep === 2 && !$("#ticket-context").value.trim()) return toast("Descreva o contexto.");
      if (state.wizardStep === 3 && !state.impact) return toast("Selecione o nível de impacto.");
      if (state.wizardStep === WIZARD.length - 1) submitWizard();
      else setWizard(state.wizardStep + 1);
    }
    if (action === "cal-mode") {
      state.calendar.mode = button.dataset.mode;
      $$("[data-mode]").forEach((peer) => peer.setAttribute("aria-pressed", String(peer === button)));
      renderCalendar();
    }
    if (action === "cal-prev" || action === "cal-next" || action === "cal-today") {
      const cursor = new Date(state.calendar.cursor);
      if (action === "cal-today") state.calendar.cursor = new Date();
      else {
        const delta = action === "cal-next" ? 1 : -1;
        if (state.calendar.mode === "week") cursor.setDate(cursor.getDate() + (delta * 7));
        else cursor.setMonth(cursor.getMonth() + delta);
        state.calendar.cursor = cursor;
      }
      renderCalendar();
    }
    if (action === "apply-training-filters") {
      state.trainingFilters = {
        team: $("#filter-tr-team").value,
        theme: $("#filter-tr-theme").value.trim(),
        format: $("#filter-tr-format").value,
        mode: $("#filter-tr-mode").value
      };
      renderCalendar();
      toast("Filtros da agenda aplicados.");
    }
    if (action === "clear-training-filters") {
      state.trainingFilters = { team: "", theme: "", format: "", mode: "" };
      ["filter-tr-theme"].forEach((fieldId) => { $(`#${fieldId}`).value = ""; });
      ["filter-tr-team", "filter-tr-format", "filter-tr-mode"].forEach((fieldId) => { $(`#${fieldId}`).value = ""; });
      renderCalendar();
      toast("Filtros limpos.");
    }
    if (action === "render-library") renderLibrary();
    if (action === "render-materials") {
      renderMaterials();
      toast("Filtros de materiais aplicados.");
    }
    if (action === "clear-material-filters") {
      ["mat-q", "mat-category", "mat-format", "mat-version", "mat-updated"].forEach((fieldId) => { $(`#${fieldId}`).value = ""; });
      $("#mat-brand").value = "";
      state.materialType = "Todos";
      renderMaterials();
      renderChips();
    }
    if (action === "apply-performance") {
      const bits = [$("#perf-period").value, $("#perf-team").value, $("#perf-manager").value, $("#perf-position").value].filter(Boolean);
      $("#perf-note").textContent = bits.length
        ? `Recorte aplicado (${bits.join(", ")}). Sem dados disponíveis para esse recorte.`
        : "Sem dados disponíveis para ADP, metas, treinamento, 1:1 ou evolução.";
      toast("Recorte de desempenho atualizado.");
    }
    if (action === "apply-roi-filters") {
      const bits = [$("#roi-period").value, $("#roi-team").value, $("#roi-position").value, $("#roi-person").value, $("#roi-unit").value, $("#roi-brand").value].filter(Boolean);
      $("#roi-filter-note").textContent = bits.length
        ? `Filtro aplicado (${bits.join(", ")}). Ainda não existem dados financeiros integrados.`
        : "";
      toast("Filtros financeiros aplicados. Nenhum valor foi calculado.");
    }
    if (action === "open-course") {
      state.courseId = button.dataset.id;
      go("curso");
      renderCourse();
    }
    if (action === "enroll") {
      const course = state.courses.find((item) => item.id === button.dataset.id);
      if (!lessonsOf(course).length) return toast("Este curso ainda não possui aulas.");
      state.enrollments[course.id] = { lessons: [], done: false };
      toast("Matrícula iniciada nesta sessão.");
      renderCourse();
      renderHome();
    }
    if (action === "complete-lesson") {
      const enrollment = state.enrollments[button.dataset.course];
      if (!enrollment.lessons.includes(button.dataset.lesson)) enrollment.lessons.push(button.dataset.lesson);
      const course = state.courses.find((item) => item.id === button.dataset.course);
      if (enrollment.lessons.length === lessonsOf(course).length) {
        enrollment.done = true;
        award("curso", `Curso concluído nesta sessão: ${course.title}.`);
        notify(`Curso concluído: ${course.title}`);
      }
      toast("Aula concluída nesta sessão.");
      renderCourse();
      renderCourses();
      renderGame();
    }
    if (action === "certificate") {
      const course = state.courses.find((item) => item.id === button.dataset.id);
      openModal("Certificado demonstrativo", `<p>Universidade 300 registra a conclusão de <strong>${esc(course.title)}</strong> nesta sessão do protótipo.</p><p class="muted">Sem validade formal e sem assinatura de uma pessoa inventada.</p>`, `<button class="btn btn-primary" type="button" data-action="close-modal">Fechar</button>`);
    }
    if (action === "set-attendance") {
      const person = (state.participants[button.dataset.training] || []).find((item) => item.id === button.dataset.person);
      if (!person) return;
      person.status = button.dataset.status;
      person.updatedAt = new Date().toISOString();
      toast(`Presença marcada como ${button.dataset.status}.`);
      renderAllAttendance();
    }
    if (action === "pick-day") {
      state.calendar.selected = button.dataset.date;
      renderCalendar();
    }
    if (action === "filter-people") {
      renderPeople();
      toast("Filtro de colaboradores aplicado.");
    }
    if (action === "filter-docs") {
      renderDocuments();
      toast("Filtro de documentos aplicado.");
    }
    if (action === "open-nine") {
      openModal(button.dataset.cell, `<p class="muted">${esc(button.querySelector(".muted")?.textContent || "")}</p><div class="empty"><div class="mark"></div><h3>Nenhuma pessoa nesta classificação</h3><p>A lista abre quando desempenho e potencial tiverem origem real. Ninguém foi posicionado para preencher a célula.</p></div>`, `<button class="btn btn-primary" type="button" data-action="close-modal">Fechar</button>`);
    }
    if (action === "set-role") {
      $("#role-switch").value = button.dataset.role;
      $("#role-switch").dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (action === "report-filter") {
      toast("Filtro do relatório aplicado. Sem dados para este recorte.");
    }
    if (action === "show-training") {
      const item = state.trainings.find((entry) => entry.id === button.dataset.id);
      const related = state.nps.filter((entry) => entry.trainingId === item.id);
      const review = state.reviews.find((entry) => entry.trainingId === item.id);
      const people = state.participants[item.id] || [];
      openModal(item.title, `
        <p>${esc(item.theme)} · ${esc(item.format)} · ${esc(item.date)} · ${esc(item.owner || "Instrutor não informado")}</p>
        <article class="item"><h3>Descrição</h3><p>${esc(item.theme)}</p></article>
        <article class="item"><h3>Apresentação</h3><p class="muted">Nenhum arquivo anexado.</p></article>
        <article class="item"><h3>Gravação</h3><p class="muted">Nenhuma gravação disponível.</p></article>
        <article class="item"><h3>Materiais</h3><p class="muted">Nenhum material vinculado.</p></article>
        <article class="item"><h3>Presença</h3><p class="muted">${people.length ? `${people.length} participante(s) nesta sessão.` : "Nenhuma presença marcada."}</p></article>
        <article class="item"><h3>NPS</h3><p class="muted">${related.length ? "Há resposta de NPS nesta sessão." : "Nenhuma resposta de NPS."}</p></article>
        <article class="item"><h3>Avaliação</h3><p class="muted">${review ? `Avaliação geral ${review.score} nesta sessão.` : "Nenhuma avaliação registrada."}</p></article>`, `<button class="btn btn-primary" type="button" data-action="close-modal">Fechar</button>`);
    }
    if (action === "open-ticket") {
      const ticket = state.tickets.find((item) => item.id === button.dataset.id);
      if (!ticket) return;
      ticket.comments = ticket.comments || [];
      ticket.log = ticket.log || [];
      openModal(`Chamado · ${ticket.area}`, `
        <p class="meta">${esc(ticket.motivo)} · ${esc(ticket.level)} · ${esc(ticket.status)}</p>
        <p>${esc(ticket.context || "")}</p>
        <h3>Histórico</h3>
        ${ticket.log.map((line) => `<p class="meta">${esc(line)}</p>`).join("") || `<p class="muted">Sem histórico.</p>`}
        <h3>Comentários</h3>
        ${ticket.comments.map((note) => `<article class="item"><p>${esc(note.text)}</p><p class="meta">${fmtDate(note.at)}</p></article>`).join("") || `<p class="muted">Nenhum comentário nesta sessão.</p>`}
        <form data-form="ticketNote" data-id="${ticket.id}" class="section"><label class="field"><span>Comentário</span><textarea name="comment" required></textarea></label><button class="btn btn-primary" type="submit">Salvar comentário nesta sessão</button></form>`,
        `<button class="btn btn-ghost" type="button" data-action="close-modal">Fechar</button>`);
    }
    if (action === "open-adp-person") {
      const person = state.people.find((item) => item.id === button.dataset.id);
      if (!person) return;
      const note = state.manualNotes[person.id] || "";
      const editable = roleCan("adp", "manage");
      openModal(person.name, `
        <article class="item"><span class="badge badge-source">RESULTADOS</span><p class="muted">Campo automático bloqueado. Aguardando integração.</p><input disabled value="Aguardando Resultados"></article>
        <article class="item"><span class="badge badge-source">CRM</span><p class="muted">Campo automático bloqueado. Aguardando integração.</p><input disabled value="Aguardando CRM"></article>
        <article class="item"><span class="badge badge-new">MANUAL</span>${editable ? `<label class="field"><span>Avaliação manual</span><textarea id="manual-note">${esc(note)}</textarea></label>` : `<p class="muted">${note ? esc(note) : "Campo manual visível, sem edição neste perfil."}</p>`}</article>
        <article class="item"><h3>Score</h3><p class="strong-empty">Não calculado</p></article>
        <article class="item"><h3>PDI</h3><p class="muted">${state.pdis.some((item) => item.person === person.name) ? "Há PDI desta sessão para este nome." : "Nenhum PDI vinculado."}</p></article>
        <article class="item"><h3>Histórico</h3><p class="muted">Sem ciclos anteriores com score.</p></article>`,
        editable ? `<button class="btn btn-primary" type="button" data-action="save-manual" data-id="${person.id}">Salvar nota nesta sessão</button>` : `<button class="btn btn-primary" type="button" data-action="close-modal">Fechar</button>`);
    }
    if (action === "save-manual") {
      const note = $("#manual-note")?.value.trim() || "";
      state.manualNotes[button.dataset.id] = note;
      toast("Avaliação manual salva nesta sessão. Resultados e CRM continuam bloqueados.");
      closeModal();
      renderAdp();
    }
    if (action === "material-history") {
      const item = state.materials.find((entry) => entry.id === button.dataset.id);
      openModal(`Histórico · ${item.title}`, item.versions.map((version) => `<article class="item"><strong>Versão ${esc(version.version)}</strong><p class="meta">${esc(version.status)} · ${esc(version.date || "sem data")} · ${esc(version.owner || "responsável não informado")} · ${esc(version.format || "formato não informado")}</p></article>`).join(""), `<button class="btn btn-primary" type="button" data-action="close-modal">Fechar</button>`);
    }
    if (action === "material-version") {
      const item = state.materials.find((entry) => entry.id === button.dataset.id);
      openModal("Nova versão", `<form data-form="materialVersion" data-id="${item.id}"><div class="form-grid"><label class="field"><span>Versão</span><input name="version" required></label><label class="field"><span>Data</span><input name="date" type="date"></label><label class="field"><span>Responsável</span><input name="owner"></label><label class="field"><span>Status</span><select name="status"><option>vigente</option><option>rascunho</option><option>substituído</option></select></label><label class="field"><span>Formato</span><input name="format"></label></div><p class="form-error" data-error></p><div class="inline-actions"><button class="btn btn-primary" type="submit">Salvar versão</button></div></form>`, `<button class="btn btn-ghost" type="button" data-action="close-modal">Cancelar</button>`);
    }
    if (action === "open-person") {
      const person = state.people.find((item) => item.id === button.dataset.id);
      const blocks = [
        ["Resumo", `${esc(person.position || "Função não informada")} · ${esc(person.team || "Equipe não informada")} · gestor ${esc(person.manager || "não informado")} · ${esc(person.unit || "Unidade não informada")} · ${esc(person.brand || "Marca não informada")}`],
        ["Metas", "Sem dados disponíveis"],
        ["ADP", "Nenhum ciclo ADP disponível para esta pessoa."],
        ["1:1", state.oneOnOnes.some((item) => item.person === person.name) ? "Há 1:1 desta sessão com este nome." : "Nenhum 1:1 registrado"],
        ["PDI", state.pdis.some((item) => item.person === person.name) ? "Há PDI desta sessão com este nome." : "Nenhum PDI ativo"],
        ["Treinamentos", "Nenhum vínculo de presença com este nome."],
        ["Universidade", "Nenhuma matrícula vinculada."],
        ["Gamificação", "Nenhum ponto disponível"],
        ["Histórico", "Sem eventos anteriores."]
      ];
      openModal(person.name, `<p class="meta">${esc(person.email)} · ${esc(person.status)}</p>${blocks.map(([title, text]) => `<article class="item"><h3>${title}</h3><p class="muted">${text}</p></article>`).join("")}`, `<button class="btn btn-primary" type="button" data-action="close-modal">Fechar</button>`);
    }
    if (action === "open-document") {
      const doc = state.documents.find((item) => item.id === button.dataset.id);
      const accepted = state.acks.includes(doc.id);
      openModal(doc.title, `<p class="meta">${esc(doc.category)} · versão ${esc(doc.version)}</p><p>${esc(doc.body)}</p>${accepted ? `<p>Aceite já registrado nesta sessão.</p>` : `<label class="check"><input type="checkbox" id="ack-check"> Li esta versão e aceito.</label>`}`,
        accepted ? `<button class="btn btn-primary" type="button" data-action="close-modal">Fechar</button>` : `<button class="btn btn-primary" type="button" data-action="accept-document" data-id="${doc.id}">Registrar aceite</button>`);
    }
    if (action === "accept-document") {
      if (!$("#ack-check")?.checked) return toast("Confirme a leitura antes de aceitar.");
      if (state.acks.includes(button.dataset.id)) return toast("Esta versão já foi aceita nesta sessão.");
      state.acks.push(button.dataset.id);
      pushHistory("Aceite de documento registrado nesta sessão.");
      toast("Aceite registrado nesta sessão, com a versão aberta.");
      closeModal();
      renderDocuments();
      renderHome();
    }
    if (action === "new-version") {
      const doc = state.documents.find((item) => item.id === button.dataset.id);
      const [major, minor] = String(doc.version).split(".");
      doc.version = `${Number(major) || 1}.${(Number(minor) || 0) + 1}`;
      state.acks = state.acks.filter((item) => item !== doc.id);
      toast("Nova versão registrada. O aceite anterior desta sessão foi encerrado.");
      renderDocuments();
    }
    if (action === "open-report") openReport(button.dataset.report);
    if (action === "export-csv") exportCsv();
    if (action === "remove") removeItem(button.dataset.kind, button.dataset.id);
  }

  function closeSidebar() {
    $("#sidebar").classList.remove("is-open");
    $("#backdrop").hidden = true;
  }

  function applySearch() {
    const query = $("#global-search").value.trim().toLowerCase();
    const view = $(`#view-${state.view}`);
    if (!view) return;
    view.querySelectorAll("[data-search]").forEach((el) => {
      el.hidden = Boolean(query) && !el.dataset.search.toLowerCase().includes(query);
    });
  }

  function onChange(event) {
    const target = event.target;
    if (target.id === "role-switch") {
      state.role = target.value;
      applyAccess();
      renderNews();
      renderHome();
      toast(`Visão do protótipo: ${ROLES[state.role]}. Isso não é login.`);
    }
    if (target.id === "ticket-area") {
      const motivos = ROUTES[target.value] || [];
      $("#ticket-motivo").innerHTML = [`<option value="">${motivos.length ? "Selecione" : "Selecione a área antes"}</option>`, ...motivos.map((motivo) => `<option>${esc(motivo)}</option>`)].join("");
    }
    if (target.id === "adp-field-type") $("#adp-options-wrap").hidden = target.value !== "lista";
    if (target.dataset.permRole) {
      state.access[target.dataset.permRole][target.dataset.permModule] = target.value;
      applyAccess();
      toast("Permissão da simulação atualizada. Ela se perde ao atualizar a página.");
    }
    if (target.dataset.attendanceSelect) renderAttendance(target.closest("[data-attendance]"));
    if (target.dataset.action === "move-card") {
      const collection = target.dataset.board === "tickets" ? state.tickets : state.candidates;
      const cardItem = collection.find((item) => item.id === target.dataset.id);
      if (cardItem) {
        cardItem.status = target.value;
        if (target.dataset.board === "tickets") {
          cardItem.log = cardItem.log || [];
          cardItem.log.unshift(`Movido para ${target.value} nesta sessão.`);
          notify(`Chamado atualizado para ${target.value}.`);
        }
        toast("Movimentação salva nesta sessão.");
        renderBoards();
        renderHome();
      }
    }
  }

  function onDragStart(event) {
    const cardItem = event.target.closest("[data-drag]");
    if (!cardItem) return;
    state.drag = { board: cardItem.dataset.drag, id: cardItem.dataset.id };
    event.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(event) {
    const column = event.target.closest(".kanban-col");
    if (!column || !state.drag) return;
    event.preventDefault();
    column.classList.add("is-over");
  }
  function onDragLeave(event) {
    event.target.closest(".kanban-col")?.classList.remove("is-over");
  }
  function onDrop(event) {
    const column = event.target.closest(".kanban-col");
    if (!column || !state.drag) return;
    event.preventDefault();
    column.classList.remove("is-over");
    const collection = state.drag.board === "tickets" ? state.tickets : state.candidates;
    const cardItem = collection.find((item) => item.id === state.drag.id);
    if (cardItem) {
      cardItem.status = column.dataset.status;
      if (state.drag.board === "tickets") {
        cardItem.log = cardItem.log || [];
        cardItem.log.unshift(`Movido para ${column.dataset.status} nesta sessão.`);
      }
    }
    state.drag = null;
    toast("Quadro atualizado nesta sessão.");
    renderBoards();
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".dropdown") && !event.target.closest("[data-dropdown]")) closeDropdowns();
    handleClick(event);
  });
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form?.dataset.form === "materialVersion") {
      event.preventDefault();
      if (!requireForm(form)) return;
      const item = state.materials.find((entry) => entry.id === form.dataset.id);
      const data = formData(form);
      item.versions.forEach((version) => { if (version.status === "vigente") version.status = "substituído"; });
      item.versions.push(data);
      toast("Versão acrescentada sem apagar o histórico.");
      closeModal();
      renderMaterials();
      return;
    }
    handleSubmit(event);
  });
  document.addEventListener("change", onChange);
  document.addEventListener("input", (event) => {
    if (event.target.id === "global-search") applySearch();
    if (event.target.id === "news-q") renderNews();
  });
  document.addEventListener("dragstart", onDragStart);
  document.addEventListener("dragover", onDragOver);
  document.addEventListener("dragleave", onDragLeave);
  document.addEventListener("drop", onDrop);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      closeDropdowns();
      closeSidebar();
    }
  });
  window.addEventListener("hashchange", () => {
    const view = location.hash.replace("#", "") || "inicio";
    if (view !== state.view) go(view, { silent: true });
  });

  renderMatrix();
  renderAll();
  setWizard(0);
  const initial = location.hash.replace("#", "");
  if (initial) go(initial, { silent: true });
})();
