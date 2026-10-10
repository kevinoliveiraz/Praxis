# Importação de conteúdo do Drive para Praxis

Concluída em 9 de outubro de 2026, às 22:08 (America/Sao_Paulo).

Origem: https://drive.google.com/drive/folders/1WgPBPhSfI8O_XXWgHR0DGJpugtHFVj5x

Destino: Supabase `fxpmeosnnrgqdelffnvy`, usado pelo site Praxis.

## Resultado confirmado

| Conteúdo | Antes | Depois |
|---|---:|---:|
| Cursos | 15 | 23 |
| Módulos | 4 | 23 |
| Aulas | 17 | 64 |
| Slides | 104 | 485 |
| Materiais de apoio | 0 | 27 |

Foram enviados 387 arquivos: 352 imagens de slides, 27 materiais e 8 capas.
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
- `upload-receipts.json`: tamanho, SHA-256 local e destino dos 387 uploads.
- `publication-receipt.json` / `live-audit.json`: resultado e conferência do servidor.
- `import-content.sql`: migração completa para revisão e reprodução.

Os scripts usam apenas Python padrão. Chaves de servidor não são incluídas
no projeto nem no frontend. Downloads assinados e a cópia temporária da chave
ficaram fora do projeto e foram removidos após a conferência.

Para uma importação futura, gere um novo inventário e plano antes de executar
qualquer escrita. O SQL desta importação é específico deste projeto e possui
guardas de colisão de IDs. Não o aplique a outro banco sem revisão.
