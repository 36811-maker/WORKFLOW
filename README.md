# WORKFLOW — Plataforma de Gestão de Processos

Sistema web para gerenciamento de processos empresariais, tarefas, equipes, aprovações e fluxos de trabalho.
Desenvolvido com **HTML5, CSS3 e JavaScript puro (Vanilla JS)**, sem frameworks. Os dados são persistidos no `localStorage` do navegador.

## Estrutura

```
WORKFLOW/
├── index.html          # Aplicação (shell + telas de login, recuperação e páginas internas)
├── css/
│   ├── style.css       # Tokens de cor, layout, shell, autenticação, modo escuro
│   ├── components.css  # Cards, botões, badges, tabelas, modais, kanban, gráficos, fluxo
│   └── responsive.css  # Responsividade (tablet e mobile) e ajustes finais
├── js/
│   ├── data.js         # Dados iniciais, persistência, sessão, permissões e serviços (regras de negócio)
│   └── app.js          # Roteamento SPA, páginas, modais, ações e formulários
└── README.md
```

## Como executar

Abra o `index.html` em um navegador moderno (ou sirva a pasta com qualquer servidor estático).

### Contas de demonstração

| Perfil        | E-mail                 | Senha     |
|---------------|------------------------|-----------|
| Administrador | admin@workflow.com     | admin123  |
| Gestor        | gestor@workflow.com    | gestor123 |
| Colaborador   | colab@workflow.com     | colab123  |

## Funcionalidades

- **Autenticação:** login, recuperação de senha (código simulado), logout, sessão persistente e proteção das páginas.
- **Perfis:** Administrador, Gestor e Colaborador, com permissões verificadas na interface e nas regras de negócio (`Svc` em `data.js`).
- **Dashboard:** indicadores e gráficos calculados a partir dos dados reais, atividades, minhas tarefas, prazos, aprovações, processos prioritários e ranking.
- **Processos:** criar, editar, excluir, duplicar, pesquisar, filtrar por status, responsável e departamento, ordenar por prioridade, histórico e auditoria individual.
- **Construtor de fluxos:** etapas (Início, Tarefa, Revisão, Aprovação, Decisão, Conclusão) com responsável, prazo, dependências, condições e reordenação. Aprovações rejeitadas retornam para a etapa anterior.
- **Kanban:** colunas A fazer, Em andamento, Em revisão, Bloqueado e Concluído, com arrastar e soltar (API nativa de drag and drop) e filtros por responsável, prioridade, equipe e processo.
- **Tarefas:** CRUD, subtarefas, comentários, anexos, conclusão, visões (todas, minhas, pendentes, atrasadas, concluídas).
- **Aprovações:** aprovar, rejeitar ou solicitar alterações com justificativa obrigatória e histórico auditável.
- **Equipes:** departamentos, equipes, gestores, membros, produtividade e processos por equipe.
- **Usuários:** criar, editar, ativar/desativar, funções, departamentos, busca e filtros, atividades por usuário.
- **Relatórios:** processos concluídos e atrasados, tarefas por colaborador, produtividade por equipe, tempo médio, aprovações e processos por departamento; filtros por período, equipe, departamento e status; exportação CSV e impressão/PDF.
- **Notificações:** centro de notificações, contador de não lidas, marcar como lida.
- **Auditoria:** registro de ações com usuário, data, processo e alteração.
- **Perfil e configurações:** edição de dados pessoais e senha, modo escuro, departamentos e matriz de permissões.

## Limitações conhecidas

- Não há backend real: a persistência é local (`localStorage`) e as permissões são verificadas no cliente. Em produção, as mesmas regras devem ser validadas em uma API.
- A recuperação de senha exibe o código na tela (simulação); não há envio de e-mail.
- Anexos armazenam apenas nome e tamanho do arquivo.
- As páginas estão concentradas em uma única aplicação (SPA por hash, `#/rota`), e não em arquivos HTML separados por tela.
