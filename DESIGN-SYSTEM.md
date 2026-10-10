# Praxis Design System — v1.1

Referência visual: `design-system.html`. Aplicação: `assine-agora.html`.

## Origem e direção
O sistema foi extraído da identidade existente do Praxis, com os cursos unificados em curso.html. Preserva preto profundo, verde-lima #E0FB38 e Inter. A interface inteira acompanha o tema claro ou escuro escolhido pelo usuário.

## Arquitetura
- styles/tokens.css: fonte única dos tokens, com prefixo --praxis.
- styles/components.css: componentes compartilhados com prefixo px.
- styles/theme.css: seletor de tema e integração com os estilos existentes da home e dos cursos.
- scripts/theme.js: inicia o tema antes do CSS e sincroniza a preferência entre páginas e abas.
- styles/assine-agora.css e styles/design-system.css: composição de cada página.
- main.css, login.css e curso.css: continuam específicos das telas existentes; suas variáveis principais apontam para os tokens.
- scripts/planos.js: configuração dos preços provisórios e URLs futuras de checkout.

Carregue scripts/theme.js no head antes das folhas de estilo. Carregue tokens.css, componentes, CSS da página e theme.css nessa ordem. Use body.px-page nas novas páginas. A classe histórica .px-light agora representa uma superfície alternativa que também acompanha o tema. Os nomes antigos continuam disponíveis nos CSS existentes.

## Temas
A paleta --praxis-color-* permanece fixa para a marca, capas e exemplos de cores. Para interfaces, use os papéis semânticos abaixo:

| Papel | Token | Escuro | Claro |
| --- | --- | --- | --- |
| Página | --praxis-page | #06070C | #FBFAFB |
| Card/campo | --praxis-panel | #12141D | #FFFFFF |
| Seção alternativa | --praxis-panel-alt | #0E1017 | #F2F4EF |
| Superfície elevada | --praxis-panel-raised | #191D28 | #F1F3F6 |
| Texto | --praxis-text | #FBFAFB | #15191F |
| Apoio | --praxis-muted | #B6BAC6 | #535B68 |
| Destaque em texto/foco | --praxis-accent-text / --praxis-focus | #E0FB38 | #4A5900 |
| Borda | --praxis-line | #343A48 | #CCD1D8 |

O controlador define data-theme no html. Sem escolha salva, segue prefers-color-scheme. O botão data-theme-toggle alterna e salva light/dark em localStorage.praxis-theme. O tema continua funcionando se o armazenamento estiver bloqueado. Mudanças da preferência do sistema só se aplicam até o usuário fazer uma escolha; alterações em outra aba são sincronizadas.

Verde-lima continua no fundo das ações principais, com texto --praxis-color-ink fixo. O destaque textual do tema claro usa verde escuro. Capas e slides mantêm as cores de seu conteúdo.

## Autenticação
login.html segue o cartão central e os campos arredondados da referência da aula. Os arquivos assets/login-light.png e assets/login-dark.png são cópias das duas imagens originais fornecidas pelo usuário. Cadastro e completar perfil usam a mesma composição e tema.

A logo recebe uma base escura no modo claro. Texto, placeholder, preenchimento automático, erros, campos e foco têm cores próprias por tema. Em telas baixas, o login fica mais compacto; no celular, a página pode rolar sem cortar o formulário.

scripts/login-ui.js controla exibição de senha, validação nativa e a opção Lembrar meu e-mail. Salva apenas o e-mail quando a opção é marcada e remove a preferência quando desmarcada. scripts/login.js mantém autenticação por senha/Google e sincronização do perfil. A recuperação usa a mesma página: ?modo=recuperar solicita o link e ?modo=redefinir permite criar a nova senha quando há uma sessão válida.

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

## Organização do CSS

Os estilos usam [aninhamento nativo de CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Nesting/Using), sem Sass ou etapa de compilação. `&` representa o seletor do bloco atual e agrupa estados e elementos relacionados:

```css
.px-button--primary {
  background: var(--praxis-color-accent);

  &:hover {
    background: var(--praxis-color-accent-hover);
  }
}
```

Use `&:hover`, `&:focus-visible`, `&.is-active` e `& .elemento`. Classes com nomes próprios, como `.px-button--primary`, permanecem completas; CSS nativo não aceita concatenar nomes com `&--primary`. Mantenha a ordem das regras e evite agrupar seletores de especificidades diferentes no bloco pai. Os tokens continuam definidos em `styles/tokens.css`.

## Componentes
- Home e cursos montam o mesmo cabeçalho com scripts/header.js e styles/header.css. Use `<header class="site-header" data-site-header data-subscription="true"></header>` na home e `data-subscription="false"` nos cursos; carregue header.js com defer e header.css após theme.css.
- scripts/header-session.js é a única implementação do perfil no cabeçalho: prioriza nome de usuário, depois nome completo e e-mail; mantém avatar, entrada e saída. A preferência de tema usa o controlador compartilhado já existente.
- A foto e o nome abrem um menu de conta com links para perfil, aparência, segurança e sessões, além de sair. scripts/account-menu.js controla clique, setas, Escape, foco e fechamento ao clicar fora; o menu usa links nativos e aria-expanded/aria-controls.
- perfil.html usa o mesmo cabeçalho sem assinatura, navegação lateral e cartões de configurações. No celular, a navegação vira uma linha de atalhos. Nome/foto são dados da conta; a aparência é uma preferência deste navegador. window.PraxisTheme permite escolher light, dark ou system.
- .px-button + --primary / --secondary / --outline: altura mínima 48 px; variantes, hover, active, disabled e foco.
- .px-header, .px-logo, .px-nav, .px-footer: navegação.
- .px-card + --dark: card padrão e variante de destaque; ambos acompanham o tema.
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
