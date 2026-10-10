# Importação de conteúdo do Drive para Praxis

Importação inicial concluída em 9 de outubro de 2026, às 22:08 (America/Sao_Paulo).
Organização dos arquivos corrigida em 10 de outubro de 2026.

Origem: https://drive.google.com/drive/folders/1WgPBPhSfI8O_XXWgHR0DGJpugtHFVj5x

Destino: Supabase `fxpmeosnnrgqdelffnvy`, usado pelo site Praxis.

## Organização conforme o Drive

Os caminhos dos 535 arquivos referenciados seguem a hierarquia completa do
Drive dentro de cada bucket, incluindo curso, subpastas e nome original.
A pasta única `drive-import` foi removida após a conferência dos novos destinos.
O importador e o SQL também usam os caminhos organizados.

| Bucket | Exemplo de caminho |
|---|---|
| `slides` | `WORD/CONTEUDO/INTRODUCAO/01-28.png` |
| `slides` | `POWER BI/CONTEUDO/INTRODUCAO/01-24.png` |
| `materiais` | `EXCEL/CONTEUDO/INTRODUCAO/MATERIAL EXTERNO/Desafio_Excel_na_Pratica.xlsx` |
| `materiais` | `EXCEL/CONTEUDO/PRATICA 02/Green Abstract Organic Group Project Presentation.zip` |
| `storage capas` | `EXCEL/CAPA/Excel pratico Basico ao Avanbcado (1).png` |
| `storage capas` | `WORD/CAPAS/Word na pratica` |

O Supabase aceita apenas determinados caracteres ASCII nas chaves dos objetos.
Por isso, acentos são removidos dos caminhos: `INTRODUÇÃO` vira `INTRODUCAO`.
Pastas, maiúsculas, espaços e nomes são preservados nos demais aspectos; os
nomes apresentados nas aulas continuam com acentos.
Referência: [validação de caminhos do Supabase Storage](https://github.com/supabase/storage/blob/master/src/storage/limits.ts).

Cada arquivo foi copiado, conferido por tamanho e checksum, ligado ao mesmo
registro e depois removido do caminho antigo. Checksums de uploads antigos
com uma parte usam o formato composto descrito na
[documentação do S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/tutorial-s3-mpu-additional-checksums.html).
Todos os IDs, vínculos, ordens e demais campos foram preservados.

A capa original PNG de Excel do Drive foi incluída. A capa JPEG antiga foi
preservada em `storage capas/EXCEL/CAPA/capa excel.jpeg`. Os 53 slides extraídos
dos ZIPs de Excel ficam na mesma pasta do ZIP de origem, conservando os nomes
internos. Assim, há 535 arquivos referenciados e uma imagem antiga preservada.

`storage-layout.py` registra o estado anterior, prepara o mapeamento, aplica
as mudanças e confere o estado final. Os snapshots, plano, recibos e auditoria
ficam em `storage-layout-*.json`. A sequência desta correção é `inspect`,
`build`, `apply` e `verify`; não execute novamente `inspect` ou `build` sobre
uma migração concluída. Para continuar uma execução interrompida, use o mesmo
plano e recibos com `apply`, seguido de `verify`.

## Resultado confirmado

| Conteúdo | Antes | Depois |
|---|---:|---:|
| Cursos | 15 | 23 |
| Módulos | 4 | 23 |
| Aulas | 17 | 64 |
| Slides | 104 | 485 |
| Materiais de apoio | 0 | 27 |

Na importação inicial, foram enviados 387 arquivos: 352 imagens de slides, 27 materiais e 8 capas.
Com a capa original PNG de Excel, o total de uploads da origem passou a 388.
Os 482 arquivos de origem estão mapeados no inventário. Arquivos que já
existiam foram reutilizados, incluindo 53 slides do Excel conferidos com os
sete ZIPs originais. Os ZIPs também estão disponíveis como materiais.

Os IDs e vínculos antigos de cursos, módulos, aulas e slides foram preservados.
As tabelas de usuários e progresso não foram alteradas. Os documentos de Word,
planilhas, apresentações, arquivos de Power BI e ZIPs foram associados às suas
práticas. O catálogo e a página de curso já leem essas tabelas do Supabase.

## Correções

- O slide de Word com caminho inválido foi ligado ao arquivo `06.-28.png` existente.
- A referência de Power BI para a página 7, ausente na origem, foi corrigida
  para a página 9 disponível na mesma aula, preservando o ID do registro.
- O último slide de Excel Prática 02 foi cadastrado; seu arquivo já existia.
- A URL da capa de Outlook foi corrigida para o nome real no Storage.
- O nome `Power-BL` no catálogo foi corrigido para `Power BI`.

## Pendências na origem

Não foram encontrados estes números de página no Drive:

| Curso | Página ausente |
|---|---:|
| PowerPoint | 13 |
| Power BI | 7 |
| Vibe Coding | 6 |

O restante do conteúdo está publicado. Nenhuma página foi inventada para
preencher as lacunas da origem.

## Verificação

- Todos os 387 uploads foram conferidos no servidor pelo tamanho informado no Drive.
- A transação de publicação validou os 535 arquivos referenciados: slides,
  materiais e capas, incluindo os arquivos existentes reutilizados.
- A leitura de volta confirmou todos os valores planejados nas cinco tabelas,
  os IDs e vínculos antigos e nenhuma ordem de slide duplicada por aula.
- A consulta executada com o papel `authenticated` confirmou 23 cursos, 64
  aulas, 485 slides e 27 materiais, sem referências a arquivos ausentes.
- Os buckets de slides e materiais permanecem privados. A leitura dos
  materiais foi habilitada para os alunos autenticados, como a dos slides.
- O importador temporário estava restrito a `service_role` e foi removido.
  As sequências de IDs foram sincronizadas pelo painel sem ampliar os
  privilégios da chave do servidor.

## Arquivos de auditoria

- `drive-inventory.json`: inventário de origem, sem links temporários de download.
- `supabase-before.json` / `supabase-after.json`: tabelas de conteúdo antes e depois.
- `import-plan.json`: correspondência de cursos, aulas e arquivos.
- `upload-receipts.json`: tamanho, SHA-256 local e destino organizado dos 388 uploads.
- `storage-layout-audit.json`: verificação dos 535 caminhos e preservação dos registros.
- `storage-organizado.jpg`: conferência visual das pastas no painel.
- `publication-receipt.json` / `live-audit.json`: resultado e conferência do servidor.
- `import-content.sql`: migração completa para revisão e reprodução.

Os scripts usam apenas Python padrão. Chaves de servidor não são incluídas
no projeto nem no frontend. Downloads assinados e a cópia temporária da chave
ficaram fora do projeto e foram removidos após a conferência.

Para uma importação futura, gere um novo inventário e plano antes de executar
qualquer escrita. O SQL desta importação é específico deste projeto e possui
guardas de colisão de IDs. Não o aplique a outro banco sem revisão.
