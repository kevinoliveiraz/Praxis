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

A home direciona o botão Assine agora à página de planos. Todos os cursos utilizam `curso.html?id=ID_DO_CURSO`. Autenticação, catálogo e cursos continuam com o Supabase existente. A assinatura é uma prévia: pagamento e ativação de acesso ainda precisam de integração.

## Verificação
Execute `npm run check` para verificar a sintaxe dos novos scripts e do servidor local. Consulte `VALIDACAO.md` para os demais checks e os limites da verificação.
