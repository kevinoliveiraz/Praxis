# Praxis Design System — v1.0

Referência visual: `design-system.html`. Aplicação: `assine-agora.html`.

## Origem e direção
O sistema foi extraído da identidade existente do Praxis, com os cursos unificados em curso.html. Preserva a identidade da home: fundo #06070C, verde-lima #E0FB38 e Inter. As superfícies claras facilitam leitura e comparação; o escuro apresenta a marca e destaca o plano anual.

## Arquitetura
- styles/tokens.css: fonte única dos tokens, com prefixo --praxis.
- styles/components.css: componentes compartilhados com prefixo px.
- styles/assine-agora.css e styles/design-system.css: composição de cada página.
- main.css, login.css e curso.css: continuam específicos das telas existentes; suas variáveis principais apontam para os tokens.
- scripts/planos.js: configuração dos preços provisórios e URLs futuras de checkout.

Carregue tokens.css antes dos componentes e do CSS específico. Use body.px-page nas novas páginas. Use .px-light para superfícies claras. Os nomes antigos continuam disponíveis nos CSS existentes.

## Fundamentos
| Papel | Token | Valor |
| --- | --- | --- |
| Fundo escuro | --praxis-color-background | #06070C |
| Superfície escura | --praxis-color-surface | #12141D |
| Superfície elevada | --praxis-color-surface-raised | #191B25 |
| Fundo claro | --praxis-color-paper | #FBFAFB |
| Ação principal | --praxis-color-accent | #E0FB38 |
| Texto em fundo claro | --praxis-color-ink | #0B0D10 |
| Apoio em fundo escuro | --praxis-color-muted | #B6BAC6 |
| Apoio em fundo claro | --praxis-color-muted-dark | #5F6472 |

Tipografia: Inter, pesos 400, 500, 600, 700, 800. Display responsivo 40–64 px; corpo 16 px com entrelinha 1,6; apoio 14 px; labels 12 px. Títulos usam peso 800 e entrelinha compacta.

Espaçamento: escala de 4 px (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80). Container das novas páginas: 1200 px, com margens de 32 px no desktop e 18 px no celular. O container original permanece em 1440 px.

Raios: 8 px pequeno, 12 px botões/campos, 14 px médio, 22 px cards/dialog, 32 px seções, 999 px pílulas. As páginas antigas mantêm os raios já usados para evitar mudanças desnecessárias de composição.

## Componentes
- .px-button + --primary / --secondary / --outline: altura mínima 48 px; variantes, hover, active, disabled e foco.
- .px-header, .px-logo, .px-nav, .px-footer: navegação.
- .px-card + --dark: cards claros e escuros.
- .px-eyebrow e .px-tag + --accent / --soft: hierarquia e etiquetas.
- .px-field, .px-input, .px-help: labels, campos, ajuda e erro.
- .px-notice: aviso.
- .px-details: acordeão nativo com details/summary.
- .px-dialog: seleção de plano via dialog nativo, com Escape e foco contido.
- .px-icon: SVG de 20 px, traço 1,8, currentColor; ícones decorativos usam aria-hidden.

## Acessibilidade e responsividade
- Texto escuro sobre verde-lima; evite verde-lima como texto sobre branco.
- Foco visível com contorno de 3 px nas novas páginas.
- Links e botões têm nomes explícitos; labels associados aos campos.
- FAQ funciona sem JavaScript; planos têm links de cadastro como fallback.
- Layout de planos em duas colunas acima de 760 px e uma abaixo disso.
- O aviso de valores provisórios e o total anual aparecem junto à comparação.
- prefers-reduced-motion remove animações/transições e rolagem suave.
- Dialog nativo: Escape fecha e restaura o foco; botão de fechar e clique fora.
- A página de assinatura não grava progresso, não altera sessão e não coleta dados de pagamento.

## Planos provisórios
- Mensal: R$ 59,90.
- Anual: R$ 478,80 por ano em pagamento único; média de R$ 39,90/mês.
- Economia calculada: R$ 240,00, aproximadamente 33%, comparando com 12 mensalidades.
- provisional: true desabilita qualquer encaminhamento para pagamento.
- Sem checkout, a prévia oferece criar conta ou explorar cursos. Cadastro não ativa assinatura.

Para integrar pagamento posteriormente: aprovar preços e condições, implementar um checkout real com validação no servidor e definir checkoutUrl HTTPS por plano. Só então alterar provisional para false. A interface não concede acesso pago por conta própria.

## Preview local
Execute `npm run dev` na pasta Praxis. Abra:
- http://127.0.0.1:5502/index.html
- http://127.0.0.1:5502/assine-agora.html
- http://127.0.0.1:5502/design-system.html

O preview usa apenas Node.js e escuta em 127.0.0.1. Não requer instalar pacotes.
