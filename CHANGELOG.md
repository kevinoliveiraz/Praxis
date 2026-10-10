# CHANGELOG — Praxis

Este arquivo registra as alterações estruturais e funcionais relevantes do projeto.

## 2026-10-10 — Pastas do Storage conforme o Drive

- Reorganização de 535 arquivos referenciados com curso, subpastas e nomes originais, substituindo a pasta única `drive-import`.
- Atualização dos caminhos de slides, materiais e capas sem alterar IDs, vínculos, ordens ou outros campos das aulas.
- Inclusão da capa original PNG de Excel; preservação da imagem JPEG anterior na pasta CAPA.
- Normalização somente dos caracteres incompatíveis com as chaves do Supabase, incluindo acentos.
- Importador, SQL e recibos atualizados para manter a mesma hierarquia; auditorias de arquivos e registros e conferência visual no painel.

## 2026-10-09 — Conteúdo dos cursos importado do Drive

- Catálogo publicado no Supabase com 23 cursos, 23 módulos, 64 aulas, 485 slides e 27 materiais de apoio.
- Envio de 387 arquivos e reutilização dos arquivos existentes, com os 53 slides de Excel conferidos contra os sete ZIPs originais.
- Preservação dos IDs e vínculos antigos, incluindo os usados pelo progresso dos alunos.
- Correção de caminhos de slides de Word e Power BI, da capa de Outlook e do nome Power BI no catálogo.
- Materiais associados às práticas e disponíveis em bucket privado para alunos autenticados.
- Ferramentas de importação, SQL, inventários, recibos e relatório em `tools/content-import/`.
- Verificação de todos os valores publicados e dos 535 arquivos referenciados; sem referências publicadas a arquivos ausentes.
- Registradas três lacunas na origem: PowerPoint 13, Power BI 7 e Vibe Coding 6.

## 2026-10-09 — Perfil e configurações da conta

- Menu ao clicar na foto/nome, com Meu perfil, Aparência, Segurança, Sessões da conta e Sair. Suporte a teclado, Escape e fechamento fora do menu.
- Nova página perfil.html, com navegação lateral, cartões responsivos e os dois temas.
- Edição de nome completo, usuário e foto por link HTTPS ou iniciais, persistida no Supabase existente e refletida no cabeçalho.
- Preferência de tema claro, escuro ou sistema; recuperação de senha para o e-mail autenticado; encerramento separado da sessão atual e de outras sessões.
- O login preserva nome e foto editados no perfil. Falhas de gravação ou sincronização parcial recebem mensagens próprias.
- Testes locais de perfil, menu, sessões e aparência; auditoria agora inclui oito páginas e o menu autenticado.

## 2026-10-09 — Cabeçalho compartilhado

- Home e cursos usam um único componente em scripts/header.js, styles/header.css e scripts/header-session.js.
- Logo, altura, margens, controles, nome do perfil e avatar seguem as mesmas regras nas duas páginas, inclusive no celular e nos dois temas.
- Assine agora aparece somente na home, mantendo o hover de cor, sombra e elevação.
- Removidas as cópias de estilos e da renderização de perfil das páginas. A barra de aulas fica abaixo do cabeçalho ao rolar.
- Testes locais verificam o componente, a integração com o tema, perfil, saída, consulta pendente e atualização do progresso do curso.

## 2026-10-09 — Login e temas claro/escuro

- Login com logo Praxis, cartão central, campos arredondados e os dois fundos originais fornecidos pelo usuário.
- Tema claro com texto escuro, foco contrastante e cores adequadas para preenchimento automático e mensagens.
- Alternância em todas as sete páginas, com preferência salva, integração com o tema do sistema e sincronização entre abas.
- Cadastro e completar perfil seguem o mesmo estilo da autenticação.
- Opção para lembrar somente o e-mail e controle acessível para mostrar/ocultar senha.
- Recuperação e redefinição de senha na página de login, usando o Supabase existente.
- Testes locais de tema/login e auditoria de estrutura, referências e contraste. Nenhuma conta real foi usada nos testes.

## 2026-10-08 — Design system e Assine Agora

### Adicionado
- Tokens compartilhados de cor, tipografia, espaçamento, raios, foco e movimento em styles/tokens.css.
- Componentes reutilizáveis em styles/components.css, com prefixo px e variantes claras/escuras.
- Catálogo visual em design-system.html e documentação em DESIGN-SYSTEM.md.
- Página assine-agora.html com apresentação, planos mensal/anual, benefícios, FAQ e prévia acessível do plano.
- Configuração única em scripts/planos.js, com preços provisórios explicitamente identificados e checkout desativado.
- Preview local via npm run dev, sem dependências adicionais, na porta 5502.

### Alterado
- O botão Assine agora da home agora abre a nova página e possui nome acessível no celular.
- Variáveis principais dos CSS existentes passaram a apontar para os tokens do design system.
- O verde de destaque da área de curso foi alinhado ao verde-lima da identidade principal.

### Mantido
- Supabase, autenticação e lógica de catálogo/cursos existentes.
- As pastas originais do computador: esta entrega está na cópia de trabalho Praxis.

## 2026-10-06 — Unificação da página de cursos

### Alterado
- As páginas individuais de Excel, Word, PowerPoint e Power BI foram substituídas por uma única `curso.html`.
- Os JavaScripts individuais dos quatro cursos foram substituídos por `scripts/curso.js`.
- `styles/curso.css` permanece como o único CSS específico da área de cursos.
- `scripts/index.js` agora direciona qualquer curso válido para `curso.html?id=ID_DO_CURSO`.
- `scripts/curso.js` lê o parâmetro `id` da URL e utiliza esse ID nas consultas ao mesmo Supabase já configurado em `scripts/supabaseClient.js`.
- A versão mais completa da lógica de curso, que estava em `scripts/excel.js`, foi adotada como base compartilhada para preservar navegação, slides, materiais, progresso, cache e tela cheia.
- Textos fixos específicos de Excel na estrutura compartilhada foram substituídos por textos genéricos; nome, descrição, categoria, módulos e aulas continuam vindo do Supabase.
- Referências textuais restantes de `SkillUp` foram atualizadas para `Praxis`.

### Removido
- `excel.html`
- `word.html`
- `powerpoint.html`
- `powerbi.html`
- `scripts/excel.js`
- `scripts/word.js`
- `scripts/powerpoint.js`
- `scripts/powerbi.js`

### Mantido
- A configuração existente do Supabase.
- As consultas às tabelas `catalogo`, `modulos`, `aulas`, `slides`, `materiais` e `progresso_aulas`.
- Os buckets existentes de slides e materiais.
- O CSS compartilhado `styles/curso.css`.

### Novo padrão de URL
- Excel: `curso.html?id=1`
- Word: `curso.html?id=2`
- PowerPoint: `curso.html?id=3`
- Power BI: `curso.html?id=4`
- Cursos futuros podem utilizar a mesma página e o mesmo JavaScript, bastando existir no Supabase com um ID válido.

### Padrão de organização e comentários
- O código deve permanecer dividido em seções claras e previsíveis.
- Novas implementações devem receber comentários didáticos explicando sua finalidade e funcionamento.
- Comentários devem ficar em posições seguras, sem invalidar HTML, CSS ou JavaScript.
- Mudanças futuras relevantes devem ser adicionadas a este CHANGELOG.
