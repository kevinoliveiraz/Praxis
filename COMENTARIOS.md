# Comentários do código da Praxis

O código segue o padrão de estudo solicitado: cada linha de código recebe uma
explicação em português, com os comentários existentes preservados. Linhas em
branco continuam separando os trechos para facilitar a leitura.

## Arquivos comentados

| Formato | Arquivos | Comentário usado |
|---|---:|---|
| HTML | 9 | `<!-- explicação -->` |
| CSS | 12 | `/* explicação */` |
| JavaScript | 16 | `// explicação` |
| CommonJS, servidor e testes | 9 | `// explicação` |
| Python, auditorias e importadores | 10 | `# explicação` |
| SQL, importação e finalização | 3 | `-- explicação` |

As regras de `.gitignore`, as preferências locais do VS Code e o exemplo CSS
do design system também têm comentários.

## Textos e tags com várias linhas

Algumas linhas fazem parte de um texto que o programa usa como valor: HTML
gerado pelo JavaScript, consultas, SQL gerado pelo Python, títulos e exemplos
de código. Nesses trechos, a explicação de cada linha fica em um bloco de
comentários imediatamente anterior. A numeração `Linha 1 do trecho` começa na
primeira linha do trecho abaixo desse bloco e inclui as linhas em branco.

As tags HTML com atributos distribuídos em várias linhas usam o mesmo padrão.
Assim, as explicações ficam fora dos atributos e dos valores textuais.
As instruções SQL têm comentários na linha anterior, preservando o formato
que o importador usa para localizar e separar as instruções da migração.

## Configuração JSON

[package.comentado.jsonc](package.comentado.jsonc) contém a explicação de cada
linha de `package.json`. O npm usa `package.json`, mantendo JSON válido. Os
inventários, planos e recibos JSON da importação continuam com os mesmos dados.
O VS Code aceita comentários diretamente em `.vscode/settings.json`.

## Conferência desta atualização

Em 10 de outubro de 2026, foram conferidos os 59 arquivos de código, com
16.362 linhas de código cobertas por comentários ou pelos blocos de explicação
de trechos literais. A conferência usou os analisadores de cada formato para
identificar código, comentários e textos, incluindo JavaScript embutido no HTML.

- JavaScript e Python: mesma árvore sintática, desconsiderando as posições das linhas.
- CSS: mesmos seletores, condições, declarações, valores e ordem das regras.
- HTML: mesma estrutura, atributos, textos, recursos e código embutido.
- SQL: mesmas instruções, corpos de funções e dados literais após remover os comentários.
- Preparação local da RPC: mesmos dados e instruções geradas, conferidos em pastas temporárias.
- Configurações: mesmas regras de arquivos ignorados, porta do editor e valores do pacote.
- `npm run check`, os 50 testes existentes e a auditoria das 9 páginas passaram.

Ao acrescentar ou alterar código, mantenha uma explicação específica para cada
linha. Use blocos numerados para valores e tags multilinha, preservando o
conteúdo que o programa utiliza.
