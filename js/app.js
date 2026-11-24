/* ===== WORKFLOW — Interface, roteamento SPA e controladores (Vanilla JS) ===== */
const ui = {
  pq: '', pStatus: '', pResp: '', pDepto: '', pOrd: 'prio', pTab: 'fluxo',
  kResp: '', kPri: '', kEq: '', kProc: '',
  tView: 'todas', tq: '', tResp: '',
  aTab: 'pendentes', uq: '', uRole: '', uDepto: '', uSit: '',
  rTipo: 'concluidos', rIni: '', rFim: '', rEq: '', rDepto: '', rStatus: '',
  nF: 'todas', audQ: '', eqTab: 'membros'
};
const rec = { step: 1, email: '', code: '' };
let authMode = 'login';
const STATUS_COR = ['#9DA1B5', '#5146E5', '#F4B740', '#7469F5', '#EF6262', '#20B981', '#85899C'];

/* ---------- Utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');
const initials = n => String(n).split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase();
const who = id => { const n = nomeUser(id); return `<span class="who"><span class="avatar">${esc(initials(n))}</span><span>${esc(n)}</span></span>`; };
const badgeSt = s => `<span class="badge st-${slug(s)}">${esc(s)}</span>`;
const badgePr = p => `<span class="badge pri-${slug(p)}">${esc(p)}</span>`;
const deptoNome = id => (db.departamentos.find(d => d.id === id) || { nome: '—' }).nome;
const prioIdx = p => PRIORIDADES.indexOf(p);
const dataBr = iso => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const opts = (list, sel, ph) => (ph !== undefined ? `<option value="">${esc(ph)}</option>` : '') + list.map(([v, l]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
const uOpts = (sel, ph, filtro = () => true) => opts(db.usuarios.filter(u => (u.ativo || u.id === sel) && filtro(u)).map(u => [u.id, u.nome]), sel, ph);
const sOpts = (arr, sel, ph) => opts(arr.map(x => [x, x]), sel, ph);
const empty = (t, s = '') => `<div class="empty"><b>${t}</b>${s}</div>`;
const minhas = () => db.notificacoes.filter(n => n.userId === currentUserId);
const pendentesAprov = () => { const me = currentUser(); return me ? db.aprovacoes.filter(a => a.status === 'Pendente' && (a.aprovador === me.id || me.role === 'admin')) : []; };
const aprovVisiveis = () => { const me = currentUser(); return me.role === 'admin' ? db.aprovacoes : db.aprovacoes.filter(a => a.solicitante === me.id || a.aprovador === me.id); };
const tarefasVisiveis = () => { const me = currentUser(); return db.tarefas.filter(t => me.role !== 'colaborador' || t.responsavel === me.id); };
const podeMover = t => can('tarefa:gerenciar') || t.responsavel === currentUserId;
const hb = (label, pct, txt) => `<div class="hbar"><span class="grow">${esc(label)}</span><div class="track"><div class="fill" style="width:${Math.min(100, pct)}%"></div></div><span class="val">${txt}</span></div>`;
const go = h => { if (location.hash === h) render(); else location.hash = h; };
const formData = f => { const o = {}; new FormData(f).forEach((v, k) => { o[k] = k in o ? [].concat(o[k], v) : v; }); return o; };

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`; el.textContent = msg;
  $('#toast-root').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3200);
}
function openModal(title, body, foot = '', wide = false) {
  $('#modal-root').innerHTML = `<div class="modal-bg" data-bg><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-act="closeModal" type="button" aria-label="Fechar">✕</button></div>
    <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div></div>`;
}
const closeModal = () => { $('#modal-root').innerHTML = ''; };
const isModalOpen = () => !!document.querySelector('.modal');

/* ---------- Navegação ---------- */
const routes = [
  { k: 'dashboard', l: 'Dashboard', i: '▦', s: 'Principal' },
  { k: 'processos', l: 'Processos', i: '◧' },
  { k: 'kanban', l: 'Quadro Kanban', i: '▥' },
  { k: 'tarefas', l: 'Tarefas', i: '☑' },
  { k: 'aprovacoes', l: 'Aprovações', i: '✔', badge: 'aprov' },
  { k: 'equipes', l: 'Equipes', i: '⚑', s: 'Gestão' },
  { k: 'usuarios', l: 'Usuários', i: '☺', perm: 'usuario:gerenciar' },
  { k: 'relatorios', l: 'Relatórios', i: '▤', perm: 'relatorio:ver', s: 'Análise' },
  { k: 'auditoria', l: 'Auditoria', i: '⌛', perm: 'auditoria:ver' },
  { k: 'notificacoes', l: 'Notificações', i: '🔔', badge: 'notif', s: 'Conta' },
  { k: 'perfil', l: 'Perfil', i: '◉' },
  { k: 'configuracoes', l: 'Configurações', i: '⚙' }
];
function parseHash() {
  const h = (location.hash || '#/dashboard').replace(/^#\/?/, '');
  const [r, id] = h.split('/');
  const key = r === 'processo' ? 'processo' : r === 'equipe' ? 'equipe' : r;
  return { r: VIEWS[key] ? key : 'dashboard', id: id || '' };
}
function shell(active) {
  const u = currentUser();
  const pend = pendentesAprov().length;
  const nao = minhas().filter(n => !n.lida).length;
  const nav = routes.filter(r => !r.perm || can(r.perm)).map(r => `
    ${r.s ? `<div class="nav-label">${r.s}</div>` : ''}
    <a href="#/${r.k}" data-nav="${r.k}" class="${active === r.k ? 'active' : ''}"><span class="ico">${r.i}</span>${r.l}
      ${r.badge === 'aprov' && pend ? `<span class="count">${pend}</span>` : ''}
      ${r.badge === 'notif' && nao ? `<span class="count">${nao}</span>` : ''}</a>`).join('');
  return `<div class="shell">
    <aside class="sidebar">
      <div class="brand"><span class="logo">W</span>WORKFLOW</div>
      <nav class="nav">${nav}</nav>
      <div class="sidebar-foot"><span class="avatar">${esc(initials(u.nome))}</span>
        <div class="who grow"><div>${esc(u.nome)}</div><div class="small muted">${PAPEIS[u.role]}</div></div>
        <button class="icon-btn" data-act="logout" title="Sair" type="button">⏻</button></div>
    </aside>
    <div class="sidebar-backdrop" data-act="toggleNav"></div>
    <div class="main">
      <header class="topbar">
        <button class="icon-btn menu-toggle" data-act="toggleNav" type="button" aria-label="Menu">☰</button>
        <div class="search"><input id="gsearch" placeholder="Buscar processos... (Enter)" data-gsearch autocomplete="off"></div>
        <div class="grow"></div>
        ${can('processo:gerenciar') ? '<button class="btn btn-primary hide-sm" data-act="newProc" type="button">+ Novo processo</button>' : ''}
        <button class="icon-btn" data-act="toggleTheme" title="Alternar tema" type="button">◐</button>
        <button class="icon-btn" data-act="goNotif" type="button" title="Notificações">🔔${nao ? `<span class="badge-dot">${nao}</span>` : ''}</button>
      </header>
      <main id="view" class="view"></main>
    </div>
  </div>`;
}

/* ---------- Renderização principal ---------- */
function render() {
  if (!currentUser()) { currentUserId = null; localStorage.removeItem(SESSION_KEY); renderAuth(); return; }
  const { r, id } = parseHash();
  const route = routes.find(x => x.k === r);
  if (route && route.perm && !can(route.perm)) { location.hash = '#/dashboard'; return; }
  const activeKey = r === 'processo' ? 'processos' : r === 'equipe' ? 'equipes' : r;
  $('#app').innerHTML = shell(activeKey);
  renderView();
}
function renderView() {
  const v = $('#view'); if (!v) return;
  const { r, id } = parseHash();
  v.innerHTML = VIEWS[r](id);
  if (r === 'kanban') bindKanban();
  document.body.classList.remove('nav-open');
}

/* ---------- Autenticação ---------- */
function renderAuth() {
  if (authMode === 'recover') {
    $('#app').innerHTML = `<div class="auth"><section class="auth-hero">${heroHtml()}</section>
    <section class="auth-panel"><div class="auth-card">
      <div class="login-steps"><i class="${rec.step >= 1 ? 'on' : ''}"></i><i class="${rec.step >= 2 ? 'on' : ''}"></i></div>
      ${rec.step === 1 ? `<h1>Recuperar senha</h1><p class="muted mb">Informe o e-mail da sua conta. Enviaremos um código de verificação.</p>
        <form data-form="rec1" class="grid" style="gap:14px"><label class="field">E-mail<input class="input" type="email" name="email" required placeholder="voce@empresa.com"></label>
        <button class="btn btn-primary" type="submit">Enviar código</button></form>`
        : `<h1>Definir nova senha</h1><p class="muted mb">Código enviado para <b>${esc(rec.email)}</b>. <span class="small">(simulação: código <b class="code">${rec.code}</b>)</span></p>
        <form data-form="rec2" class="grid" style="gap:14px"><label class="field">Código de verificação<input class="input code-box" name="codigo" maxlength="6" required></label>
        <label class="field">Nova senha <small>(mín. 6 caracteres)</small><input class="input" type="password" name="senha" required minlength="6"></label>
        <button class="btn btn-primary" type="submit">Redefinir senha</button></form>`}
      <p class="mt small"><a href="#" data-act="authMode" data-m="login">← Voltar para o login</a></p>
    </div></section></div>`;
    return;
  }
  $('#app').innerHTML = `<div class="auth"><section class="auth-hero">${heroHtml()}</section>
  <section class="auth-panel"><div class="auth-card">
    <h1>Entrar</h1><p class="muted mb">Acesse sua conta para continuar.</p>
    <form data-form="login" class="grid" style="gap:14px">
      <label class="field">E-mail<input class="input" type="email" name="email" required autocomplete="username" placeholder="voce@empresa.com"></label>
      <label class="field">Senha<input class="input" type="password" name="senha" required autocomplete="current-password"></label>
      <label class="check"><input type="checkbox" name="lembrar" checked> Manter conectado</label>
      <button class="btn btn-primary" type="submit" style="padding:11px">Entrar no WORKFLOW</button>
    </form>
    <p class="small mt"><a href="#" data-act="authMode" data-m="recover">Esqueci minha senha</a></p>
    <div class="demo mt"><b>Contas de demonstração</b>
      <button type="button" data-act="demoFill" data-email="admin@workflow.com" data-senha="admin123">Administrador — admin@workflow.com</button>
      <button type="button" data-act="demoFill" data-email="gestor@workflow.com" data-senha="gestor123">Gestor — gestor@workflow.com</button>
      <button type="button" data-act="demoFill" data-email="colab@workflow.com" data-senha="colab123">Colaborador — colab@workflow.com</button>
    </div>
  </div></section></div>`;
}
function heroHtml() {
  return `<div class="brand" style="color:#fff;padding:0"><span class="logo">W</span>WORKFLOW</div>
  <div><h2>Organize processos, tarefas e aprovações em um só lugar.</h2>
  <p style="margin-top:14px;color:#C9CCE8">Gestão clara, prazos sob controle e decisões rastreáveis para equipes de alta performance.</p></div>
  <ul><li>Fluxos de trabalho com etapas e regras condicionais</li><li>Quadro Kanban com arrastar e soltar</li><li>Histórico auditável de cada ação</li></ul>`;
}
function checkAtrasos() {
  const me = currentUser(); let mudou = false;
  db.tarefas.filter(t => t.responsavel === me.id && tarefaAtrasada(t)).forEach(t => {
    const txt = `Tarefa atrasada: ${t.titulo}`;
    if (!db.notificacoes.some(n => n.userId === me.id && n.texto === txt)) {
      db.notificacoes.unshift({ id: uid('n'), userId: me.id, texto: txt, tipo: 'atraso', lida: false, data: agora() }); mudou = true;
    }
  });
  if (mudou) saveDB();
}

/* ---------- Componentes de conteúdo ---------- */
function kpi(label, valor, icone, cls = '', sub = '') {
  return `<div class="card kpi hover ${cls}"><span class="ico">${icone}</span><span class="label">${label}</span><span class="value">${valor}</span><span class="delta">${sub}</span></div>`;
}
function colChart(labels, valores) {
  const max = Math.max(1, ...valores);
  return `<div class="bars">${valores.map((v, i) => `<div class="col"><div class="bar" style="height:${Math.max(4, v / max * 130)}px"><span>${v}</span></div><div class="lbl" title="${esc(labels[i])}">${esc(labels[i])}</div></div>`).join('')}</div>`;
}
function donut(items) {
  const total = items.reduce((s, x) => s + x.v, 0) || 1;
  let acc = 0;
  const grad = items.filter(x => x.v).map(x => { const a = acc, b = acc + x.v / total * 360; acc = b; return `${x.c} ${a}deg ${b}deg`; }).join(', ') || '#E6E8F0 0deg 360deg';
  return `<div class="donut-wrap"><div class="donut" data-total="${total === 1 && !items.some(x => x.v) ? 0 : total}" style="background:conic-gradient(${grad})"></div>
    <div class="legend">${items.map(x => `<div><i style="background:${x.c}"></i><span class="grow">${esc(x.l)}</span><b>${x.v}</b></div>`).join('')}</div></div>`;
}
function listaTarefas(lista, vazio) {
  return lista.length ? `<div class="list">${lista.map(t => `
    <div class="item ${tarefaAtrasada(t) ? '' : ''}" data-act="tDetail" data-id="${t.id}" style="cursor:pointer">
      <span class="grow"><span class="t" style="display:block">${esc(t.titulo)}</span>
      <span class="small muted">${t.processoId ? esc((db.processos.find(p => p.id === t.processoId) || {}).nome || '') : 'Tarefa avulsa'}</span></span>
      ${badgePr(t.prioridade)}<span class="small ${tarefaAtrasada(t) ? 'late' : 'muted'}" style="min-width:90px;text-align:right">${fmtDataSimples(t.prazo)}</span></div>`).join('')}</div>`
    : `<p class="muted small">${vazio}</p>`;
}

/* ---------- Views ---------- */
const VIEWS = {};

VIEWS.dashboard = () => {
  const me = currentUser(), procs = processosVisiveis(), tars = tarefasVisiveis();
  const concT = tars.filter(t => t.coluna === 'Concluído'), pendT = tars.filter(t => t.coluna !== 'Concluído');
  const atras = procs.filter(processoAtrasado), aprov = pendentesAprov();
  const prod = tars.length ? Math.round(concT.length / tars.length * 100) : 0;
  const porStatus = STATUS.map((s, i) => ({ l: s, v: procs.filter(p => p.status === s).length, c: STATUS_COR[i] }));
  const dias = [...Array(7)].map((_, i) => addDias(i - 6));
  const concDia = dias.map(d => concT.filter(t => t.concluidaEm === d).length);
  const meses = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + i - 5); return { k: d.toISOString().slice(0, 7), l: d.toLocaleDateString('pt-BR', { month: 'short' }) }; });
  const evol = meses.map(m => db.processos.filter(p => (p.criadoEm || '').startsWith(m.k)).length);
  const equipes = db.equipes.map(e => { const ts = db.tarefas.filter(t => e.membros.includes(t.responsavel)); const c = ts.filter(t => t.coluna === 'Concluído').length; return { n: e.nome, pct: ts.length ? Math.round(c / ts.length * 100) : 0, c, t: ts.length }; });
  const deptos = db.departamentos.map(d => ({ n: d.nome, v: db.processos.filter(p => p.depto === d.id).length }));
  const maxD = Math.max(1, ...deptos.map(x => x.v));
  const ranking = db.usuarios.filter(u => u.ativo).map(u => ({ u, c: db.tarefas.filter(t => t.responsavel === u.id && t.coluna === 'Concluído').length })).sort((a, b) => b.c - a.c).slice(0, 5);
  const atividades = db.auditoria.filter(l => me.role !== 'colaborador' || l.userId === me.id).slice(0, 6);
  const prioritarios = procs.filter(p => ['Urgente', 'Alta'].includes(p.prioridade) && !['Concluído', 'Cancelado'].includes(p.status)).slice(0, 5);
  const prazos = [...pendT.map(t => ({ n: t.titulo, d: t.prazo, tipo: 'Tarefa' })), ...procs.filter(p => !['Concluído', 'Cancelado'].includes(p.status)).map(p => ({ n: p.nome, d: p.prazo, tipo: 'Processo' }))].filter(x => x.d).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 6);
  const minhasT = pendT.filter(t => t.responsavel === me.id).sort((a, b) => a.prazo.localeCompare(b.prazo)).slice(0, 5);
  return `
  <div class="page-head"><div><h1>Olá, ${esc(me.nome.split(' ')[0])} 👋</h1><p>Resumo atualizado de ${PAPEIS[me.role].toLowerCase()} · ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
    ${can('processo:gerenciar') ? '<button class="btn btn-primary" data-act="newProc" type="button">+ Novo processo</button>' : ''}</div>
  <div class="grid g-kpi">
    ${kpi('Total de processos', procs.length, '◧', '', 'Visíveis para você')}
    ${kpi('Em andamento', porStatus[1].v, '▶', '', 'Processos ativos')}
    ${kpi('Concluídos', porStatus[5].v, '✔', 'ok', 'Finalizados')}
    ${kpi('Atrasados', atras.length, '!', 'danger', 'Prazo vencido')}
    ${kpi('Tarefas pendentes', pendT.length, '☑', 'warn', 'Em aberto')}
    ${kpi('Tarefas concluídas', concT.length, '✓', 'ok', 'Finalizadas')}
    ${kpi('Aprovações aguardando', aprov.length, '✎', 'warn', 'Resposta pendente')}
    ${kpi('Produtividade', prod + '%', '↗', '', 'Tarefas concluídas')}
  </div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><div><h2>Processos por status</h2><div class="sub">Distribuição atual</div></div></div>${donut(porStatus)}</div>
    <div class="card"><div class="card-head"><div><h2>Tarefas concluídas por período</h2><div class="sub">Últimos 7 dias</div></div></div>${colChart(dias.map(d => fmtDataSimples(d).slice(0, 5)), concDia)}</div>
    <div class="card"><div class="card-head"><div><h2>Produtividade por equipe</h2><div class="sub">% de tarefas concluídas</div></div></div>${equipes.map(e => hb(e.n, e.pct, e.pct + '%')).join('') || empty('Nenhuma equipe')}</div>
    <div class="card"><div class="card-head"><div><h2>Processos por departamento</h2><div class="sub">Quantidade</div></div></div>${deptos.map(d => hb(d.n, d.v / maxD * 100, d.v)).join('')}</div>
    <div class="card"><div class="card-head"><div><h2>Evolução mensal</h2><div class="sub">Processos criados nos últimos 6 meses</div></div></div>${colChart(meses.map(m => m.l), evol)}</div>
    <div class="card"><div class="card-head"><div><h2>Ranking de produtividade</h2><div class="sub">Tarefas concluídas por colaborador</div></div></div>
      <div class="list">${ranking.map((r, i) => `<div class="item"><span class="step-num ${i === 0 ? 'done' : ''}" style="width:28px;height:28px;font-size:12px">${i + 1}</span>${who(r.u.id)}<span class="grow"></span><b>${r.c}</b></div>`).join('')}</div></div>
  </div>
  <div class="grid g-3 mt">
    <div class="card"><div class="card-head"><h2>Minhas tarefas</h2><a href="#/tarefas" class="small">Ver todas</a></div>${listaTarefas(minhasT, 'Nenhuma tarefa atribuída a você.')}</div>
    <div class="card"><div class="card-head"><h2>Próximos prazos</h2></div><div class="list">${prazos.map(x => `<div class="item"><span class="grow"><span class="t" style="display:block">${esc(x.n)}</span><span class="small muted">${x.tipo}</span></span><span class="small ${x.d < hoje() ? 'late' : 'muted'}">${fmtDataSimples(x.d)}</span></div>`).join('') || '<p class="muted small">Sem prazos próximos.</p>'}</div></div>
    <div class="card"><div class="card-head"><h2>Aprovações pendentes</h2><a href="#/aprovacoes" class="small">Abrir</a></div><div class="list">${aprov.slice(0, 5).map(a => `<div class="item"><span class="grow"><span class="t" style="display:block">${esc(a.titulo)}</span><span class="small muted">de ${esc(nomeUser(a.solicitante))} · ${fmtDataSimples(a.criadaEm)}</span></span></div>`).join('') || '<p class="muted small">Nenhuma aprovação aguardando.</p>'}</div></div>
    <div class="card"><div class="card-head"><h2>Processos prioritários</h2></div><div class="list">${prioritarios.map(p => `<a class="item" href="#/processo/${p.id}"><span class="grow"><span class="t" style="display:block">${esc(p.nome)}</span><span class="progress ${progressoProcesso(p) >= 100 ? 'ok' : ''}" style="margin-top:6px"><span style="width:${progressoProcesso(p)}%"></span></span></span>${badgePr(p.prioridade)}</a>`).join('') || '<p class="muted small">Nenhum processo prioritário.</p>'}</div></div>
    <div class="card"><div class="card-head"><h2>Atividades recentes</h2></div><div class="timeline">${atividades.map(l => `<div class="ev"><b>${esc(l.acao)}</b> <span class="muted small">— ${esc(nomeUser(l.userId))}</span><small>${dataBr(l.data)}</small></div>`).join('') || '<p class="muted small">Sem atividades.</p>'}</div></div>
    <div class="card"><div class="card-head"><h2>Processos atrasados</h2></div><div class="list">${atras.slice(0, 5).map(p => `<a class="item" href="#/processo/${p.id}"><span class="grow"><span class="t" style="display:block">${esc(p.nome)}</span><span class="small late">Prazo ${fmtDataSimples(p.prazo)}</span></span>${badgeSt(p.status)}</a>`).join('') || '<p class="muted small">Nenhum processo atrasado. 🎉</p>'}</div></div>
  </div>`;
};

VIEWS.processos = () => {
  const q = ui.pq.trim().toLowerCase();
  const list = processosVisiveis().filter(p => (!q || (p.nome + ' ' + p.codigo + ' ' + p.descricao).toLowerCase().includes(q))
    && (!ui.pStatus || p.status === ui.pStatus) && (!ui.pResp || p.responsavel === ui.pResp) && (!ui.pDepto || p.depto === ui.pDepto));
  list.sort((a, b) => ui.pOrd === 'prio' ? prioIdx(b.prioridade) - prioIdx(a.prioridade) : ui.pOrd === 'prazo' ? a.prazo.localeCompare(b.prazo) : a.nome.localeCompare(b.nome));
  const gerencia = can('processo:gerenciar'), excl = can('processo:excluir');
  return `
  <div class="page-head"><div><h1>Processos</h1><p>${list.length} processo(s) encontrado(s)</p></div>
    ${gerencia ? '<button class="btn btn-primary" data-act="newProc" type="button">+ Novo processo</button>' : ''}</div>
  <div class="card">
    <div class="filters mb">
      <input id="pq" class="input search-inline" data-ui="pq" value="${esc(ui.pq)}" placeholder="Pesquisar por nome, código ou descrição">
      <select class="input" data-ui="pStatus"><option value="">Todos os status</option>${sOpts(STATUS, ui.pStatus)}</select>
      <select class="input" data-ui="pResp"><option value="">Todos os responsáveis</option>${uOpts(ui.pResp, undefined)}</select>
      <select class="input" data-ui="pDepto"><option value="">Todos os departamentos</option>${opts(db.departamentos.map(d => [d.id, d.nome]), ui.pDepto)}</select>
      <select class="input" data-ui="pOrd"><option value="prio" ${ui.pOrd === 'prio' ? 'selected' : ''}>Ordenar: prioridade</option><option value="prazo" ${ui.pOrd === 'prazo' ? 'selected' : ''}>Ordenar: prazo</option><option value="nome" ${ui.pOrd === 'nome' ? 'selected' : ''}>Ordenar: nome</option></select>
    </div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>Código</th><th>Processo</th><th class="hide-sm">Departamento</th><th>Responsável</th><th>Prioridade</th><th>Status</th><th>Progresso</th><th>Prazo</th><th></th></tr></thead>
    <tbody>${list.map(p => `<tr class="clickable" data-act="go" data-h="#/processo/${p.id}">
      <td class="code">${p.codigo}</td><td><span class="name-link">${esc(p.nome)}</span><div class="small muted">${esc(p.categoria)}</div></td>
      <td class="hide-sm">${esc(deptoNome(p.depto))}</td><td>${who(p.responsavel)}</td><td>${badgePr(p.prioridade)}</td><td>${badgeSt(p.status)}</td>
      <td style="min-width:120px"><div class="progress ${progressoProcesso(p) >= 100 ? 'ok' : ''}"><span style="width:${progressoProcesso(p)}%"></span></div><div class="small muted">${progressoProcesso(p)}%</div></td>
      <td>${prazoHtml(p.prazo, processoAtrasado(p))}</td>
      <td><div class="actions">${gerencia ? `<button class="icon-btn" title="Editar" data-act="editProc" data-id="${p.id}" type="button">✎</button><button class="icon-btn" title="Duplicar" data-act="dupProc" data-id="${p.id}" type="button">⧉</button>` : ''}${excl ? `<button class="icon-btn" title="Excluir" data-act="delProc" data-id="${p.id}" type="button" style="color:var(--danger)">🗑</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="9">${empty('Nenhum processo encontrado', 'Ajuste os filtros ou crie um novo processo.')}</td></tr>`}</tbody></table></div>
  </div>`;
};

function prazoHtml(prazo, atrasado) { return `<span class="${atrasado ? 'late' : ''}">${fmtDataSimples(prazo)}${atrasado ? ' · atrasado' : ''}</span>`; }

VIEWS.processo = id => {
  const p = db.processos.find(x => x.id === id);
  if (!p) return empty('Processo não encontrado', '<a href="#/processos">Voltar para processos</a>');
  const gerencia = can('processo:gerenciar'), tab = ui.pTab;
  const etapas = [...p.etapas].sort((a, b) => a.ordem - b.ordem);
  const me = currentUser();
  const pendAprov = pendentesAprov().filter(a => a.refId === p.id);
  const tarefas = db.tarefas.filter(t => t.processoId === p.id && (me.role !== 'colaborador' || t.responsavel === me.id));
  const flow = etapas.map((e, i) => {
    const isAp = e.tipo === 'Aprovação' || e.aprovacao;
    const node = `<div class="flow-node ${e.concluida ? 'done' : ''} ${isAp ? 'approval' : ''}">
      <div class="kind">${esc(e.tipo)}${isAp ? ' · aprovação' : ''}</div><div class="nm">${esc(e.nome)}</div>
      <div class="meta">${esc(nomeUser(e.responsavel))}<br>Prazo ${fmtDataSimples(e.prazo)}</div>
      ${isAp ? `<div class="branch ok">✔ ${esc(e.condAprovada || 'Seguir')}</div><div class="branch no">✖ ${esc(e.condRejeitada || 'Retornar')}</div>` : ''}</div>`;
    return (i ? '<div class="flow-arrow">→</div>' : '') + node;
  }).join('');
  const stepRows = etapas.map((e, i) => {
    const isAp = e.tipo === 'Aprovação' || e.aprovacao;
    const dep = etapas.find(x => x.id === e.dependeDe);
    const pode = gerencia || e.responsavel === me.id;
    const aprovPend = pendAprov.find(a => a.etapaId === e.id);
    return `<div class="step-row">
      <div class="step-num ${e.concluida ? 'done' : ''}">${e.concluida ? '✓' : e.ordem}</div>
      <div><div class="row wrap"><b>${esc(e.nome)}</b><span class="badge plain">${esc(e.tipo)}</span>${isAp ? '<span class="badge pri-alta">Requer aprovação</span>' : ''}</div>
        <div class="small muted">${esc(e.descricao || '')} ${e.descricao ? '·' : ''} Responsável: ${esc(nomeUser(e.responsavel))} · Prazo: ${fmtDataSimples(e.prazo)}${dep ? ` · Depende de: ${esc(dep.nome)}` : ''}</div>
        ${isAp ? `<div class="small mt"><span style="color:#14956A">✔ Se aprovada: ${esc(e.condAprovada || '—')}</span> &nbsp; <span style="color:#D64545">✖ Se rejeitada: ${esc(e.condRejeitada || '—')}</span></div>` : ''}</div>
      <div class="acts">
        ${isAp && !e.concluida && can('aprovacao:decidir') ? `<button class="btn btn-sm btn-primary" data-act="decidirEtapa" data-pid="${p.id}" data-eid="${e.id}" type="button">Decidir</button>` : ''}
        ${!isAp && pode ? `<label class="check small"><input type="checkbox" ${e.concluida ? 'checked' : ''} data-act="etapaToggle" data-pid="${p.id}" data-eid="${e.id}"> Concluída</label>` : ''}
        ${gerencia ? `<button class="icon-btn" title="Subir" data-act="etapaMove" data-pid="${p.id}" data-eid="${e.id}" data-dir="-1" type="button" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="icon-btn" title="Descer" data-act="etapaMove" data-pid="${p.id}" data-eid="${e.id}" data-dir="1" type="button" ${i === etapas.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="icon-btn" title="Editar" data-act="editEtapa" data-pid="${p.id}" data-eid="${e.id}" type="button">✎</button>
        <button class="icon-btn" title="Excluir" data-act="delEtapa" data-pid="${p.id}" data-eid="${e.id}" type="button" style="color:var(--danger)">🗑</button>` : ''}
      </div></div>`;
  }).join('');
  const docs = p.documentos.map(d => `<div class="file"><span class="ext">${esc(d.nome.split('.').pop().slice(0, 4).toUpperCase())}</span><div class="grow"><b>${esc(d.nome)}</b><div class="small muted">${esc(d.tamanho)} · ${esc(nomeUser(d.autor))} · ${fmtDataSimples(d.data)}</div></div></div>`).join('') || '<p class="muted small">Nenhum documento anexado.</p>';
  const coms = p.comentarios.map(c => `<div class="comment"><div class="row between"><b>${esc(nomeUser(c.autor))}</b><small>${dataBr(c.data)}</small></div><p>${esc(c.texto)}</p></div>`).join('') || '<p class="muted small">Nenhum comentário ainda.</p>';
  const hist = p.historico.map(h => `<div class="ev"><b>${esc(h.acao)}</b> <span class="muted small">— ${esc(nomeUser(h.autor))}</span>${h.justificativa ? `<p class="small">“${esc(h.justificativa)}”</p>` : ''}<small>${dataBr(h.data)}</small></div>`).join('') || '<p class="muted small">Sem histórico.</p>';
  const auditoria = db.auditoria.filter(l => l.processoId === p.id).slice(0, 15).map(l => `<div class="ev"><b>${esc(l.acao)}</b> <span class="muted small">— ${esc(nomeUser(l.userId))}</span><p class="small muted">${esc(l.alteracao)}</p><small>${dataBr(l.data)}</small></div>`).join('') || '<p class="muted small">Sem registros de auditoria.</p>';
  const pct = progressoProcesso(p);
  const tabs = [['fluxo', 'Fluxo de trabalho'], ['tarefas', `Tarefas (${tarefas.length})`], ['docs', `Documentos (${p.documentos.length})`], ['coms', `Comentários (${p.comentarios.length})`], ['hist', 'Histórico']];
  let body = '';
  if (tab === 'fluxo') body = `
    <div class="card mb"><div class="card-head"><div><h2>Visualização do fluxo</h2><div class="sub">${etapas.filter(e => e.concluida).length} de ${etapas.length} etapas concluídas</div></div>
      ${gerencia ? '<button class="btn btn-sm btn-primary" data-act="newEtapa" data-pid="' + p.id + '" type="button">+ Adicionar etapa</button>' : ''}</div>
      ${etapas.length ? `<div class="flow">${flow}</div>` : empty('Fluxo vazio', 'Adicione etapas para montar o fluxo.')}</div>
    <div class="card"><div class="card-head"><h2>Etapas e condições</h2></div>${etapas.length ? `<div class="step-list">${stepRows}</div>` : ''}
      <p class="small muted mt">Regras: etapas só podem ser concluídas após a dependência; uma aprovação rejeitada retorna para a etapa anterior (correção).</p></div>`;
  if (tab === 'tarefas') body = `<div class="card"><div class="card-head"><h2>Tarefas do processo</h2>${can('tarefa:gerenciar') ? `<button class="btn btn-sm btn-primary" data-act="newTarefa" data-proc="${p.id}" type="button">+ Nova tarefa</button>` : ''}</div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>Tarefa</th><th>Responsável</th><th>Prioridade</th><th>Prazo</th><th>Coluna</th></tr></thead><tbody>
    ${tarefas.map(t => `<tr class="clickable" data-act="tDetail" data-id="${t.id}"><td class="name-link">${esc(t.titulo)}</td><td>${who(t.responsavel)}</td><td>${badgePr(t.prioridade)}</td><td>${prazoHtml(t.prazo, tarefaAtrasada(t))}</td><td><span class="badge plain">${t.coluna}</span></td></tr>`).join('') || `<tr><td colspan="5">${empty('Sem tarefas vinculadas')}</td></tr>`}
    </tbody></table></div></div>`;
  if (tab === 'docs') body = `<div class="card"><div class="card-head"><h2>Documentos</h2></div>${docs}
    <form data-form="docProc" class="mt" data-pid="${p.id}"><input type="hidden" name="pid" value="${p.id}"><label class="drop-zone"><input type="file" name="arquivo" class="hidden" onchange="this.form.requestSubmit()">Clique para anexar um documento</label></form></div>`;
  if (tab === 'coms') body = `<div class="card"><div class="card-head"><h2>Comentários</h2></div>${coms}
    <form data-form="comentario" class="mt grid" style="gap:10px"><input type="hidden" name="tipo" value="processo"><input type="hidden" name="id" value="${p.id}">
    <textarea class="input" name="texto" placeholder="Escreva um comentário..."></textarea><div><button class="btn btn-primary" type="submit">Comentar</button></div></form></div>`;
  if (tab === 'hist') body = `<div class="grid g-2"><div class="card"><div class="card-head"><h2>Histórico do processo</h2></div><div class="timeline">${hist}</div></div>
    <div class="card"><div class="card-head"><h2>Auditoria</h2></div><div class="timeline">${auditoria}</div></div></div>`;
  const aprovBtn = pendAprov.length ? `<span class="badge pri-alta">${pendAprov.length} aprovação(ões) pendente(s)</span>` : '';
  return `
  <a href="#/processos" class="small">← Processos</a>
  <div class="page-head mt"><div><div class="row wrap" style="gap:8px"><span class="code">${p.codigo}</span>${badgeSt(p.status)}${badgePr(p.prioridade)}${aprovBtn}</div>
    <h1 style="margin-top:6px">${esc(p.nome)}</h1><p>${esc(p.descricao)}</p></div>
    <div class="row wrap no-print">
      ${gerencia ? `<button class="btn" data-act="editProc" data-id="${p.id}" type="button">✎ Editar</button><button class="btn" data-act="dupProc" data-id="${p.id}" type="button">⧉ Duplicar</button>` : ''}
      <button class="btn" data-act="solicitar" data-preset="proc|${p.id}|" type="button">Enviar para aprovação</button>
      <button class="btn" onclick="window.print()" type="button">🖨 Imprimir</button>
      ${can('processo:excluir') ? `<button class="btn btn-danger" data-act="delProc" data-id="${p.id}" type="button">Excluir</button>` : ''}
    </div></div>
  <div class="card mb"><div class="grid g-3" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px">
    <div><div class="small muted">Responsável</div>${who(p.responsavel)}</div>
    <div><div class="small muted">Departamento</div><b>${esc(deptoNome(p.depto))}</b></div>
    <div><div class="small muted">Categoria</div><b>${esc(p.categoria)}</b></div>
    <div><div class="small muted">Início</div><b>${fmtDataSimples(p.inicio)}</b></div>
    <div><div class="small muted">Prazo final</div>${prazoHtml(p.prazo, processoAtrasado(p))}</div>
    <div><div class="small muted">Criado em</div><b>${fmtDataSimples(p.criadoEm)}</b></div>
    <div><div class="small muted">Participantes</div><div class="row wrap" style="gap:4px">${p.participantes.map(x => `<span class="avatar" title="${esc(nomeUser(x))}">${esc(initials(nomeUser(x)))}</span>`).join('') || '<span class="small muted">—</span>'}</div></div>
  </div><div class="mt"><div class="row between small"><b>Progresso</b><span>${pct}%</span></div><div class="progress mt ${pct >= 100 ? 'ok' : ''}"><span style="width:${pct}%"></span></div></div></div>
  <div class="tabs">${tabs.map(([k, l]) => `<button type="button" class="${tab === k ? 'on' : ''}" data-act="tab" data-scope="pTab" data-v="${k}">${l}</button>`).join('')}</div>
  ${body}`;
};

VIEWS.kanban = () => {
  const me = currentUser();
  const cards = tarefasVisiveis().filter(t => (!ui.kResp || t.responsavel === ui.kResp) && (!ui.kPri || t.prioridade === ui.kPri)
    && (!ui.kProc || t.processoId === ui.kProc) && (!ui.kEq || (db.equipes.find(e => e.id === ui.kEq) || { membros: [] }).membros.includes(t.responsavel)));
  const corCol = ['#9DA1B5', '#5146E5', '#7469F5', '#EF6262', '#20B981'];
  return `
  <div class="page-head"><div><h1>Quadro Kanban</h1><p>Arraste os cartões entre colunas para atualizar o status.</p></div></div>
  <div class="card mb"><div class="filters">
    <select class="input" data-ui="kResp"><option value="">Todos os responsáveis</option>${uOpts(ui.kResp)}</select>
    <select class="input" data-ui="kPri"><option value="">Todas as prioridades</option>${sOpts(PRIORIDADES, ui.kPri)}</select>
    <select class="input" data-ui="kEq"><option value="">Todas as equipes</option>${opts(db.equipes.map(e => [e.id, e.nome]), ui.kEq)}</select>
    <select class="input" data-ui="kProc"><option value="">Todos os processos</option>${opts(processosVisiveis().map(p => [p.id, p.nome]), ui.kProc)}</select>
    ${can('tarefa:gerenciar') ? '<button class="btn btn-primary" data-act="newTarefa" type="button" style="margin-left:auto">+ Nova tarefa</button>' : ''}
  </div></div>
  <div class="kanban">${COLUNAS.map((c, ci) => {
    const lista = cards.filter(t => t.coluna === c);
    return `<div class="k-col" data-col="${c}"><div class="k-col-bar" style="background:${corCol[ci]}"></div>
      <div class="k-head"><span>${c}</span><span class="count">${lista.length}</span></div>
      ${lista.map(t => {
        const late = tarefaAtrasada(t), pode = podeMover(t);
        const pr = PRIORIDADES.indexOf(t.prioridade);
        return `<div class="k-card ${late ? 'late' : ''}" data-id="${t.id}" draggable="${pode}" data-act="tDetail" style="${pode ? '' : 'cursor:pointer'}">
          <div class="row between">${badgePr(t.prioridade)}${pr >= 3 ? '<span title="Urgente">🔥</span>' : ''}</div>
          <div class="title">${esc(t.titulo)}</div>
          <div class="proc">${esc(((db.processos.find(p => p.id === t.processoId)) || { nome: 'Sem processo' }).nome)}</div>
          <div>${(t.etiquetas || []).map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>
          <div class="foot"><span class="who"><span class="avatar" style="width:24px;height:24px;font-size:10px">${esc(initials(nomeUser(t.responsavel)))}</span></span>
            <span class="${late ? 'late' : ''}">📅 ${fmtDataSimples(t.prazo)}</span><span>💬 ${t.comentarios.length}</span></div>
        </div>`;
      }).join('')}
      ${can('tarefa:gerenciar') ? `<button class="k-add" data-act="newTarefa" data-col="${c}" type="button">+ Adicionar cartão</button>` : ''}
    </div>`;
  }).join('')}</div>
  ${me.role === 'colaborador' ? '<p class="small muted mt">Você pode mover somente as tarefas atribuídas a você.</p>' : ''}`;
};

VIEWS.tarefas = () => {
  const me = currentUser();
  const base = tarefasVisiveis().filter(t => (!ui.tq || t.titulo.toLowerCase().includes(ui.tq.toLowerCase())) && (!ui.tResp || t.responsavel === ui.tResp));
  const filtros = {
    todas: t => true, minhas: t => t.responsavel === me.id, pendentes: t => t.coluna !== 'Concluído',
    atrasadas: t => tarefaAtrasada(t), concluidas: t => t.coluna === 'Concluído'
  };
  const lista = base.filter(filtros[ui.tView]).sort((a, b) => (a.prazo || '9').localeCompare(b.prazo || '9'));
  const vistas = [['todas', 'Todas'], ['minhas', 'Minhas tarefas'], ['pendentes', 'Pendentes'], ['atrasadas', 'Atrasadas'], ['concluidas', 'Concluídas']];
  return `
  <div class="page-head"><div><h1>Tarefas</h1><p>${lista.length} tarefa(s) nesta visualização</p></div>
    ${can('tarefa:gerenciar') ? '<button class="btn btn-primary" data-act="newTarefa" type="button">+ Nova tarefa</button>' : ''}</div>
  <div class="tabs">${vistas.map(([k, l]) => `<button type="button" class="${ui.tView === k ? 'on' : ''}" data-act="tab" data-scope="tView" data-v="${k}">${l}</button>`).join('')}</div>
  <div class="card"><div class="filters mb">
    <input id="tq" class="input search-inline" data-ui="tq" value="${esc(ui.tq)}" placeholder="Pesquisar tarefa...">
    <select class="input" data-ui="tResp"><option value="">Todos os responsáveis</option>${uOpts(ui.tResp)}</select></div>
  <div class="table-wrap"><table class="tbl"><thead><tr><th style="width:40px"></th><th>Tarefa</th><th class="hide-sm">Processo</th><th>Responsável</th><th>Prioridade</th><th>Prazo</th><th>Coluna</th><th></th></tr></thead><tbody>
  ${lista.map(t => {
    const done = t.coluna === 'Concluído';
    return `<tr class="${done ? 'done' : ''}"><td><input type="checkbox" class="chk" ${done ? 'checked' : ''} ${podeMover(t) ? '' : 'disabled'} data-act="tToggle" data-id="${t.id}"></td>
      <td><span class="name-link" style="cursor:pointer" data-act="tDetail" data-id="${t.id}">${esc(t.titulo)}</span>${(t.subtarefas || []).length ? `<div class="small muted">${t.subtarefas.filter(s => s.feita).length}/${t.subtarefas.length} subtarefas</div>` : ''}</td>
      <td class="hide-sm small">${esc(((db.processos.find(p => p.id === t.processoId)) || { nome: '—' }).nome)}</td>
      <td>${who(t.responsavel)}</td><td>${badgePr(t.prioridade)}</td><td>${prazoHtml(t.prazo, tarefaAtrasada(t))}</td><td><span class="badge plain">${t.coluna}</span></td>
      <td><div class="actions">${can('tarefa:gerenciar') ? `<button class="icon-btn" title="Editar" data-act="editTarefa" data-id="${t.id}" type="button">✎</button><button class="icon-btn" title="Excluir" data-act="delTarefa" data-id="${t.id}" type="button" style="color:var(--danger)">🗑</button>` : ''}</div></td></tr>`;
  }).join('') || `<tr><td colspan="8">${empty('Nenhuma tarefa encontrada')}</td></tr>`}
  </tbody></table></div></div>`;
};

VIEWS.aprovacoes = () => {
  const me = currentUser();
  const statusMap = { pendentes: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada', alteracoes: 'Alterações solicitadas' };
  const lista = aprovVisiveis().filter(a => ui.aTab === 'todas' || a.status === statusMap[ui.aTab]).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
  const podeDecidir = can('aprovacao:decidir');
  const abas = [['pendentes', 'Pendentes'], ['aprovada', 'Aprovadas'], ['rejeitada', 'Rejeitadas'], ['alteracoes', 'Alterações solicitadas'], ['todas', 'Todas']];
  const corSt = s => s === 'Pendente' ? 'pri-alta' : s === 'Aprovada' ? 'st-concluido' : s === 'Rejeitada' ? 'st-bloqueado' : 'st-em-revisao';
  return `
  <div class="page-head"><div><h1>Aprovações</h1><p>Solicitações com histórico auditável de decisões.</p></div>
    <button class="btn btn-primary" data-act="solicitar" type="button">+ Nova solicitação</button></div>
  <div class="tabs">${abas.map(([k, l]) => `<button type="button" class="${ui.aTab === k ? 'on' : ''}" data-act="tab" data-scope="aTab" data-v="${k}">${l}</button>`).join('')}</div>
  <div class="list">${lista.map(a => {
    const pode = a.status === 'Pendente' && podeDecidir && (a.aprovador === me.id || me.role === 'admin');
    return `<div class="card mb"><div class="row between wrap" style="align-items:flex-start">
      <div style="min-width:0;flex:1"><div class="row wrap"><span class="badge plain">${a.tipo === 'processo' ? 'Processo' : 'Tarefa'}</span><span class="badge ${corSt(a.status)}">${a.status}</span></div>
        <h3 class="mt">${esc(a.titulo)}</h3>
        <div class="small muted mt">Solicitado por ${esc(nomeUser(a.solicitante))} em ${dataBr(a.historico[0].data)} · Aprovador: ${esc(nomeUser(a.aprovador))}${a.decididaEm ? ' · Decidido em ' + fmtDataSimples(a.decididaEm) : ''}</div></div>
      <div class="row wrap">${pode ? `<button class="btn btn-sm btn-ok" data-act="decidir" data-id="${a.id}" data-dec="Aprovada" type="button">✔ Aprovar</button>
        <button class="btn btn-sm" data-act="decidir" data-id="${a.id}" data-dec="Alterações solicitadas" type="button">✎ Solicitar alterações</button>
        <button class="btn btn-sm btn-danger" data-act="decidir" data-id="${a.id}" data-dec="Rejeitada" type="button">✖ Rejeitar</button>` : ''}
        ${a.refId ? `<a class="btn btn-sm" href="#/${a.tipo === 'processo' ? 'processo/' + a.refId : 'tarefas'}">Ver item</a>` : ''}</div></div>
      <details class="mt"><summary class="small" style="cursor:pointer;color:var(--primary)">Histórico de decisões (${a.historico.length})</summary>
        <div class="timeline mt">${a.historico.map(h => `<div class="ev"><b>${esc(h.acao)}</b> <span class="muted small">— ${esc(nomeUser(h.autor))}</span>${h.justificativa ? `<p class="small">“${esc(h.justificativa)}”</p>` : ''}<small>${dataBr(h.data)}</small></div>`).join('')}</div></details>
    </div>`;
  }).join('') || empty('Nenhuma aprovação nesta categoria', 'Solicitações enviadas aparecerão aqui.')}</div>`;
};

VIEWS.equipes = () => {
  const gerencia = can('equipe:gerenciar');
  return `
  <div class="page-head"><div><h1>Equipes e departamentos</h1><p>Organize pessoas, gestores e produtividade.</p></div>
    ${gerencia ? '<div class="row"><button class="btn" data-act="newDepto" type="button">+ Departamento</button><button class="btn btn-primary" data-act="newEquipe" type="button">+ Nova equipe</button></div>' : ''}</div>
  <div class="grid g-3">${db.equipes.map(e => {
    const ts = db.tarefas.filter(t => e.membros.includes(t.responsavel));
    const c = ts.filter(t => t.coluna === 'Concluído').length, pct = ts.length ? Math.round(c / ts.length * 100) : 0;
    const np = db.processos.filter(p => e.membros.includes(p.responsavel)).length;
    return `<a href="#/equipe/${e.id}" class="card hover" style="color:inherit"><div class="card-head"><div><h2>${esc(e.nome)}</h2><div class="sub">${esc(deptoNome(e.depto))}</div></div>${badgeSt('Em andamento').replace('Em andamento', e.membros.length + ' membros')}</div>
      <div class="row" style="margin-bottom:12px"><span class="muted small">Gestor:</span>${who(e.gestor)}</div>
      <div class="row between small"><span>Produtividade</span><b>${pct}%</b></div><div class="progress mt ${pct >= 70 ? 'ok' : pct < 40 ? 'warn' : ''}"><span style="width:${pct}%"></span></div>
      <div class="row between small mt muted"><span>${np} processo(s)</span><span>${ts.length} tarefa(s)</span></div></a>`;
  }).join('') || empty('Nenhuma equipe cadastrada')}</div>
  <div class="card mt"><div class="card-head"><h2>Departamentos</h2></div><div class="table-wrap"><table class="tbl"><thead><tr><th>Departamento</th><th>Equipes</th><th>Colaboradores</th><th>Processos</th></tr></thead><tbody>
  ${db.departamentos.map(d => `<tr><td class="name-link">${esc(d.nome)}</td><td>${db.equipes.filter(e => e.depto === d.id).length}</td><td>${db.usuarios.filter(u => u.depto === d.id).length}</td><td>${db.processos.filter(p => p.depto === d.id).length}</td></tr>`).join('')}
  </tbody></table></div></div>`;
};

VIEWS.equipe = id => {
  const e = db.equipes.find(x => x.id === id);
  if (!e) return empty('Equipe não encontrada', '<a href="#/equipes">Voltar para equipes</a>');
  const gerencia = can('equipe:gerenciar');
  const membros = db.usuarios.filter(u => e.membros.includes(u.id));
  const ts = db.tarefas.filter(t => e.membros.includes(t.responsavel));
  const c = ts.filter(t => t.coluna === 'Concluído').length, pct = ts.length ? Math.round(c / ts.length * 100) : 0;
  const procs = db.processos.filter(p => e.membros.includes(p.responsavel) || p.participantes.some(x => e.membros.includes(x)));
  const naoMembros = db.usuarios.filter(u => u.ativo && !e.membros.includes(u.id));
  return `
  <a href="#/equipes" class="small">← Equipes</a>
  <div class="page-head mt"><div><h1>${esc(e.nome)}</h1><p>${esc(deptoNome(e.depto))} · Gestor: ${esc(nomeUser(e.gestor))}</p></div>
    ${gerencia ? `<button class="btn" data-act="editEquipe" data-id="${e.id}" type="button">✎ Editar equipe</button>` : ''}</div>
  <div class="grid g-kpi">${kpi('Membros', membros.length, '☺')}${kpi('Tarefas', ts.length, '☑')}${kpi('Concluídas', c, '✔', 'ok')}${kpi('Produtividade', pct + '%', '↗', pct >= 70 ? 'ok' : 'warn')}${kpi('Processos', procs.length, '◧')}</div>
  <div class="grid g-2 mt">
    <div class="card"><div class="card-head"><h2>Membros</h2></div>
      <div class="list">${membros.map(u => {
        const tu = db.tarefas.filter(t => t.responsavel === u.id), cu = tu.filter(t => t.coluna === 'Concluído').length;
        return `<div class="item">${who(u.id)}<span class="grow"></span><span class="small muted">${cu}/${tu.length} tarefas</span><span class="badge plain">${PAPEIS[u.role]}</span>
          ${gerencia ? `<button class="icon-btn" title="Remover" data-act="removeMembro" data-eq="${e.id}" data-uid="${u.id}" type="button" style="color:var(--danger)">✕</button>` : ''}</div>`;
      }).join('') || '<p class="muted small">Sem membros.</p>'}</div>
      ${gerencia && naoMembros.length ? `<form data-form="membro" class="row mt"><input type="hidden" name="eq" value="${e.id}"><select class="input grow" name="uid">${uOpts(null, 'Adicionar colaborador...', u => !e.membros.includes(u.id))}</select><button class="btn btn-primary" type="submit">Adicionar</button></form>` : ''}
    </div>
    <div class="card"><div class="card-head"><h2>Produtividade por membro</h2></div>
      ${membros.map(u => { const tu = db.tarefas.filter(t => t.responsavel === u.id); const cu = tu.filter(t => t.coluna === 'Concluído').length; return hb(u.nome.split(' ')[0], tu.length ? cu / tu.length * 100 : 0, (tu.length ? Math.round(cu / tu.length * 100) : 0) + '%'); }).join('') || '<p class="muted small">Sem dados.</p>'}
    </div>
  </div>
  <div class="card mt"><div class="card-head"><h2>Processos da equipe</h2></div><div class="table-wrap"><table class="tbl"><thead><tr><th>Processo</th><th>Responsável</th><th>Status</th><th>Prazo</th></tr></thead><tbody>
  ${procs.map(p => `<tr class="clickable" data-act="go" data-h="#/processo/${p.id}"><td class="name-link">${esc(p.nome)}</td><td>${who(p.responsavel)}</td><td>${badgeSt(p.status)}</td><td>${prazoHtml(p.prazo, processoAtrasado(p))}</td></tr>`).join('') || `<tr><td colspan="4">${empty('Nenhum processo da equipe')}</td></tr>`}
  </tbody></table></div></div>`;
};

VIEWS.usuarios = () => {
  const lista = db.usuarios.filter(u => {
    const q = ui.uq.trim().toLowerCase();
    return (!q || (u.nome + ' ' + u.email).toLowerCase().includes(q)) && (!ui.uRole || u.role === ui.uRole) && (!ui.uDepto || u.depto === ui.uDepto)
      && (!ui.uSit || (ui.uSit === 'ativo' ? u.ativo : !u.ativo));
  });
  const ativos = db.usuarios.filter(u => u.ativo).length;
  return `
  <div class="page-head"><div><h1>Usuários</h1><p>${db.usuarios.length} usuário(s) · ${ativos} ativo(s)</p></div>
    <button class="btn btn-primary" data-act="newUsuario" type="button">+ Novo usuário</button></div>
  <div class="card"><div class="filters mb">
    <input id="uq" class="input search-inline" data-ui="uq" value="${esc(ui.uq)}" placeholder="Pesquisar por nome ou e-mail">
    <select class="input" data-ui="uRole"><option value="">Todas as funções</option>${opts(Object.entries(PAPEIS), ui.uRole)}</select>
    <select class="input" data-ui="uDepto"><option value="">Todos os departamentos</option>${opts(db.departamentos.map(d => [d.id, d.nome]), ui.uDepto)}</select>
    <select class="input" data-ui="uSit"><option value="">Todas as situações</option><option value="ativo" ${ui.uSit === 'ativo' ? 'selected' : ''}>Ativos</option><option value="inativo" ${ui.uSit === 'inativo' ? 'selected' : ''}>Inativos</option></select>
  </div><div class="table-wrap"><table class="tbl"><thead><tr><th>Usuário</th><th>Função</th><th class="hide-sm">Departamento</th><th>Situação</th><th class="hide-sm">Atividades</th><th></th></tr></thead><tbody>
  ${lista.map(u => `<tr><td><span class="who"><span class="avatar ${u.ativo ? '' : 'off'}">${esc(initials(u.nome))}</span><span><b>${esc(u.nome)}</b><div class="small muted">${esc(u.email)}</div></span></span></td>
    <td><span class="badge plain">${PAPEIS[u.role]}</span></td><td class="hide-sm">${esc(deptoNome(u.depto))}</td>
    <td><span class="badge ${u.ativo ? 'st-concluido' : 'st-cancelado'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
    <td class="hide-sm">${db.auditoria.filter(l => l.userId === u.id).length} ações</td>
    <td><div class="actions"><button class="icon-btn" title="Atividades" data-act="atividadesUser" data-id="${u.id}" type="button">⌛</button><button class="icon-btn" title="Editar" data-act="editUsuario" data-id="${u.id}" type="button">✎</button>
    <button class="icon-btn" title="${u.ativo ? 'Desativar' : 'Ativar'}" data-act="toggleUser" data-id="${u.id}" type="button">${u.ativo ? '⏸' : '▶'}</button></div></td></tr>`).join('') || `<tr><td colspan="6">${empty('Nenhum usuário encontrado')}</td></tr>`}
  </tbody></table></div></div>`;
};

function dadosRelatorio() {
  const { rTipo: t, rIni: ini, rFim: fim, rEq: eq, rDepto: dep, rStatus: st } = ui;
  const noPeriodo = dt => (!ini || (dt || '') >= ini) && (!fim || (dt || '') <= fim);
  const membros = eq ? (db.equipes.find(e => e.id === eq) || { membros: [] }).membros : null;
  const procs = db.processos.filter(p => noPeriodo(p.criadoEm) && (!dep || p.depto === dep) && (!st || p.status === st) && (!membros || membros.includes(p.responsavel)));
  const tars = db.tarefas.filter(x => noPeriodo(x.criadaEm) && (!membros || membros.includes(x.responsavel)));
  const apr = db.aprovacoes.filter(a => noPeriodo(a.criadaEm) && (!membros || membros.includes(a.aprovador)));
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '0%';
  switch (t) {
    case 'concluidos': return { titulo: 'Processos concluídos', cols: ['Código', 'Processo', 'Departamento', 'Responsável', 'Criado em', 'Prioridade'], rows: procs.filter(p => p.status === 'Concluído').map(p => [p.codigo, p.nome, deptoNome(p.depto), nomeUser(p.responsavel), fmtDataSimples(p.criadoEm), p.prioridade]) };
    case 'atrasados': return { titulo: 'Processos atrasados', cols: ['Código', 'Processo', 'Responsável', 'Prazo', 'Status'], rows: procs.filter(processoAtrasado).map(p => [p.codigo, p.nome, nomeUser(p.responsavel), fmtDataSimples(p.prazo), p.status]) };
    case 'colab': return { titulo: 'Tarefas por colaborador', cols: ['Colaborador', 'Total', 'Concluídas', 'Pendentes', 'Atrasadas', '% conclusão'], rows: db.usuarios.filter(u => !membros || membros.includes(u.id)).map(u => { const ts = tars.filter(x => x.responsavel === u.id); const c = ts.filter(x => x.coluna === 'Concluído').length; return [u.nome, ts.length, c, ts.length - c, ts.filter(tarefaAtrasada).length, pct(c, ts.length)]; }) };
    case 'equipe': return { titulo: 'Produtividade por equipe', cols: ['Equipe', 'Membros', 'Tarefas', 'Concluídas', 'Produtividade', 'Processos'], rows: db.equipes.filter(e => !eq || e.id === eq).map(e => { const ts = tars.filter(x => e.membros.includes(x.responsavel)); const c = ts.filter(x => x.coluna === 'Concluído').length; return [e.nome, e.membros.length, ts.length, c, pct(c, ts.length), procs.filter(p => e.membros.includes(p.responsavel)).length]; }) };
    case 'tempo': { const rows = db.usuarios.map(u => { const cs = db.tarefas.filter(x => x.responsavel === u.id && x.coluna === 'Concluído' && x.concluidaEm && (!ini || x.criadaEm >= ini) && (!fim || x.criadaEm <= fim)); const dias = cs.map(x => (new Date(x.concluidaEm) - new Date(x.criadaEm)) / 86400000); return [u.nome, cs.length, dias.length ? (dias.reduce((s, d) => s + d, 0) / dias.length).toFixed(1) : '—']; }).filter(r => r[1]); return { titulo: 'Tempo médio de conclusão de tarefas', cols: ['Colaborador', 'Tarefas concluídas', 'Tempo médio (dias)'], rows }; }
    case 'aprovacoes': return { titulo: 'Aprovações realizadas', cols: ['Título', 'Solicitante', 'Aprovador', 'Decisão', 'Data'], rows: apr.filter(a => a.status !== 'Pendente').map(a => [a.titulo, nomeUser(a.solicitante), nomeUser(a.aprovador), a.status, fmtDataSimples(a.decididaEm)]) };
    case 'depto': return { titulo: 'Processos por departamento', cols: ['Departamento', 'Total', 'Concluídos', 'Em andamento', 'Atrasados'], rows: db.departamentos.filter(d => !dep || d.id === dep).map(d => { const ps = procs.filter(p => p.depto === d.id); return [d.nome, ps.length, ps.filter(p => p.status === 'Concluído').length, ps.filter(p => p.status === 'Em andamento').length, ps.filter(processoAtrasado).length]; }) };
  }
  return { titulo: '', cols: [], rows: [] };
}

VIEWS.relatorios = () => {
  const tipos = [['concluidos', 'Processos concluídos'], ['atrasados', 'Processos atrasados'], ['colab', 'Tarefas por colaborador'], ['equipe', 'Produtividade por equipe'], ['tempo', 'Tempo médio de conclusão'], ['aprovacoes', 'Aprovações realizadas'], ['depto', 'Processos por departamento']];
  const r = dadosRelatorio();
  return `
  <div class="page-head no-print"><div><h1>Relatórios</h1><p>Indicadores calculados a partir dos dados do sistema.</p></div>
    <div class="row wrap"><button class="btn" data-act="csv" type="button">⬇ Exportar CSV</button><button class="btn btn-primary" onclick="window.print()" type="button">🖨 Imprimir / PDF</button></div></div>
  <div class="card mb no-print"><div class="filters">
    <select class="input" data-ui="rTipo">${opts(tipos, ui.rTipo)}</select>
    <input class="input" type="date" data-ui="rIni" value="${ui.rIni}" title="Data inicial">
    <input class="input" type="date" data-ui="rFim" value="${ui.rFim}" title="Data final">
    <select class="input" data-ui="rEq"><option value="">Todas as equipes</option>${opts(db.equipes.map(e => [e.id, e.nome]), ui.rEq)}</select>
    <select class="input" data-ui="rDepto"><option value="">Todos os departamentos</option>${opts(db.departamentos.map(d => [d.id, d.nome]), ui.rDepto)}</select>
    <select class="input" data-ui="rStatus"><option value="">Todos os status</option>${sOpts(STATUS, ui.rStatus)}</select>
  </div></div>
  <div class="card"><div class="card-head"><div><h2>${r.titulo}</h2><div class="sub">${r.rows.length} registro(s) · Gerado em ${dataBr(agora())}</div></div></div>
    <div class="table-wrap"><table class="tbl"><thead><tr>${r.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>
    ${r.rows.map(row => `<tr>${row.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${r.cols.length || 1}">${empty('Sem dados para os filtros selecionados')}</td></tr>`}
    </tbody></table></div></div>`;
};

VIEWS.notificacoes = () => {
  const lista = minhas().filter(n => ui.nF === 'todas' || !n.lida);
  const icones = { tarefa: '☑', prazo: '⏱', processo: '◧', conclusao: '✔', aprovacao: '✎', comentario: '💬', atraso: '!' };
  const naoLidas = minhas().filter(n => !n.lida).length;
  return `
  <div class="page-head"><div><h1>Notificações</h1><p>${naoLidas} não lida(s)</p></div>
    <div class="row"><div class="seg"><button type="button" class="${ui.nF === 'todas' ? 'on' : ''}" data-act="tab" data-scope="nF" data-v="todas">Todas</button><button type="button" class="${ui.nF === 'nao' ? 'on' : ''}" data-act="tab" data-scope="nF" data-v="nao">Não lidas</button></div>
    <button class="btn" data-act="readAll" type="button" ${naoLidas ? '' : 'disabled'}>Marcar todas como lidas</button></div></div>
  <div class="card"><div class="list">${lista.map(n => `<div class="item ${n.lida ? '' : 'unread'}">
    <span class="avatar" style="background:${n.tipo === 'atraso' ? 'var(--danger)' : n.tipo === 'conclusao' ? 'var(--success)' : ''}">${icones[n.tipo] || '•'}</span>
    <span class="grow"><span class="t" style="display:block;white-space:normal">${esc(n.texto)}</span><span class="small muted">${dataBr(n.data)}</span></span>
    ${n.lida ? '' : '<span class="dot"></span>'}
    <button class="btn btn-sm btn-ghost" data-act="toggleRead" data-id="${n.id}" data-lida="${n.lida ? '0' : '1'}" type="button">${n.lida ? 'Marcar não lida' : 'Marcar como lida'}</button></div>`).join('') || empty('Tudo em dia', 'Você não tem notificações nesta visualização.')}</div></div>`;
};

VIEWS.auditoria = () => {
  const q = ui.audQ.trim().toLowerCase();
  const lista = db.auditoria.filter(l => !q || (l.acao + ' ' + l.alteracao + ' ' + nomeUser(l.userId)).toLowerCase().includes(q));
  return `
  <div class="page-head"><div><h1>Auditoria</h1><p>Registro geral das principais ações do sistema.</p></div></div>
  <div class="card"><div class="filters mb"><input id="audQ" class="input search-inline" data-ui="audQ" value="${esc(ui.audQ)}" placeholder="Filtrar por usuário, ação ou alteração"></div>
  <div class="table-wrap"><table class="tbl"><thead><tr><th>Data e hora</th><th>Usuário</th><th>Ação</th><th class="hide-sm">Processo</th><th>Alteração</th></tr></thead><tbody>
  ${lista.slice(0, 200).map(l => { const p = db.processos.find(x => x.id === l.processoId); return `<tr><td class="small">${dataBr(l.data)}</td><td>${who(l.userId)}</td><td><b>${esc(l.acao)}</b></td><td class="hide-sm small">${p ? `<a href="#/processo/${p.id}">${esc(p.codigo)}</a>` : '—'}</td><td class="small muted">${esc(l.alteracao)}</td></tr>`; }).join('') || `<tr><td colspan="5">${empty('Nenhum registro')}</td></tr>`}
  </tbody></table></div></div>`;
};

VIEWS.perfil = () => {
  const u = currentUser();
  return `
  <div class="page-head"><div><h1>Meu perfil</h1><p>Gerencie suas informações pessoais e senha.</p></div></div>
  <div class="grid g-2">
    <div class="card"><div class="profile-head"><span class="avatar lg">${esc(initials(u.nome))}</span><div><h2>${esc(u.nome)}</h2><div class="muted">${esc(u.cargo || '—')}</div>
      <div class="row mt"><span class="badge plain">${PAPEIS[u.role]}</span><span class="badge plain">${esc(deptoNome(u.depto))}</span></div></div></div>
      <div class="mt small muted">E-mail: ${esc(u.email)}<br>Telefone: ${esc(u.telefone || '—')}</div>
      <div class="mt"><h3>Resumo</h3><div class="row wrap mt"><span class="badge plain">${db.tarefas.filter(t => t.responsavel === u.id).length} tarefas</span><span class="badge plain">${db.tarefas.filter(t => t.responsavel === u.id && t.coluna === 'Concluído').length} concluídas</span><span class="badge plain">${db.auditoria.filter(l => l.userId === u.id).length} ações</span></div></div></div>
    <div class="card"><div class="card-head"><h2>Informações pessoais</h2></div>
      <form data-form="perfil" class="grid" style="gap:14px">
        <div class="form-grid"><label class="field">Nome completo<input class="input" name="nome" required value="${esc(u.nome)}"></label>
        <label class="field">Cargo<input class="input" name="cargo" value="${esc(u.cargo)}"></label>
        <label class="field">E-mail<input class="input" type="email" name="email" required value="${esc(u.email)}"></label>
        <label class="field">Telefone<input class="input" name="telefone" value="${esc(u.telefone)}"></label>
        <label class="field full">Nova senha <small>(deixe em branco para manter)</small><input class="input" type="password" name="senha" minlength="6"></label></div>
        <div><button class="btn btn-primary" type="submit">Salvar alterações</button></div>
      </form></div>
  </div>`;
};

VIEWS.configuracoes = () => {
  const dark = document.documentElement.dataset.theme === 'dark';
  const adm = can('usuario:gerenciar');
  const perms = [['Gerenciar usuários', 'usuario:gerenciar'], ['Criar e excluir processos', 'processo:excluir'], ['Gerenciar processos e fluxos', 'processo:gerenciar'], ['Gerenciar tarefas', 'tarefa:gerenciar'], ['Atualizar andamento de tarefas', 'tarefa:atualizar'], ['Aprovar solicitações', 'aprovacao:decidir'], ['Gerenciar equipes', 'equipe:gerenciar'], ['Visualizar relatórios', 'relatorio:ver'], ['Visualizar auditoria', 'auditoria:ver']];
  return `
  <div class="page-head"><div><h1>Configurações</h1><p>Preferências, departamentos e permissões.</p></div></div>
  <div class="grid g-2">
    <div class="card"><div class="card-head"><h2>Preferências</h2></div>
      <div class="setting"><div><b>Modo escuro</b><div class="small muted">Aparência do sistema</div></div><label class="switch"><input type="checkbox" ${dark ? 'checked' : ''} data-act="toggleTheme"><span></span></label></div>
      <div class="setting"><div><b>Notificações por e-mail</b><div class="small muted">Receber resumos de atividades</div></div><label class="switch"><input type="checkbox" ${localStorage.getItem('workflow_mail') !== '0' ? 'checked' : ''} data-act="toggleMail"><span></span></label></div>
      ${adm ? `<div class="setting"><div><b>Restaurar dados de demonstração</b><div class="small muted">Apaga todas as alterações locais</div></div><button class="btn btn-danger" data-act="resetDados" type="button">Restaurar</button></div>` : ''}
    </div>
    <div class="card"><div class="card-head"><h2>Departamentos</h2></div>
      <div class="list">${db.departamentos.map(d => `<div class="item"><span class="grow">${esc(d.nome)}</span><span class="small muted">${db.usuarios.filter(u => u.depto === d.id).length} pessoas</span></div>`).join('')}</div>
      ${can('equipe:gerenciar') ? '<button class="btn mt" data-act="newDepto" type="button">+ Novo departamento</button>' : ''}</div>
  </div>
  <div class="card mt"><div class="card-head"><div><h2>Permissões por função</h2><div class="sub">Verificadas na interface e nas regras de negócio</div></div></div>
    <div class="table-wrap"><table class="tbl"><thead><tr><th>Permissão</th>${Object.values(PAPEIS).map(p => `<th>${p}</th>`).join('')}</tr></thead><tbody>
    ${perms.map(([l, k]) => `<tr><td>${l}</td>${Object.keys(PAPEIS).map(r => `<td>${PERMS[k].includes(r) ? '<span style="color:var(--success);font-weight:800">✔</span>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div></div>`;
};

/* ---------- Modais ---------- */
function refreshT(id) { renderView(); if (isModalOpen()) modalTarefa(id); }
function persistT(t) { Svc.salvarTarefa(JSON.parse(JSON.stringify(t))); }
function renumber(list) { list.sort((a, b) => a.ordem - b.ordem).forEach((e, i) => { e.ordem = i + 1; }); return list; }

function modalProcesso(id) {
  const p = id ? db.processos.find(x => x.id === id) : { nome: '', descricao: '', categoria: CATEGORIAS[0], depto: db.departamentos[0].id, responsavel: currentUserId, participantes: [], inicio: hoje(), prazo: addDias(14), prioridade: 'Média', status: 'Não iniciado' };
  openModal(id ? 'Editar processo' : 'Novo processo', `<form data-form="processo" class="grid" style="gap:14px">
    <input type="hidden" name="id" value="${id || ''}">
    <div class="form-grid">
      <label class="field full">Nome do processo<input class="input" name="nome" required value="${esc(p.nome)}"></label>
      <label class="field full">Descrição<textarea class="input" name="descricao">${esc(p.descricao)}</textarea></label>
      <label class="field">Categoria<select class="input" name="categoria">${sOpts(CATEGORIAS, p.categoria)}</select></label>
      <label class="field">Departamento<select class="input" name="depto">${opts(db.departamentos.map(d => [d.id, d.nome]), p.depto)}</select></label>
      <label class="field">Responsável<select class="input" name="responsavel" required>${uOpts(p.responsavel)}</select></label>
      <label class="field">Prioridade<select class="input" name="prioridade">${sOpts(PRIORIDADES, p.prioridade)}</select></label>
      <label class="field">Data de início<input class="input" type="date" name="inicio" value="${p.inicio}"></label>
      <label class="field">Prazo final<input class="input" type="date" name="prazo" required value="${p.prazo}"></label>
      <label class="field">Status<select class="input" name="status">${sOpts(STATUS, p.status)}</select></label>
      <div class="field">Participantes<div class="row wrap" style="gap:12px">${db.usuarios.filter(u => u.ativo).map(u => `<label class="check small"><input type="checkbox" name="participantes" value="${u.id}" ${p.participantes.includes(u.id) ? 'checked' : ''}> ${esc(u.nome.split(' ')[0])}</label>`).join('')}</div></div>
    </div>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="closeModal" type="button">Cancelar</button><button class="btn btn-primary" type="submit">Salvar processo</button></div>
  </form>`, '', true);
}

function modalEtapa(pid, eid) {
  const p = db.processos.find(x => x.id === pid);
  const e = eid ? p.etapas.find(x => x.id === eid) : { nome: '', tipo: 'Tarefa', descricao: '', responsavel: p.responsavel, prazo: p.prazo, dependeDe: '', aprovacao: false, condAprovada: '', condRejeitada: '' };
  openModal(eid ? 'Editar etapa' : 'Nova etapa', `<form data-form="etapa" class="grid" style="gap:14px">
    <input type="hidden" name="pid" value="${pid}"><input type="hidden" name="eid" value="${eid || ''}">
    <div class="form-grid">
      <label class="field">Nome<input class="input" name="nome" required value="${esc(e.nome)}"></label>
      <label class="field">Tipo<select class="input" name="tipo">${sOpts(ETAPA_TIPOS, e.tipo)}</select></label>
      <label class="field">Responsável<select class="input" name="responsavel">${uOpts(e.responsavel)}</select></label>
      <label class="field">Prazo<input class="input" type="date" name="prazo" value="${e.prazo}"></label>
      <label class="field">Dependências<select class="input" name="dependeDe">${opts(p.etapas.filter(x => x.id !== eid).map(x => [x.id, x.nome]), e.dependeDe, 'Nenhuma (início)')}</select></label>
      <label class="check" style="align-self:end"><input type="checkbox" name="aprovacao" ${e.aprovacao || e.tipo === 'Aprovação' ? 'checked' : ''}> Necessita aprovação</label>
      <label class="field">Condição se aprovada<input class="input" name="condAprovada" placeholder="Ex.: Seguir para execução" value="${esc(e.condAprovada)}"></label>
      <label class="field">Condição se rejeitada<input class="input" name="condRejeitada" placeholder="Ex.: Retornar para correção" value="${esc(e.condRejeitada)}"></label>
      <label class="field full">Descrição / condições de conclusão<textarea class="input" name="descricao">${esc(e.descricao)}</textarea></label>
    </div>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="closeModal" type="button">Cancelar</button><button class="btn btn-primary" type="submit">Salvar etapa</button></div>
  </form>`, '', true);
}

function modalTarefaForm(id, procPreset = '', colPreset = 'A fazer') {
  const t = id ? db.tarefas.find(x => x.id === id) : { titulo: '', descricao: '', processoId: procPreset, responsavel: currentUserId, prazo: addDias(7), prioridade: 'Média', coluna: colPreset, etiquetas: [] };
  openModal(id ? 'Editar tarefa' : 'Nova tarefa', `<form data-form="tarefa" class="grid" style="gap:14px">
    <input type="hidden" name="id" value="${id || ''}">
    <div class="form-grid">
      <label class="field full">Título<input class="input" name="titulo" required value="${esc(t.titulo)}"></label>
      <label class="field full">Descrição<textarea class="input" name="descricao">${esc(t.descricao)}</textarea></label>
      <label class="field">Processo relacionado<select class="input" name="processoId">${opts(db.processos.map(p => [p.id, p.nome]), t.processoId, 'Nenhum (tarefa avulsa)')}</select></label>
      <label class="field">Responsável<select class="input" name="responsavel" required>${uOpts(t.responsavel)}</select></label>
      <label class="field">Prazo<input class="input" type="date" name="prazo" required value="${t.prazo}"></label>
      <label class="field">Prioridade<select class="input" name="prioridade">${sOpts(PRIORIDADES, t.prioridade)}</select></label>
      <label class="field">Coluna<select class="input" name="coluna">${sOpts(COLUNAS, t.coluna)}</select></label>
      <label class="field">Etiquetas <small>(separadas por vírgula)</small><input class="input" name="etiquetas" value="${esc((t.etiquetas || []).join(', '))}"></label>
    </div>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="closeModal" type="button">Cancelar</button><button class="btn btn-primary" type="submit">Salvar tarefa</button></div>
  </form>`, '', true);
}

function modalTarefa(id) {
  const t = db.tarefas.find(x => x.id === id); if (!t) return;
  const canEdit = can('tarefa:gerenciar'), canMove = podeMover(t);
  const proc = db.processos.find(p => p.id === t.processoId);
  const subs = t.subtarefas.map(s => `<label class="sub-item ${s.feita ? 'done' : ''}"><input type="checkbox" class="chk" ${s.feita ? 'checked' : ''} ${canMove ? '' : 'disabled'} data-act="subToggle" data-id="${t.id}" data-sub="${s.id}"><span class="grow">${esc(s.titulo)}</span></label>`).join('') || '<p class="muted small">Sem subtarefas.</p>';
  const coms = t.comentarios.map(c => `<div class="comment"><div class="row between"><b>${esc(nomeUser(c.autor))}</b><small>${dataBr(c.data)}</small></div><p>${esc(c.texto)}</p></div>`).join('') || '<p class="muted small">Nenhum comentário.</p>';
  const anex = t.anexos.map(a => `<div class="file"><span class="ext">${esc(a.nome.split('.').pop().slice(0, 4).toUpperCase())}</span><div class="grow"><b>${esc(a.nome)}</b><div class="small muted">${esc(a.tamanho)} · ${esc(nomeUser(a.autor))} · ${fmtDataSimples(a.data)}</div></div></div>`).join('') || '<p class="muted small">Nenhum anexo.</p>';
  openModal(esc(t.titulo), `
    <div class="row wrap mb">${badgePr(t.prioridade)}<span class="badge plain">${t.coluna}</span>${tarefaAtrasada(t) ? '<span class="late small">● Atrasada</span>' : ''}</div>
    <div class="grid g-2 small mb"><div>Responsável: ${who(t.responsavel)}</div><div>Prazo: ${prazoHtml(t.prazo, tarefaAtrasada(t))}</div>
      <div>Processo: ${proc ? `<a href="#/processo/${proc.id}" onclick="closeModal()">${esc(proc.nome)}</a>` : '—'}</div><div>Etiquetas: ${(t.etiquetas || []).map(x => `<span class="tag">${esc(x)}</span>`).join('') || '—'}</div></div>
    <p class="mb">${esc(t.descricao) || '<span class="muted">Sem descrição.</span>'}</p>
    <div class="row wrap mb">
      ${canMove ? `<button class="btn btn-sm ${t.coluna === 'Concluído' ? '' : 'btn-ok'}" data-act="tToggle" data-id="${t.id}" data-done="${t.coluna === 'Concluído' ? '0' : '1'}" type="button">${t.coluna === 'Concluído' ? '↺ Reabrir' : '✔ Marcar como concluída'}</button>` : ''}
      ${canEdit ? `<button class="btn btn-sm" data-act="editTarefa" data-id="${t.id}" type="button">✎ Editar</button>` : ''}
      <button class="btn btn-sm" data-act="solicitar" data-preset="tarefa|${t.id}|" type="button">Enviar para aprovação</button></div>
    <div class="grid g-2" style="gap:18px">
      <div><h3 class="mb">Subtarefas</h3>${subs}
        <form data-form="sub" class="row mt"><input type="hidden" name="id" value="${t.id}"><input class="input grow" name="titulo" placeholder="Nova subtarefa" required><button class="btn btn-sm" type="submit">Adicionar</button></form></div>
      <div><h3 class="mb">Anexos</h3>${anex}
        <form data-form="anexo" class="mt"><input type="hidden" name="id" value="${t.id}"><label class="drop-zone"><input type="file" name="arquivo" class="hidden" onchange="this.form.requestSubmit()">📎 Clique para anexar um arquivo</label></form></div>
    </div>
    <h3 class="mt mb">Comentários</h3>${coms}
    <form data-form="comentario" class="grid mt" style="gap:8px"><input type="hidden" name="tipo" value="tarefa"><input type="hidden" name="id" value="${t.id}">
      <textarea class="input" name="texto" placeholder="Adicionar comentário..."></textarea><div><button class="btn btn-sm btn-primary" type="submit">Comentar</button></div></form>`, '', true);
}

function modalSolicitar(preset = '') {
  const procOpts = processosVisiveis().flatMap(p => [[`proc|${p.id}|`, `${p.codigo} — ${p.nome}`], ...p.etapas.filter(e => (e.tipo === 'Aprovação' || e.aprovacao) && !e.concluida).map(e => [`proc|${p.id}|${e.id}`, `      ↳ Etapa: ${e.nome}`])]);
  const tarOpts = tarefasVisiveis().map(t => [`tarefa|${t.id}|`, `Tarefa — ${t.titulo}`]);
  openModal('Solicitar aprovação', `<form data-form="solicitar" class="grid" style="gap:14px">
    <label class="field">Item a aprovar<select class="input" name="ref" required>${opts([...procOpts, ...tarOpts], preset, 'Selecione...')}</select></label>
    <label class="field">Aprovador<select class="input" name="aprovador" required>${uOpts(null, 'Selecione...', u => u.role !== 'colaborador' && u.id !== currentUserId)}</select></label>
    <label class="field">Título da solicitação <small>(opcional)</small><input class="input" name="titulo"></label>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="closeModal" type="button">Cancelar</button><button class="btn btn-primary" type="submit">Enviar solicitação</button></div>
  </form>`);
}

function modalDecisao(id, dec) {
  openModal(`Decisão: ${dec}`, `<p class="muted mb">Informe a justificativa. Ela ficará registrada no histórico auditável da aprovação.</p>
    <textarea id="just" class="input" placeholder="Justificativa obrigatória"></textarea>
    <div class="row mt" style="justify-content:flex-end"><button class="btn" data-act="closeModal" type="button">Cancelar</button>
    <button class="btn ${dec === 'Rejeitada' ? 'btn-danger' : 'btn-primary'}" data-act="confirmDec" data-id="${id}" data-dec="${dec}" type="button">Confirmar</button></div>`);
}

function modalUsuario(id) {
  const u = id ? db.usuarios.find(x => x.id === id) : { nome: '', email: '', cargo: '', telefone: '', role: 'colaborador', depto: db.departamentos[0].id };
  openModal(id ? 'Editar usuário' : 'Novo usuário', `<form data-form="usuario" class="grid" style="gap:14px"><input type="hidden" name="id" value="${id || ''}">
    <div class="form-grid">
      <label class="field full">Nome completo<input class="input" name="nome" required value="${esc(u.nome)}"></label>
      <label class="field">E-mail<input class="input" type="email" name="email" required value="${esc(u.email)}"></label>
      <label class="field">Cargo<input class="input" name="cargo" value="${esc(u.cargo)}"></label>
      <label class="field">Função (permissão)<select class="input" name="role">${opts(Object.entries(PAPEIS), u.role)}</select></label>
      <label class="field">Departamento<select class="input" name="depto">${opts(db.departamentos.map(d => [d.id, d.nome]), u.depto)}</select></label>
      <label class="field">Telefone<input class="input" name="telefone" value="${esc(u.telefone)}"></label>
      <label class="field full">Senha <small>(${id ? 'deixe em branco para manter' : 'padrão: mudar123'})</small><input class="input" type="password" name="senha" minlength="6"></label>
    </div>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="closeModal" type="button">Cancelar</button><button class="btn btn-primary" type="submit">Salvar usuário</button></div></form>`, '', true);
}

function modalEquipe(id) {
  const e = id ? db.equipes.find(x => x.id === id) : { nome: '', depto: db.departamentos[0].id, gestor: currentUserId };
  openModal(id ? 'Editar equipe' : 'Nova equipe', `<form data-form="equipe" class="grid" style="gap:14px"><input type="hidden" name="id" value="${id || ''}">
    <label class="field">Nome da equipe<input class="input" name="nome" required value="${esc(e.nome)}"></label>
    <label class="field">Departamento<select class="input" name="depto">${opts(db.departamentos.map(d => [d.id, d.nome]), e.depto)}</select></label>
    <label class="field">Gestor<select class="input" name="gestor" required>${uOpts(e.gestor, undefined, u => u.role !== 'colaborador')}</select></label>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="closeModal" type="button">Cancelar</button><button class="btn btn-primary" type="submit">Salvar equipe</button></div></form>`);
}

function modalAtividades(id) {
  const u = db.usuarios.find(x => x.id === id);
  const lista = db.auditoria.filter(l => l.userId === id).slice(0, 30);
  openModal(`Atividades — ${esc(u.nome)}`, `<div class="timeline">${lista.map(l => `<div class="ev"><b>${esc(l.acao)}</b><p class="small muted">${esc(l.alteracao)}</p><small>${dataBr(l.data)}</small></div>`).join('') || '<p class="muted small">Sem atividades registradas.</p>'}</div>`);
}

/* ---------- Ações (data-act) ---------- */
const ACT = {
  logout() { Svc.logout(); authMode = 'login'; render(); toast('Sessão encerrada.'); },
  toggleNav() { document.body.classList.toggle('nav-open'); },
  toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next; localStorage.setItem('workflow_theme', next); renderView();
  },
  toggleMail(d, el) { localStorage.setItem('workflow_mail', el.checked ? '1' : '0'); toast('Preferência salva.', 'ok'); },
  goNotif() { go('#/notificacoes'); },
  closeModal() { closeModal(); },
  go(d) { go(d.h); },
  tab(d) { ui[d.scope] = d.v; renderView(); },
  authMode(d) { authMode = d.m; rec.step = 1; renderAuth(); },
  demoFill(d) { const f = document.querySelector('[data-form="login"]'); f.email.value = d.email; f.senha.value = d.senha; },
  newProc() { modalProcesso(); },
  editProc(d) { modalProcesso(d.id); },
  dupProc(d) { const n = Svc.duplicarProcesso(d.id); toast('Processo duplicado com sucesso.', 'ok'); go('#/processo/' + n.id); },
  delProc(d) { if (!confirm('Excluir este processo? Esta ação não pode ser desfeita.')) return; Svc.excluirProcesso(d.id); toast('Processo excluído.', 'ok'); go('#/processos'); },
  newEtapa(d) { modalEtapa(d.pid); },
  editEtapa(d) { modalEtapa(d.pid, d.eid); },
  delEtapa(d) {
    if (!confirm('Excluir esta etapa?')) return;
    const p = db.processos.find(x => x.id === d.pid);
    const lista = p.etapas.filter(e => e.id !== d.eid).map(e => ({ ...e, dependeDe: e.dependeDe === d.eid ? '' : e.dependeDe }));
    Svc.salvarEtapas(d.pid, renumber(lista)); toast('Etapa removida.', 'ok'); render();
  },
  etapaMove(d) {
    const p = db.processos.find(x => x.id === d.pid);
    const lista = renumber(p.etapas.map(e => ({ ...e })));
    const i = lista.findIndex(e => e.id === d.eid), j = i + Number(d.dir);
    if (j < 0 || j >= lista.length) return;
    [lista[i].ordem, lista[j].ordem] = [lista[j].ordem, lista[i].ordem];
    Svc.salvarEtapas(d.pid, renumber(lista)); render();
  },
  etapaToggle(d, el) { try { Svc.avancarEtapa(d.pid, d.eid, el.checked); toast(el.checked ? 'Etapa concluída.' : 'Etapa reaberta.', 'ok'); } catch (err) { toast(err.message, 'err'); } render(); },
  decidirEtapa(d) {
    openModal('Decisão da aprovação', `<p class="muted mb">Aprovar avança o fluxo. Rejeitar retorna a etapa para correção e exige justificativa.</p>
      <textarea id="just" class="input" placeholder="Justificativa (obrigatória para rejeição)"></textarea>
      <div class="row mt" style="justify-content:flex-end"><button class="btn" data-act="closeModal" type="button">Cancelar</button>
      <button class="btn btn-danger" data-act="confirmEtapa" data-pid="${d.pid}" data-eid="${d.eid}" data-ok="0" type="button">✖ Rejeitar</button>
      <button class="btn btn-ok" data-act="confirmEtapa" data-pid="${d.pid}" data-eid="${d.eid}" data-ok="1" type="button">✔ Aprovar</button></div>`);
  },
  confirmEtapa(d) {
    const j = ($('#just') || { value: '' }).value, ok = d.ok === '1';
    if (!ok && !j.trim()) throw new Error('Informe uma justificativa para rejeitar.');
    const a = db.aprovacoes.find(x => x.refId === d.pid && x.etapaId === d.eid && x.status === 'Pendente');
    if (a) Svc.decidirAprovacao(a.id, ok ? 'Aprovada' : 'Rejeitada', j);
    else Svc.decidirEtapaAprovacao(d.pid, d.eid, ok, j);
    closeModal(); toast(ok ? 'Etapa aprovada e fluxo avançado.' : 'Etapa rejeitada e retornada para correção.', ok ? 'ok' : 'warn'); render();
  },
  newTarefa(d) { modalTarefaForm('', d.proc || '', d.col || 'A fazer'); },
  editTarefa(d) { modalTarefaForm(d.id); },
  delTarefa(d) { if (!confirm('Excluir esta tarefa?')) return; Svc.excluirTarefa(d.id); toast('Tarefa excluída.', 'ok'); render(); },
  tDetail(d) { modalTarefa(d.id); },
  tToggle(d, el) {
    const novo = el.type === 'checkbox' ? (el.checked ? 'Concluído' : 'Em andamento') : (d.done === '1' ? 'Concluído' : 'Em andamento');
    try { Svc.moverTarefa(d.id, novo); toast(novo === 'Concluído' ? 'Tarefa concluída!' : 'Tarefa reaberta.', 'ok'); } catch (err) { toast(err.message, 'err'); }
    refreshT(d.id);
  },
  subToggle(d, el) { const t = db.tarefas.find(x => x.id === d.id); const s = t.subtarefas.find(x => x.id === d.sub); s.feita = el.checked; persistT(t); refreshT(t.id); },
  decidir(d) {
    if (d.dec === 'Aprovada') { Svc.decidirAprovacao(d.id, 'Aprovada', ''); toast('Solicitação aprovada.', 'ok'); render(); }
    else modalDecisao(d.id, d.dec);
  },
  confirmDec(d) { const j = $('#just').value; if (!j.trim()) throw new Error('Informe uma justificativa.'); Svc.decidirAprovacao(d.id, d.dec, j); closeModal(); toast('Decisão registrada.', 'ok'); render(); },
  solicitar(d) { modalSolicitar(d.preset || ''); },
  newDepto() { openModal('Novo departamento', `<form data-form="depto" class="grid" style="gap:14px"><label class="field">Nome<input class="input" name="nome" required></label>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="closeModal" type="button">Cancelar</button><button class="btn btn-primary" type="submit">Criar</button></div></form>`); },
  newEquipe() { modalEquipe(); },
  editEquipe(d) { modalEquipe(d.id); },
  removeMembro(d) { if (!confirm('Remover este colaborador da equipe?')) return; Svc.membroEquipe(d.eq, d.uid, false); toast('Colaborador removido.', 'ok'); render(); },
  newUsuario() { modalUsuario(); },
  editUsuario(d) { modalUsuario(d.id); },
  toggleUser(d) { try { Svc.alternarAtivo(d.id); toast('Situação da conta atualizada.', 'ok'); } catch (err) { toast(err.message, 'err'); } render(); },
  atividadesUser(d) { modalAtividades(d.id); },
  readAll() { Svc.marcarTodasLidas(); render(); },
  toggleRead(d) { Svc.marcarLida(d.id, d.lida === '1'); render(); },
  resetDados() { if (!confirm('Restaurar os dados de demonstração? Todas as alterações serão perdidas.')) return; resetDB(); toast('Dados restaurados.', 'ok'); render(); },
  csv() {
    const r = dadosRelatorio();
    const linhas = [r.cols, ...r.rows].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + linhas], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `workflow-${slug(r.titulo)}-${hoje()}.csv`; a.click();
    toast('CSV exportado.', 'ok');
  }
};

/* ---------- Formulários (data-form) ---------- */
const FORMS = {
  login(d) { Svc.login(d.email, d.senha); checkAtrasos(); toast(`Bem-vindo, ${currentUser().nome.split(' ')[0]}!`, 'ok'); go('#/dashboard'); },
  rec1(d) {
    const u = db.usuarios.find(x => x.email.toLowerCase() === d.email.trim().toLowerCase());
    if (!u) throw new Error('Nenhuma conta encontrada com este e-mail.');
    rec.email = d.email.trim(); rec.code = String(Math.floor(100000 + Math.random() * 900000)); rec.step = 2;
    toast('Código de verificação enviado (simulação).', 'ok'); renderAuth();
  },
  rec2(d) {
    if (d.codigo !== rec.code) throw new Error('Código inválido.');
    if (d.senha.length < 6) throw new Error('A senha deve ter ao menos 6 caracteres.');
    Svc.recuperarSenha(rec.email, d.senha); authMode = 'login'; rec.step = 1;
    toast('Senha redefinida. Faça login.', 'ok'); renderAuth();
  },
  processo(d) {
    const p = { id: d.id || '', nome: d.nome, descricao: d.descricao, categoria: d.categoria, depto: d.depto, responsavel: d.responsavel, participantes: [].concat(d.participantes || []), inicio: d.inicio, prazo: d.prazo, prioridade: d.prioridade, status: d.status };
    if (d.id) { const ex = db.processos.find(x => x.id === d.id); Object.assign(p, { etapas: ex.etapas, documentos: ex.documentos, comentarios: ex.comentarios, historico: ex.historico, codigo: ex.codigo, criadoEm: ex.criadoEm }); }
    const s = Svc.salvarProcesso(p); closeModal(); toast('Processo salvo com sucesso.', 'ok'); go('#/processo/' + s.id);
  },
  etapa(d) {
    const p = db.processos.find(x => x.id === d.pid);
    const etapas = p.etapas.map(e => ({ ...e }));
    const existente = etapas.find(e => e.id === d.eid);
    const obj = { id: d.eid || uid('s'), nome: d.nome, tipo: d.tipo, descricao: d.descricao || '', responsavel: d.responsavel, prazo: d.prazo, dependeDe: d.dependeDe === d.eid ? '' : (d.dependeDe || ''), aprovacao: !!d.aprovacao || d.tipo === 'Aprovação', concluida: existente ? existente.concluida : false, condAprovada: d.condAprovada || '', condRejeitada: d.condRejeitada || '', ordem: Math.max(0, ...etapas.map(e => e.ordem)) + 1 };
    if (existente) { obj.ordem = existente.ordem; etapas[etapas.indexOf(existente)] = obj; } else etapas.push(obj);
    Svc.salvarEtapas(p.id, renumber(etapas)); closeModal(); toast('Etapa salva.', 'ok'); render();
  },
  tarefa(d) {
    const t = { id: d.id || '', titulo: d.titulo, descricao: d.descricao || '', processoId: d.processoId || '', responsavel: d.responsavel, prazo: d.prazo, prioridade: d.prioridade, coluna: d.coluna, etiquetas: (d.etiquetas || '').split(',').map(s => s.trim()).filter(Boolean) };
    if (d.id) { const ex = db.tarefas.find(x => x.id === d.id); Object.assign(t, { comentarios: ex.comentarios, subtarefas: ex.subtarefas, anexos: ex.anexos, criadaEm: ex.criadaEm, concluidaEm: ex.concluidaEm }); }
    else t.concluidaEm = '';
    if (t.coluna === 'Concluído' && !t.concluidaEm) t.concluidaEm = hoje();
    Svc.salvarTarefa(t); closeModal(); toast('Tarefa salva.', 'ok'); render();
  },
  sub(d) { const t = db.tarefas.find(x => x.id === d.id); t.subtarefas.push({ id: uid('st'), titulo: d.titulo, feita: false }); persistT(t); refreshT(t.id); },
  anexo(d) {
    const f = d.arquivo; if (!f || !f.name) throw new Error('Selecione um arquivo.');
    const t = db.tarefas.find(x => x.id === d.id);
    t.anexos.push({ nome: f.name, tamanho: Math.max(1, Math.round(f.size / 1024)) + ' KB', autor: currentUserId, data: hoje() });
    persistT(t); Svc.audit('Anexo adicionado', t.processoId, f.name); toast('Arquivo anexado.', 'ok'); refreshT(t.id);
  },
  docProc(d) {
    const f = d.arquivo; if (!f || !f.name) throw new Error('Selecione um arquivo.');
    const p = db.processos.find(x => x.id === d.pid);
    p.documentos.push({ nome: f.name, tamanho: Math.max(1, Math.round(f.size / 1024)) + ' KB', autor: currentUserId, data: hoje() });
    Svc.audit('Documento anexado', p.id, f.name); saveDB(); toast('Documento anexado.', 'ok'); render();
  },
  comentario(d) {
    Svc.comentar(d.tipo, d.id, d.texto);
    toast('Comentário publicado.', 'ok');
    if (d.tipo === 'tarefa') refreshT(d.id); else render();
  },
  solicitar(d) {
    const [tipo, refId, etapaId] = d.ref.split('|');
    const nome = tipo === 'processo' ? db.processos.find(p => p.id === refId).nome : db.tarefas.find(t => t.id === refId).titulo;
    if (tipo === 'processo') { const p = db.processos.find(x => x.id === refId); if (!['Concluído', 'Cancelado'].includes(p.status)) p.status = 'Aguardando aprovação'; saveDB(); }
    Svc.solicitarAprovacao(tipo, refId, etapaId, d.titulo || `Aprovação — ${nome}`, d.aprovador);
    closeModal(); toast('Solicitação enviada ao aprovador.', 'ok'); render();
  },
  usuario(d) {
    Svc.salvarUsuario({ id: d.id || '', nome: d.nome, email: d.email, senha: d.senha || '', cargo: d.cargo, telefone: d.telefone, role: d.role, depto: d.depto });
    closeModal(); toast('Usuário salvo.', 'ok'); render();
  },
  equipe(d) { Svc.salvarEquipe({ id: d.id || '', nome: d.nome, depto: d.depto, gestor: d.gestor }); closeModal(); toast('Equipe salva.', 'ok'); render(); },
  depto(d) { Svc.salvarDepto(d.nome); closeModal(); toast('Departamento criado.', 'ok'); render(); },
  membro(d) { Svc.membroEquipe(d.eq, d.uid, true); toast('Colaborador adicionado.', 'ok'); render(); },
  perfil(d) { Svc.atualizarPerfil({ nome: d.nome, email: d.email, cargo: d.cargo, telefone: d.telefone, senha: d.senha || '' }); toast('Perfil atualizado com sucesso.', 'ok'); render(); }
};

/* ---------- Eventos globais ---------- */
document.addEventListener('click', e => {
  if (e.target.matches && e.target.matches('[data-bg]')) return closeModal();
  if (!e.target.closest('.menu-wrap')) document.querySelectorAll('.menu').forEach(m => m.classList.add('hidden'));
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'A') e.preventDefault();
  try { fn(el.dataset, el); } catch (err) { toast(err.message, 'err'); }
});
document.addEventListener('submit', e => {
  const f = e.target;
  if (!f.dataset || !f.dataset.form) return;
  e.preventDefault();
  try { FORMS[f.dataset.form](formData(f)); } catch (err) { toast(err.message, 'err'); }
});
const onUi = e => {
  const el = e.target;
  if (!el.dataset || !el.dataset.ui) return;
  if (e.type === 'change' && el.type === 'text') return;
  ui[el.dataset.ui] = el.type === 'checkbox' ? el.checked : el.value;
  const id = el.id, pos = el.selectionStart;
  renderView();
  if (id) { const n = document.getElementById(id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) { } } }
};
document.addEventListener('input', onUi);
document.addEventListener('change', onUi);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && e.target.id === 'gsearch') { ui.pq = e.target.value; go('#/processos'); }
});
function bindKanban() {
  document.querySelectorAll('.k-card[draggable="true"]').forEach(c => {
    c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', c.dataset.id); e.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging'); });
    c.addEventListener('dragend', () => c.classList.remove('dragging'));
  });
  document.querySelectorAll('.k-col').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', e => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
    col.addEventListener('drop', e => {
      e.preventDefault(); col.classList.remove('over');
      const id = e.dataTransfer.getData('text/plain');
      try { Svc.moverTarefa(id, col.dataset.col); toast(`Cartão movido para "${col.dataset.col}".`, 'ok'); }
      catch (err) { toast(err.message, 'err'); }
      renderView();
    });
  });
}

/* ---------- Inicialização ---------- */
(function init() {
  loadDB();
  document.documentElement.dataset.theme = localStorage.getItem('workflow_theme') || 'light';
  if (currentUser()) checkAtrasos();
  window.addEventListener('hashchange', render);
  render();
})();
