/* ===== WORKFLOW — Camada de dados, persistência (localStorage) e regras de negócio ===== */
const DB_KEY = 'workflow_db_v1';
const SESSION_KEY = 'workflow_session_v1';
const STATUS = ['Não iniciado', 'Em andamento', 'Aguardando aprovação', 'Em revisão', 'Bloqueado', 'Concluído', 'Cancelado'];
const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Urgente'];
const COLUNAS = ['A fazer', 'Em andamento', 'Em revisão', 'Bloqueado', 'Concluído'];
const ETAPA_TIPOS = ['Início', 'Tarefa', 'Revisão', 'Aprovação', 'Decisão', 'Conclusão'];
const CATEGORIAS = ['Recursos Humanos', 'Financeiro', 'Compras', 'Projetos', 'Jurídico', 'Operações'];
const PAPEIS = { admin: 'Administrador', gestor: 'Gestor', colaborador: 'Colaborador' };
const PERMS = {
  'processo:gerenciar': ['admin', 'gestor'],
  'processo:excluir': ['admin'],
  'tarefa:gerenciar': ['admin', 'gestor'],
  'tarefa:atualizar': ['admin', 'gestor', 'colaborador'],
  'aprovacao:decidir': ['admin', 'gestor'],
  'equipe:gerenciar': ['admin', 'gestor'],
  'usuario:gerenciar': ['admin'],
  'relatorio:ver': ['admin', 'gestor'],
  'auditoria:ver': ['admin']
};

const hoje = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const addDias = n => { const d = new Date(); d.setDate(d.getDate() + n); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const agora = () => new Date().toISOString();

function seed() {
  const d = addDias;
  return {
    usuarios: [
      { id: 'u1', nome: 'Ana Administradora', email: 'admin@workflow.com', senha: 'admin123', role: 'admin', depto: 'd1', ativo: true, cargo: 'Diretora de Operações', telefone: '(11) 90000-0001' },
      { id: 'u2', nome: 'Bruno Gestor', email: 'gestor@workflow.com', senha: 'gestor123', role: 'gestor', depto: 'd2', ativo: true, cargo: 'Gerente de Projetos', telefone: '(11) 90000-0002' },
      { id: 'u3', nome: 'Carla Colaboradora', email: 'colab@workflow.com', senha: 'colab123', role: 'colaborador', depto: 'd2', ativo: true, cargo: 'Analista', telefone: '' },
      { id: 'u4', nome: 'Diego Analista', email: 'diego@workflow.com', senha: 'colab123', role: 'colaborador', depto: 'd3', ativo: true, cargo: 'Analista Financeiro', telefone: '' },
      { id: 'u5', nome: 'Elisa Assistente', email: 'elisa@workflow.com', senha: 'colab123', role: 'colaborador', depto: 'd3', ativo: false, cargo: 'Assistente', telefone: '' }
    ],
    departamentos: [{ id: 'd1', nome: 'Diretoria' }, { id: 'd2', nome: 'Projetos' }, { id: 'd3', nome: 'Financeiro' }],
    equipes: [
      { id: 'e1', nome: 'Equipe Operações', depto: 'd2', gestor: 'u2', membros: ['u2', 'u3'] },
      { id: 'e2', nome: 'Equipe Financeira', depto: 'd3', gestor: 'u2', membros: ['u4', 'u5'] }
    ],
    processos: [
      {
        id: 'p1', codigo: 'PRC-001', nome: 'Onboarding de novos colaboradores', categoria: 'Recursos Humanos', depto: 'd2',
        descricao: 'Fluxo completo de integração de novos colaboradores, da solicitação ao primeiro dia.',
        responsavel: 'u2', participantes: ['u3'], criadoEm: d(-30), inicio: d(-28), prazo: d(5), prioridade: 'Alta', status: 'Em andamento',
        etapas: [
          { id: 's1', nome: 'Solicitação criada', tipo: 'Início', descricao: 'Registro do pedido', responsavel: 'u3', prazo: d(-25), ordem: 1, dependeDe: '', aprovacao: false, concluida: true, condAprovada: '', condRejeitada: '' },
          { id: 's2', nome: 'Análise', tipo: 'Revisão', descricao: 'Validar documentação', responsavel: 'u3', prazo: d(-10), ordem: 2, dependeDe: 's1', aprovacao: false, concluida: true, condAprovada: '', condRejeitada: '' },
          { id: 's3', nome: 'Aprovação do gestor', tipo: 'Aprovação', descricao: 'Gestor aprova ou rejeita a análise', responsavel: 'u2', prazo: d(0), ordem: 3, dependeDe: 's2', aprovacao: true, concluida: false, condAprovada: 'Seguir para execução', condRejeitada: 'Retornar para correção' },
          { id: 's4', nome: 'Execução', tipo: 'Tarefa', descricao: 'Executar integração', responsavel: 'u3', prazo: d(3), ordem: 4, dependeDe: 's3', aprovacao: false, concluida: false, condAprovada: '', condRejeitada: '' },
          { id: 's5', nome: 'Conclusão', tipo: 'Conclusão', descricao: 'Encerramento do processo', responsavel: 'u2', prazo: d(5), ordem: 5, dependeDe: 's4', aprovacao: false, concluida: false, condAprovada: '', condRejeitada: '' }
        ],
        documentos: [{ nome: 'checklist-onboarding.pdf', tamanho: '184 KB', autor: 'u3', data: d(-20) }],
        comentarios: [{ autor: 'u2', texto: 'Priorize a validação dos documentos.', data: d(-15) }],
        historico: [{ data: d(-30), autor: 'u2', acao: 'Processo criado' }]
      },
      {
        id: 'p2', codigo: 'PRC-002', nome: 'Fechamento financeiro mensal', categoria: 'Financeiro', depto: 'd3',
        descricao: 'Consolidação de despesas, conciliação bancária e emissão de relatório.',
        responsavel: 'u2', participantes: ['u4', 'u5'], criadoEm: d(-12), inicio: d(-10), prazo: d(-2), prioridade: 'Urgente', status: 'Bloqueado',
        etapas: [
          { id: 's6', nome: 'Coleta de notas', tipo: 'Início', descricao: '', responsavel: 'u4', prazo: d(-8), ordem: 1, dependeDe: '', aprovacao: false, concluida: true, condAprovada: '', condRejeitada: '' },
          { id: 's7', nome: 'Conciliação', tipo: 'Tarefa', descricao: 'Conciliar extratos', responsavel: 'u4', prazo: d(-3), ordem: 2, dependeDe: 's6', aprovacao: false, concluida: false, condAprovada: '', condRejeitada: '' },
          { id: 's8', nome: 'Aprovação da diretoria', tipo: 'Aprovação', descricao: '', responsavel: 'u1', prazo: d(1), ordem: 3, dependeDe: 's7', aprovacao: true, concluida: false, condAprovada: 'Concluir', condRejeitada: 'Retornar para conciliação' },
          { id: 's9', nome: 'Conclusão', tipo: 'Conclusão', descricao: '', responsavel: 'u2', prazo: d(2), ordem: 4, dependeDe: 's8', aprovacao: false, concluida: false, condAprovada: '', condRejeitada: '' }
        ],
        documentos: [], comentarios: [], historico: [{ data: d(-12), autor: 'u2', acao: 'Processo criado' }]
      },
      {
        id: 'p3', codigo: 'PRC-003', nome: 'Compra de equipamentos de TI', categoria: 'Compras', depto: 'd2',
        descricao: 'Aquisição de notebooks e periféricos para a equipe de projetos.',
        responsavel: 'u2', participantes: ['u3'], criadoEm: d(-5), inicio: d(-4), prazo: d(20), prioridade: 'Média', status: 'Aguardando aprovação',
        etapas: [
          { id: 's10', nome: 'Cotação', tipo: 'Início', descricao: '', responsavel: 'u3', prazo: d(-2), ordem: 1, dependeDe: '', aprovacao: false, concluida: true, condAprovada: '', condRejeitada: '' },
          { id: 's11', nome: 'Aprovação do orçamento', tipo: 'Aprovação', descricao: '', responsavel: 'u2', prazo: d(3), ordem: 2, dependeDe: 's10', aprovacao: true, concluida: false, condAprovada: 'Seguir para compra', condRejeitada: 'Refazer cotação' },
          { id: 's12', nome: 'Compra e entrega', tipo: 'Tarefa', descricao: '', responsavel: 'u3', prazo: d(15), ordem: 3, dependeDe: 's11', aprovacao: false, concluida: false, condAprovada: '', condRejeitada: '' }
        ],
        documentos: [], comentarios: [], historico: [{ data: d(-5), autor: 'u2', acao: 'Processo criado' }]
      }
    ],
    tarefas: [
      { id: 't1', titulo: 'Validar documentos admissionais', descricao: 'Conferir RG, CPF e comprovante.', processoId: 'p1', responsavel: 'u3', prazo: d(-1), prioridade: 'Alta', coluna: 'Em andamento', etiquetas: ['documentação'], comentarios: [{ autor: 'u2', texto: 'Use o checklist anexo.', data: d(-3) }], subtarefas: [{ id: 'st1', titulo: 'Conferir RG', feita: true }, { id: 'st2', titulo: 'Conferir comprovante', feita: false }], anexos: [], criadaEm: d(-8), concluidaEm: '' },
      { id: 't2', titulo: 'Conciliar extratos de março', descricao: '', processoId: 'p2', responsavel: 'u4', prazo: d(-3), prioridade: 'Urgente', coluna: 'Bloqueado', etiquetas: ['financeiro'], comentarios: [{ autor: 'u4', texto: 'Aguardando extrato do banco X.', data: d(-2) }], subtarefas: [], anexos: [], criadaEm: d(-9), concluidaEm: '' },
      { id: 't3', titulo: 'Montar cronograma de integração', descricao: '', processoId: 'p1', responsavel: 'u2', prazo: d(4), prioridade: 'Média', coluna: 'A fazer', etiquetas: ['planejamento'], comentarios: [], subtarefas: [], anexos: [], criadaEm: d(-6), concluidaEm: '' },
      { id: 't4', titulo: 'Cotar notebooks', descricao: '', processoId: 'p3', responsavel: 'u3', prazo: d(-2), prioridade: 'Média', coluna: 'Concluído', etiquetas: ['compras'], comentarios: [], subtarefas: [], anexos: [], criadaEm: d(-5), concluidaEm: d(-2) },
      { id: 't5', titulo: 'Revisar política de reembolso', descricao: '', processoId: '', responsavel: 'u4', prazo: d(7), prioridade: 'Baixa', coluna: 'Em revisão', etiquetas: ['política'], comentarios: [], subtarefas: [], anexos: [], criadaEm: d(-2), concluidaEm: '' },
      { id: 't6', titulo: 'Atualizar painel de indicadores', descricao: '', processoId: 'p1', responsavel: 'u3', prazo: d(10), prioridade: 'Baixa', coluna: 'A fazer', etiquetas: [], comentarios: [], subtarefas: [], anexos: [], criadaEm: d(-1), concluidaEm: '' }
    ],
    aprovacoes: [
      { id: 'a1', tipo: 'processo', refId: 'p3', etapaId: 's11', titulo: 'Aprovação do orçamento — Compra de equipamentos de TI', solicitante: 'u3', aprovador: 'u2', status: 'Pendente', criadaEm: d(-1), decididaEm: '', historico: [{ data: agora(), autor: 'u3', acao: 'Solicitação criada', justificativa: '' }] },
      { id: 'a2', tipo: 'processo', refId: 'p2', etapaId: 's8', titulo: 'Aprovação da diretoria — Fechamento financeiro', solicitante: 'u4', aprovador: 'u1', status: 'Pendente', criadaEm: d(-1), decididaEm: '', historico: [{ data: agora(), autor: 'u4', acao: 'Solicitação criada', justificativa: '' }] },
      { id: 'a3', tipo: 'tarefa', refId: 't4', etapaId: '', titulo: 'Cotação de notebooks', solicitante: 'u3', aprovador: 'u2', status: 'Aprovada', criadaEm: d(-4), decididaEm: d(-3), historico: [{ data: agora(), autor: 'u3', acao: 'Solicitação criada', justificativa: '' }, { data: agora(), autor: 'u2', acao: 'Aprovada', justificativa: 'Valores dentro do orçamento.' }] }
    ],
    notificacoes: [
      { id: 'n1', userId: 'u3', texto: 'Nova tarefa atribuída: Validar documentos admissionais', tipo: 'tarefa', lida: false, data: agora() },
      { id: 'n2', userId: 'u3', texto: 'Tarefa atrasada: Validar documentos admissionais', tipo: 'atraso', lida: false, data: agora() },
      { id: 'n3', userId: 'u2', texto: 'Aprovação solicitada: Compra de equipamentos de TI', tipo: 'aprovacao', lida: false, data: agora() },
      { id: 'n4', userId: 'u1', texto: 'Aprovação solicitada: Fechamento financeiro', tipo: 'aprovacao', lida: true, data: agora() }
    ],
    auditoria: [
      { id: 'l1', userId: 'u2', acao: 'Processo criado', processoId: 'p3', alteracao: 'PRC-003 — Compra de equipamentos de TI', data: agora() },
      { id: 'l2', userId: 'u4', acao: 'Tarefa atualizada', processoId: 'p2', alteracao: 'Status: Em andamento → Bloqueado', data: agora() },
      { id: 'l3', userId: 'u2', acao: 'Aprovação realizada', processoId: 'p3', alteracao: 'Aprovada — Cotação de notebooks', data: agora() }
    ]
  };
}

/* ---------- Persistência ---------- */
let db = null;
function loadDB() {
  try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { db = null; }
  if (!db || !db.usuarios) { db = seed(); saveDB(); }
  return db;
}
function saveDB() { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function resetDB() { db = seed(); saveDB(); }

/* ---------- Sessão e permissões ---------- */
let currentUserId = localStorage.getItem(SESSION_KEY);
const currentUser = () => (db.usuarios.find(u => u.id === currentUserId && u.ativo) || null);
function can(perm) { const u = currentUser(); return !!u && (PERMS[perm] || []).includes(u.role); }
function assert(perm) { if (!can(perm)) throw new Error('Você não tem permissão para esta ação.'); }

/* ---------- Serviços (regras de negócio com verificação de permissão) ---------- */
const Svc = {
  login(email, senha) {
    const u = db.usuarios.find(x => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.senha !== senha) throw new Error('E-mail ou senha inválidos.');
    if (!u.ativo) throw new Error('Conta desativada. Procure um administrador.');
    currentUserId = u.id; localStorage.setItem(SESSION_KEY, u.id);
    Svc.audit('Login realizado', '', 'Acesso ao sistema');
    return u;
  },
  logout() { localStorage.removeItem(SESSION_KEY); currentUserId = null; },
  recuperarSenha(email, novaSenha) {
    const u = db.usuarios.find(x => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) throw new Error('Nenhuma conta encontrada com este e-mail.');
    u.senha = novaSenha; saveDB(); return u;
  },
  audit(acao, processoId, alteracao) {
    db.auditoria.unshift({ id: uid('l'), userId: currentUserId, acao, processoId: processoId || '', alteracao: alteracao || '', data: agora() });
    if (db.auditoria.length > 500) db.auditoria.length = 500;
    saveDB();
  },
  notify(userIds, texto, tipo) {
    [...new Set(userIds)].filter(id => id && id !== currentUserId).forEach(id => {
      db.notificacoes.unshift({ id: uid('n'), userId: id, texto, tipo, lida: false, data: agora() });
    });
    saveDB();
  },

  /* Processos */
  salvarProcesso(p) {
    assert('processo:gerenciar');
    if (!p.nome.trim()) throw new Error('Informe o nome do processo.');
    const existente = db.processos.find(x => x.id === p.id);
    if (existente) {
      const mudancas = [];
      if (existente.prazo !== p.prazo) mudancas.push(`Prazo: ${existente.prazo} → ${p.prazo}`);
      if (existente.status !== p.status) mudancas.push(`Status: ${existente.status} → ${p.status}`);
      Object.assign(existente, p);
      existente.historico.unshift({ data: agora(), autor: currentUserId, acao: 'Processo atualizado' + (mudancas.length ? ' — ' + mudancas.join('; ') : '') });
      Svc.audit('Processo atualizado', p.id, mudancas.join('; ') || p.nome);
      if (mudancas.length) Svc.notify([existente.responsavel, ...existente.participantes], `Processo atualizado: ${existente.nome}`, 'processo');
      if (existente.prazo !== p.prazo) Svc.notify([existente.responsavel, ...existente.participantes], `Alteração de prazo: ${existente.nome}`, 'prazo');
    } else {
      p.id = uid('p');
      p.codigo = 'PRC-' + String(db.processos.length + 1).padStart(3, '0');
      p.criadoEm = hoje(); p.etapas = p.etapas || []; p.documentos = []; p.comentarios = [];
      p.historico = [{ data: agora(), autor: currentUserId, acao: 'Processo criado' }];
      db.processos.unshift(p);
      Svc.audit('Processo criado', p.id, `${p.codigo} — ${p.nome}`);
    }
    saveDB(); return p;
  },
  excluirProcesso(id) {
    assert('processo:excluir');
    const p = db.processos.find(x => x.id === id); if (!p) return;
    db.processos = db.processos.filter(x => x.id !== id);
    db.tarefas = db.tarefas.map(t => (t.processoId === id ? { ...t, processoId: '' } : t));
    Svc.audit('Processo excluído', '', `${p.codigo} — ${p.nome}`); saveDB();
  },
  duplicarProcesso(id) {
    assert('processo:gerenciar');
    const p = db.processos.find(x => x.id === id); if (!p) return null;
    const copia = JSON.parse(JSON.stringify(p));
    copia.nome = p.nome + ' (cópia)'; copia.status = 'Não iniciado'; copia.id = '';
    copia.etapas.forEach(e => e.concluida = false);
    copia.comentarios = []; copia.historico = [];
    const novo = Svc.salvarProcesso(copia);
    Svc.audit('Processo duplicado', novo.id, `Origem: ${p.codigo}`);
    return novo;
  },
  salvarEtapas(processoId, etapas) {
    assert('processo:gerenciar');
    const p = db.processos.find(x => x.id === processoId);
    p.etapas = etapas;
    p.historico.unshift({ data: agora(), autor: currentUserId, acao: 'Fluxo de trabalho atualizado' });
    Svc.audit('Fluxo atualizado', processoId, `${etapas.length} etapa(s)`);
    saveDB();
  },
  /* Decisão de aprovação aplicada ao fluxo: aprovada avança, rejeitada retorna */
  avancarEtapa(processoId, etapaId, concluir) {
    const p = db.processos.find(x => x.id === processoId);
    const etapas = [...p.etapas].sort((a, b) => a.ordem - b.ordem);
    const idx = etapas.findIndex(e => e.id === etapaId);
    const e = etapas[idx];
    if (!can('processo:gerenciar') && e.responsavel !== currentUserId) throw new Error('Apenas o responsável ou um gestor pode concluir esta etapa.');
    if (e.dependeDe) { const dep = etapas.find(x => x.id === e.dependeDe); if (dep && !dep.concluida) throw new Error('A etapa anterior ainda não foi concluída.'); }
    e.concluida = concluir;
    p.historico.unshift({ data: agora(), autor: currentUserId, acao: `Etapa "${e.nome}" ${concluir ? 'concluída' : 'reaberta'}` });
    if (etapas.every(x => x.concluida)) { p.status = 'Concluído'; Svc.notify([p.responsavel, ...p.participantes], `Processo concluído: ${p.nome}`, 'conclusao'); }
    else if (p.status === 'Concluído') p.status = 'Em andamento';
    Svc.audit('Etapa atualizada', processoId, `${e.nome}: ${concluir ? 'concluída' : 'reaberta'}`);
    saveDB();
  },
  decidirEtapaAprovacao(processoId, etapaId, aprovar, justificativa) {
    assert('aprovacao:decidir');
    const p = db.processos.find(x => x.id === processoId);
    const etapas = [...p.etapas].sort((a, b) => a.ordem - b.ordem);
    const idx = etapas.findIndex(e => e.id === etapaId);
    if (aprovar) { etapas[idx].concluida = true; }
    else {
      etapas[idx].concluida = false;
      // Regra condicional: rejeitada → retorna para a etapa anterior (correção)
      if (idx > 0) etapas[idx - 1].concluida = false;
      p.status = 'Em revisão';
    }
    p.historico.unshift({ data: agora(), autor: currentUserId, acao: `Aprovação ${aprovar ? 'aprovada' : 'rejeitada'}: ${etapas[idx].nome}`, justificativa });
    Svc.audit(aprovar ? 'Aprovação realizada' : 'Aprovação rejeitada', processoId, `${etapas[idx].nome}${justificativa ? ' — ' + justificativa : ''}`);
    saveDB();
  },

  /* Tarefas */
  salvarTarefa(t) {
    const u = currentUser();
    const existente = db.tarefas.find(x => x.id === t.id);
    if (!existente) {
      assert('tarefa:gerenciar');
      if (!t.titulo.trim()) throw new Error('Informe o título da tarefa.');
      t.id = uid('t'); t.comentarios = []; t.subtarefas = []; t.anexos = []; t.criadaEm = hoje(); t.concluidaEm = '';
      db.tarefas.unshift(t);
      Svc.notify([t.responsavel], `Nova tarefa atribuída: ${t.titulo}`, 'tarefa');
      Svc.audit('Tarefa criada', t.processoId, t.titulo);
    } else {
      const colab = u.role === 'colaborador';
      if (colab && existente.responsavel !== u.id) throw new Error('Colaboradores só podem editar tarefas atribuídas a eles.');
      if (!colab) assert('tarefa:gerenciar');
      if (colab) { Object.assign(existente, { coluna: t.coluna, subtarefas: t.subtarefas, anexos: t.anexos, comentarios: t.comentarios, concluidaEm: t.concluidaEm }); }
      else {
        if (existente.prazo !== t.prazo) Svc.notify([t.responsavel], `Alteração de prazo: ${t.titulo} (${fmtDataSimples(t.prazo)})`, 'prazo');
        if (existente.responsavel !== t.responsavel) Svc.notify([t.responsavel], `Nova tarefa atribuída: ${t.titulo}`, 'tarefa');
        Object.assign(existente, t);
        Svc.audit('Tarefa atualizada', t.processoId, t.titulo);
      }
      return saveDB();
    }
    saveDB(); return t;
  },
  excluirTarefa(id) {
    assert('tarefa:gerenciar');
    const t = db.tarefas.find(x => x.id === id);
    db.tarefas = db.tarefas.filter(x => x.id !== id);
    Svc.audit('Tarefa excluída', t ? t.processoId : '', t ? t.titulo : ''); saveDB();
  },
  moverTarefa(id, coluna) {
    const t = db.tarefas.find(x => x.id === id); if (!t) return;
    const u = currentUser();
    if (u.role === 'colaborador' && t.responsavel !== u.id) throw new Error('Você só pode mover tarefas atribuídas a você.');
    if (t.coluna === coluna) return;
    const antiga = t.coluna;
    t.coluna = coluna;
    if (coluna === 'Concluído') { t.concluidaEm = hoje(); Svc.notify([t.responsavel], `Tarefa concluída: ${t.titulo}`, 'tarefa'); }
    else t.concluidaEm = '';
    Svc.audit('Status alterado', t.processoId, `${t.titulo}: ${antiga} → ${coluna}`);
    saveDB();
  },
  comentar(tipo, id, texto) {
    if (!texto.trim()) throw new Error('O comentário está vazio.');
    const obj = tipo === 'processo' ? db.processos.find(x => x.id === id) : db.tarefas.find(x => x.id === id);
    obj.comentarios.push({ autor: currentUserId, texto: texto.trim(), data: agora() });
    Svc.notify([obj.responsavel, ...(obj.participantes || [])], `Comentário recebido em: ${obj.nome || obj.titulo}`, 'comentario');
    Svc.audit('Comentário adicionado', tipo === 'processo' ? id : obj.processoId, texto.trim().slice(0, 60));
    saveDB();
  },

  /* Aprovações */
  solicitarAprovacao(tipo, refId, etapaId, titulo, aprovador) {
    const a = { id: uid('a'), tipo, refId, etapaId: etapaId || '', titulo, solicitante: currentUserId, aprovador, status: 'Pendente', criadaEm: hoje(), decididaEm: '', historico: [{ data: agora(), autor: currentUserId, acao: 'Solicitação criada', justificativa: '' }] };
    db.aprovacoes.unshift(a);
    Svc.notify([aprovador], `Aprovação solicitada: ${titulo}`, 'aprovacao');
    Svc.audit('Aprovação solicitada', tipo === 'processo' ? refId : '', titulo);
    saveDB(); return a;
  },
  decidirAprovacao(id, decisao, justificativa) {
    assert('aprovacao:decidir');
    const a = db.aprovacoes.find(x => x.id === id);
    if (a.status !== 'Pendente') throw new Error('Esta solicitação já foi respondida.');
    if (decisao !== 'Aprovada' && !justificativa.trim()) throw new Error('Informe uma justificativa.');
    a.status = decisao; a.decididaEm = hoje();
    a.historico.push({ data: agora(), autor: currentUserId, acao: decisao, justificativa: justificativa.trim() });
    if (a.etapaId && a.refId) Svc.decidirEtapaAprovacao(a.refId, a.etapaId, decisao === 'Aprovada', justificativa);
    if (a.tipo === 'tarefa' && decisao === 'Aprovada') { const t = db.tarefas.find(x => x.id === a.refId); if (t) t.coluna = 'Em andamento'; }
    Svc.notify([a.solicitante], `Aprovação ${decisao.toLowerCase()}: ${a.titulo}`, 'aprovacao');
    Svc.audit('Aprovação realizada', a.tipo === 'processo' ? a.refId : '', `${decisao} — ${a.titulo}`);
    saveDB();
  },

  /* Usuários e equipes */
  salvarUsuario(u) {
    assert('usuario:gerenciar');
    if (!u.nome.trim() || !u.email.trim()) throw new Error('Nome e e-mail são obrigatórios.');
    if (db.usuarios.some(x => x.email.toLowerCase() === u.email.toLowerCase() && x.id !== u.id)) throw new Error('Já existe um usuário com este e-mail.');
    const ex = db.usuarios.find(x => x.id === u.id);
    if (ex) { if (!u.senha) u.senha = ex.senha; Object.assign(ex, u); Svc.audit('Usuário atualizado', '', u.nome); }
    else { u.id = uid('u'); u.ativo = true; u.senha = u.senha || 'mudar123'; u.telefone = u.telefone || ''; u.cargo = u.cargo || ''; db.usuarios.push(u); Svc.audit('Usuário criado', '', u.nome); }
    saveDB();
  },
  alternarAtivo(id) {
    assert('usuario:gerenciar');
    if (id === currentUserId) throw new Error('Você não pode desativar a própria conta.');
    const u = db.usuarios.find(x => x.id === id); u.ativo = !u.ativo;
    Svc.audit(u.ativo ? 'Usuário ativado' : 'Usuário desativado', '', u.nome); saveDB();
  },
  salvarEquipe(e) {
    assert('equipe:gerenciar');
    if (!e.nome.trim()) throw new Error('Informe o nome da equipe.');
    if (e.id) { const ex = db.equipes.find(x => x.id === e.id); Object.assign(ex, e); }
    else { e.id = uid('e'); e.membros = []; db.equipes.push(e); }
    Svc.audit('Equipe salva', '', e.nome); saveDB();
  },
  salvarDepto(nome) {
    assert('equipe:gerenciar');
    if (!nome.trim()) throw new Error('Informe o nome do departamento.');
    db.departamentos.push({ id: uid('d'), nome: nome.trim() }); Svc.audit('Departamento criado', '', nome); saveDB();
  },
  membroEquipe(equipeId, userId, adicionar) {
    assert('equipe:gerenciar');
    const eq = db.equipes.find(x => x.id === equipeId);
    if (adicionar) { if (!eq.membros.includes(userId)) eq.membros.push(userId); }
    else eq.membros = eq.membros.filter(m => m !== userId);
    Svc.audit(adicionar ? 'Membro adicionado' : 'Membro removido', '', `${nomeUser(userId)} — ${eq.nome}`);
    saveDB();
  },

  /* Notificações e perfil */
  marcarLida(id, lida = true) { const n = db.notificacoes.find(x => x.id === id); if (n) n.lida = lida; saveDB(); },
  marcarTodasLidas() { db.notificacoes.forEach(n => { if (n.userId === currentUserId) n.lida = true; }); saveDB(); },
  atualizarPerfil(dados) {
    const u = currentUser();
    if (!dados.nome.trim()) throw new Error('O nome não pode ficar vazio.');
    if (db.usuarios.some(x => x.email.toLowerCase() === dados.email.toLowerCase() && x.id !== u.id)) throw new Error('Este e-mail já está em uso.');
    Object.assign(u, { nome: dados.nome.trim(), email: dados.email.trim(), cargo: dados.cargo, telefone: dados.telefone });
    if (dados.senha) { if (dados.senha.length < 6) throw new Error('A nova senha deve ter ao menos 6 caracteres.'); u.senha = dados.senha; }
    Svc.audit('Perfil atualizado', '', u.nome); saveDB();
  }
};

/* ---------- Helpers de domínio ---------- */
function nomeUser(id) { const u = db.usuarios.find(x => x.id === id); return u ? u.nome : '—'; }
function fmtDataSimples(d) { if (!d) return '—'; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; }
function tarefaAtrasada(t) { return t.coluna !== 'Concluído' && !!t.prazo && t.prazo < hoje(); }
function processoAtrasado(p) { return !['Concluído', 'Cancelado'].includes(p.status) && !!p.prazo && p.prazo < hoje(); }
function progressoProcesso(p) { const e = p.etapas || []; return e.length ? Math.round(e.filter(x => x.concluida).length / e.length * 100) : (p.status === 'Concluído' ? 100 : 0); }
function processosVisiveis() {
  const u = currentUser(); if (!u) return [];
  if (u.role !== 'colaborador') return db.processos;
  return db.processos.filter(p => p.responsavel === u.id || (p.participantes || []).includes(u.id) || (p.etapas || []).some(e => e.responsavel === u.id));
}
