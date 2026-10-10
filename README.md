# Praxis

Plataforma de cursos práticos com autenticação e catálogo conectados ao Supabase, design system compartilhado e página de assinatura.

## Abrir
Com Node.js disponível, execute `npm run dev` nesta pasta e abra http://127.0.0.1:5502.

## Entregas
- `assine-agora.html`: página de assinatura responsiva com planos provisórios mensal e anual.
- `design-system.html`: catálogo visual de fundamentos e componentes.
- `DESIGN-SYSTEM.md`: documentação de uso.
- `styles/tokens.css`: tokens compartilhados.
- `styles/components.css`: componentes reutilizáveis.
- `scripts/planos.js`: configuração única dos planos.
- `login.html`: login inspirado na referência da aula, com os fundos originais claro/escuro.
- `scripts/theme.js` e `styles/theme.css`: alternância de tema em todas as páginas, com preferência salva.
- `perfil.html`: conta autenticada com edição de nome/usuário/foto por link, recuperação de senha, aparência e encerramento de sessões.
- `scripts/header.js`, `scripts/header-session.js` e `scripts/account-menu.js`: cabeçalho compartilhado e menu ao clicar na foto, disponível na home, cursos e perfil.

A home direciona o botão Assine agora à página de planos. Todos os cursos utilizam `curso.html?id=ID_DO_CURSO`. Autenticação, catálogo e cursos continuam com o Supabase existente. A assinatura é uma prévia: pagamento e ativação de acesso ainda precisam de integração.

## Conteúdo dos cursos

O Supabase contém 23 cursos, 23 módulos, 64 aulas, 485 slides e 27 materiais de apoio após a importação do Drive em 2026-10-09. O site carrega esse conteúdo diretamente do banco e do Storage. Os IDs e vínculos existentes foram preservados.

[O relatório da importação](tools/content-import/README.md) inclui os inventários, a migração SQL, os recibos de upload e a conferência do conteúdo publicado. Os arquivos de aulas ficam no Supabase; chaves do servidor e links temporários de download não fazem parte do repositório.

Há três lacunas na numeração da origem: PowerPoint 13, Power BI 7 e Vibe Coding 6. Os demais arquivos disponíveis foram associados aos cursos e às práticas.

## Verificação
Execute `npm run check` para verificar a sintaxe dos scripts e do servidor local. Com Node.js 22, execute `npm test` para os testes locais de tema e autenticação. Os testes simulam o Supabase e não enviam e-mails nem alteram contas. Com Python 3, `python tools/audit-pages.py` verifica estrutura, arquivos, tokens e contraste das cores semânticas. Consulte `VALIDACAO.md` para os limites da verificação.

## Recuperação de senha
Em Auth → URL Configuration do Supabase, os endereços de retorno precisam ser permitidos, incluindo o caminho `login.html?modo=redefinir` no ambiente usado (local ou publicado). O envio depende do serviço de e-mail configurado no projeto. O botão já usa [resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), e a nova senha é salva com [updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser) após abrir um link válido. Nenhuma configuração do painel Supabase foi alterada nesta entrega.

## Perfil e configurações
Abra o menu da foto → Meu perfil, ou `perfil.html`. A página verifica a autenticação e usa a tabela `usuarios` já existente (`user_id`, `nome_usuario`, `nome_completo`, `email`, `avatar_url`). As permissões RLS e a restrição de nome único precisam continuar configuradas no projeto Supabase. Nenhuma tabela, bucket ou política foi criada nesta entrega.

Nome e foto são salvos na tabela e sincronizados com [os metadados de autenticação](https://supabase.com/docs/reference/javascript/auth-updateuser). Uma falha parcial de sincronização recebe mensagem explícita; salvar novamente repete a sincronização. O login preserva nome e foto personalizados do registro existente. A foto usa um link HTTPS ou iniciais, sem upload de arquivos.

Claro, escuro e seguir o sistema usam o mesmo controlador de todas as páginas e são salvos neste navegador. Alterar senha solicita o link para o e-mail da conta. Os botões de sessão usam [signOut](https://supabase.com/docs/reference/javascript/auth-signout) com `others` (preserva este navegador) e `local` (sai neste navegador). A renovação das outras sessões é revogada; tokens de acesso já emitidos podem continuar válidos até expirar.
