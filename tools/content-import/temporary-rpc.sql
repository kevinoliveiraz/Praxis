-- Importador temporário: somente service_role; sem SQL fornecido pelo cliente.
-- Inicia uma transação para publicar todas as alterações de forma atômica.
BEGIN;
-- Declara a função temporária praxis_import_drive_20261009 que recebe o pacote JSONB revisado.
CREATE FUNCTION public.praxis_import_drive_20261009(payload jsonb)
-- Define retorno JSONB, execução PL/pgSQL com os privilégios do chamador e o caminho de pesquisa limitado.
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp
-- Inicia o corpo literal da função, delimitado pela marca de dólar indicada.
AS $import_rpc$
-- Inicia o bloco de instruções da função ou da verificação.
BEGIN

-- Limita a espera por bloqueios das tabelas ao tempo informado.
SET LOCAL lock_timeout = '10s';
-- Limita a duração das instruções desta transação ao tempo informado.
SET LOCAL statement_timeout = '120s';
-- Bloqueia as tabelas de conteúdo durante a importação para evitar alterações concorrentes.
LOCK TABLE public.catalogo,public.modulos,public.aulas,public.slides,public.materiais IN SHARE ROW EXCLUSIVE MODE;
-- Cria a tabela temporária para os arquivos e seus tamanhos, removida automaticamente ao confirmar a transação.
CREATE TEMP TABLE import_files(bucket text,path text,size bigint) ON COMMIT DROP;
-- Carrega os arquivos e seus tamanhos do pacote JSONB na tabela temporária para conferência e publicação.
INSERT INTO import_files SELECT * FROM jsonb_to_recordset(payload->'files') AS x(bucket text,path text,size bigint);
-- Inicia a verificação de existência e tamanho dos arquivos antes de cadastrar o conteúdo.
DO $verify$
-- Inicia o bloco de instruções da função ou da verificação.
BEGIN
  -- Verifica se algum arquivo do plano está ausente no Storage ou tem tamanho diferente.
  IF EXISTS (SELECT 1 FROM import_files f LEFT JOIN storage.objects o ON o.bucket_id=f.bucket AND o.name=f.path WHERE o.id IS NULL OR (o.metadata->>'size')::bigint<>f.size) THEN
    -- Interrompe a transação com a mensagem indicada quando a verificação de segurança falha.
    RAISE EXCEPTION 'Importação interrompida: arquivo ausente ou tamanho diferente no Storage.';
  -- Encerra a verificação condicional atual.
  END IF;
  -- Verifica se o bucket materiais existe e permanece privado.
  IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='materiais' AND public=false) THEN
    -- Interrompe a transação com a mensagem indicada quando a verificação de segurança falha.
    RAISE EXCEPTION 'O bucket materiais deve existir e permanecer privado.';
  -- Encerra a verificação condicional atual.
  END IF;
-- Encerra o bloco de verificação e seu corpo delimitado por dólar.
END $verify$;
-- Cria a tabela temporária para os cursos do catálogo, removida automaticamente ao confirmar a transação.
CREATE TEMP TABLE import_catalogo(id bigint,nome text,categoria text,descricao text,ordem_exibicao integer,status text,imagem_capa_url text) ON COMMIT DROP;
-- Carrega os cursos do catálogo do pacote JSONB na tabela temporária para conferência e publicação.
INSERT INTO import_catalogo SELECT * FROM jsonb_to_recordset(payload->'catalogo') AS x(id bigint,nome text,categoria text,descricao text,ordem_exibicao integer,status text,imagem_capa_url text);
-- Impede a reutilização de IDs de os cursos do catálogo quando o registro existente diverge dos dados planejados.
DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM public.catalogo t JOIN import_catalogo s USING(id) WHERE t.id NOT IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15) AND (t.nome IS DISTINCT FROM s.nome OR t.categoria IS DISTINCT FROM s.categoria OR t.descricao IS DISTINCT FROM s.descricao OR t.ordem_exibicao IS DISTINCT FROM s.ordem_exibicao OR t.status IS DISTINCT FROM s.status OR t.imagem_capa_url IS DISTINCT FROM s.imagem_capa_url)) THEN RAISE EXCEPTION 'Conflito de IDs na tabela catalogo; nenhum cadastro foi publicado.'; END IF; END $guard$;
-- Publica os cursos do catálogo mantendo os IDs; atualiza as colunas listadas quando o ID já existe.
INSERT INTO public.catalogo(id,nome,categoria,descricao,ordem_exibicao,status,imagem_capa_url) SELECT id,nome,categoria,descricao,ordem_exibicao,status,imagem_capa_url FROM import_catalogo WHERE true ON CONFLICT(id) DO UPDATE SET nome=EXCLUDED.nome,categoria=EXCLUDED.categoria,descricao=EXCLUDED.descricao,imagem_capa_url=EXCLUDED.imagem_capa_url;
-- Cria a tabela temporária para os módulos dos cursos, removida automaticamente ao confirmar a transação.
CREATE TEMP TABLE import_modulos(id bigint,curso_id bigint,nome text,descricao text,ordem integer,status text) ON COMMIT DROP;
-- Carrega os módulos dos cursos do pacote JSONB na tabela temporária para conferência e publicação.
INSERT INTO import_modulos SELECT * FROM jsonb_to_recordset(payload->'modulos') AS x(id bigint,curso_id bigint,nome text,descricao text,ordem integer,status text);
-- Impede a reutilização de IDs de os módulos dos cursos quando o registro existente diverge dos dados planejados.
DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM public.modulos t JOIN import_modulos s USING(id) WHERE t.id NOT IN (1,2,3,4) AND (t.curso_id IS DISTINCT FROM s.curso_id OR t.nome IS DISTINCT FROM s.nome OR t.descricao IS DISTINCT FROM s.descricao OR t.ordem IS DISTINCT FROM s.ordem OR t.status IS DISTINCT FROM s.status)) THEN RAISE EXCEPTION 'Conflito de IDs na tabela modulos; nenhum cadastro foi publicado.'; END IF; END $guard$;
-- Publica os módulos dos cursos mantendo os IDs; preserva o registro quando o ID já existe.
INSERT INTO public.modulos(id,curso_id,nome,descricao,ordem,status) SELECT id,curso_id,nome,descricao,ordem,status FROM import_modulos WHERE true ON CONFLICT(id) DO NOTHING;
-- Cria a tabela temporária para as aulas dos módulos, removida automaticamente ao confirmar a transação.
CREATE TEMP TABLE import_aulas(id bigint,modulo_id bigint,nome text,descricao text,ordem integer,status text) ON COMMIT DROP;
-- Carrega as aulas dos módulos do pacote JSONB na tabela temporária para conferência e publicação.
INSERT INTO import_aulas SELECT * FROM jsonb_to_recordset(payload->'aulas') AS x(id bigint,modulo_id bigint,nome text,descricao text,ordem integer,status text);
-- Impede a reutilização de IDs de as aulas dos módulos quando o registro existente diverge dos dados planejados.
DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM public.aulas t JOIN import_aulas s USING(id) WHERE t.id NOT IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17) AND (t.modulo_id IS DISTINCT FROM s.modulo_id OR t.nome IS DISTINCT FROM s.nome OR t.descricao IS DISTINCT FROM s.descricao OR t.ordem IS DISTINCT FROM s.ordem OR t.status IS DISTINCT FROM s.status)) THEN RAISE EXCEPTION 'Conflito de IDs na tabela aulas; nenhum cadastro foi publicado.'; END IF; END $guard$;
-- Publica as aulas dos módulos mantendo os IDs; preserva o registro quando o ID já existe.
INSERT INTO public.aulas(id,modulo_id,nome,descricao,ordem,status) SELECT id,modulo_id,nome,descricao,ordem,status FROM import_aulas WHERE true ON CONFLICT(id) DO NOTHING;
-- Cria a tabela temporária para os slides das aulas, removida automaticamente ao confirmar a transação.
CREATE TEMP TABLE import_slides(id bigint,aula_id bigint,titulo text,imagem_path text,ordem integer,status text) ON COMMIT DROP;
-- Carrega os slides das aulas do pacote JSONB na tabela temporária para conferência e publicação.
INSERT INTO import_slides SELECT * FROM jsonb_to_recordset(payload->'slides') AS x(id bigint,aula_id bigint,titulo text,imagem_path text,ordem integer,status text);
-- Impede a reutilização de IDs de os slides das aulas quando o registro existente diverge dos dados planejados.
DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM public.slides t JOIN import_slides s USING(id) WHERE t.id NOT IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104) AND (t.aula_id IS DISTINCT FROM s.aula_id OR t.titulo IS DISTINCT FROM s.titulo OR t.imagem_path IS DISTINCT FROM s.imagem_path OR t.ordem IS DISTINCT FROM s.ordem OR t.status IS DISTINCT FROM s.status)) THEN RAISE EXCEPTION 'Conflito de IDs na tabela slides; nenhum cadastro foi publicado.'; END IF; END $guard$;
-- Publica os slides das aulas mantendo os IDs; atualiza as colunas listadas quando o ID já existe.
INSERT INTO public.slides(id,aula_id,titulo,imagem_path,ordem,status) SELECT id,aula_id,titulo,imagem_path,ordem,status FROM import_slides WHERE true ON CONFLICT(id) DO UPDATE SET titulo=EXCLUDED.titulo,imagem_path=EXCLUDED.imagem_path,ordem=EXCLUDED.ordem,status=EXCLUDED.status;
-- Cria a tabela temporária para os materiais das aulas, removida automaticamente ao confirmar a transação.
CREATE TEMP TABLE import_materiais(id bigint,aula_id bigint,nome text,arquivo_path text,tipo text,ordem integer,status text) ON COMMIT DROP;
-- Carrega os materiais das aulas do pacote JSONB na tabela temporária para conferência e publicação.
INSERT INTO import_materiais SELECT * FROM jsonb_to_recordset(payload->'materiais') AS x(id bigint,aula_id bigint,nome text,arquivo_path text,tipo text,ordem integer,status text);
-- Impede a reutilização de IDs de os materiais das aulas quando o registro existente diverge dos dados planejados.
DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM public.materiais t JOIN import_materiais s USING(id) WHERE t.id NOT IN (-1) AND (t.aula_id IS DISTINCT FROM s.aula_id OR t.nome IS DISTINCT FROM s.nome OR t.arquivo_path IS DISTINCT FROM s.arquivo_path OR t.tipo IS DISTINCT FROM s.tipo OR t.ordem IS DISTINCT FROM s.ordem OR t.status IS DISTINCT FROM s.status)) THEN RAISE EXCEPTION 'Conflito de IDs na tabela materiais; nenhum cadastro foi publicado.'; END IF; END $guard$;
-- Publica os materiais das aulas mantendo os IDs; preserva o registro quando o ID já existe.
INSERT INTO public.materiais(id,aula_id,nome,arquivo_path,tipo,ordem,status) SELECT id,aula_id,nome,arquivo_path,tipo,ordem,status FROM import_materiais WHERE true ON CONFLICT(id) DO NOTHING;

-- Retorna um objeto JSONB com os totais publicados e a quantidade de arquivos verificados.
RETURN jsonb_build_object(
  -- Inicia o objeto que reúne os totais das tabelas de conteúdo.
  'counts',jsonb_build_object(
    -- Inclui a contagem de os cursos do catálogo no retorno da importação.
    'catalogo',(SELECT count(*) FROM public.catalogo),
    -- Inclui a contagem de os módulos dos cursos no retorno da importação.
    'modulos',(SELECT count(*) FROM public.modulos),
    -- Inclui a contagem de as aulas dos módulos no retorno da importação.
    'aulas',(SELECT count(*) FROM public.aulas),
    -- Inclui a contagem de os slides das aulas no retorno da importação.
    'slides',(SELECT count(*) FROM public.slides),
    -- Inclui a contagem de os materiais das aulas no retorno da importação.
    'materiais',(SELECT count(*) FROM public.materiais)
  -- Encerra a chamada ou a estrutura JSONB iniciada acima.
  ),
  -- Inclui no resultado a quantidade de arquivos conferidos na tabela temporária.
  'verified_files',(SELECT count(*) FROM import_files)
-- Encerra a chamada ou a estrutura JSONB iniciada acima.
);

-- Encerra o bloco de instruções atual.
END;
-- Fecha o corpo literal da função temporária.
$import_rpc$;
-- Remove a permissão de execução da função para os papéis públicos e de usuários comuns.
REVOKE ALL ON FUNCTION public.praxis_import_drive_20261009(jsonb) FROM PUBLIC,anon,authenticated;
-- Autoriza somente service_role a executar a função de importação temporária.
GRANT EXECUTE ON FUNCTION public.praxis_import_drive_20261009(jsonb) TO service_role;
-- Inicia a criação condicional da política de leitura dos materiais para usuários autenticados.
DO $policy$
-- Inicia o bloco de instruções da função ou da verificação.
BEGIN
  -- Verifica se a política de leitura autenticada de materiais ainda precisa ser criada.
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Praxis: leitura de materiais autenticada') THEN
    -- Permite a leitura dos objetos do bucket materiais para o papel authenticated.
    CREATE POLICY "Praxis: leitura de materiais autenticada" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='materiais');
  -- Encerra a verificação condicional atual.
  END IF;
-- Encerra o bloco de verificação e seu corpo delimitado por dólar.
END $policy$;

-- Solicita ao PostgREST a atualização do cache do esquema do banco.
NOTIFY pgrst,'reload schema';
-- Confirma as alterações da transação após as verificações.
COMMIT;
-- Inicia a conferência do nome e do modo de segurança da função temporária.
SELECT p.proname, p.prosecdef AS security_definer,
  -- Confere se o papel anon possui permissão de execução da função.
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
  -- Confere se o papel authenticated possui permissão de execução da função.
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
  -- Confere se o papel service_role possui permissão de execução da função.
  has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
-- Consulta as funções e os esquemas no catálogo interno do PostgreSQL.
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- Restringe a conferência à função de importação no esquema public.
WHERE n.nspname='public' AND p.proname='praxis_import_drive_20261009';
