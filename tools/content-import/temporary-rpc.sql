-- Importador temporário: somente service_role; sem SQL fornecido pelo cliente.
BEGIN;
CREATE FUNCTION public.praxis_import_drive_20261009(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp
AS $import_rpc$
BEGIN

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
LOCK TABLE public.catalogo,public.modulos,public.aulas,public.slides,public.materiais IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE import_files(bucket text,path text,size bigint) ON COMMIT DROP;
INSERT INTO import_files SELECT * FROM jsonb_to_recordset(payload->'files') AS x(bucket text,path text,size bigint);
DO $verify$
BEGIN
  IF EXISTS (SELECT 1 FROM import_files f LEFT JOIN storage.objects o ON o.bucket_id=f.bucket AND o.name=f.path WHERE o.id IS NULL OR (o.metadata->>'size')::bigint<>f.size) THEN
    RAISE EXCEPTION 'Importação interrompida: arquivo ausente ou tamanho diferente no Storage.';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='materiais' AND public=false) THEN
    RAISE EXCEPTION 'O bucket materiais deve existir e permanecer privado.';
  END IF;
END $verify$;
CREATE TEMP TABLE import_catalogo(id bigint,nome text,categoria text,descricao text,ordem_exibicao integer,status text,imagem_capa_url text) ON COMMIT DROP;
INSERT INTO import_catalogo SELECT * FROM jsonb_to_recordset(payload->'catalogo') AS x(id bigint,nome text,categoria text,descricao text,ordem_exibicao integer,status text,imagem_capa_url text);
DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM public.catalogo t JOIN import_catalogo s USING(id) WHERE t.id NOT IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15) AND (t.nome IS DISTINCT FROM s.nome OR t.categoria IS DISTINCT FROM s.categoria OR t.descricao IS DISTINCT FROM s.descricao OR t.ordem_exibicao IS DISTINCT FROM s.ordem_exibicao OR t.status IS DISTINCT FROM s.status OR t.imagem_capa_url IS DISTINCT FROM s.imagem_capa_url)) THEN RAISE EXCEPTION 'Conflito de IDs na tabela catalogo; nenhum cadastro foi publicado.'; END IF; END $guard$;
INSERT INTO public.catalogo(id,nome,categoria,descricao,ordem_exibicao,status,imagem_capa_url) SELECT id,nome,categoria,descricao,ordem_exibicao,status,imagem_capa_url FROM import_catalogo WHERE true ON CONFLICT(id) DO UPDATE SET nome=EXCLUDED.nome,categoria=EXCLUDED.categoria,descricao=EXCLUDED.descricao,imagem_capa_url=EXCLUDED.imagem_capa_url;
CREATE TEMP TABLE import_modulos(id bigint,curso_id bigint,nome text,descricao text,ordem integer,status text) ON COMMIT DROP;
INSERT INTO import_modulos SELECT * FROM jsonb_to_recordset(payload->'modulos') AS x(id bigint,curso_id bigint,nome text,descricao text,ordem integer,status text);
DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM public.modulos t JOIN import_modulos s USING(id) WHERE t.id NOT IN (1,2,3,4) AND (t.curso_id IS DISTINCT FROM s.curso_id OR t.nome IS DISTINCT FROM s.nome OR t.descricao IS DISTINCT FROM s.descricao OR t.ordem IS DISTINCT FROM s.ordem OR t.status IS DISTINCT FROM s.status)) THEN RAISE EXCEPTION 'Conflito de IDs na tabela modulos; nenhum cadastro foi publicado.'; END IF; END $guard$;
INSERT INTO public.modulos(id,curso_id,nome,descricao,ordem,status) SELECT id,curso_id,nome,descricao,ordem,status FROM import_modulos WHERE true ON CONFLICT(id) DO NOTHING;
CREATE TEMP TABLE import_aulas(id bigint,modulo_id bigint,nome text,descricao text,ordem integer,status text) ON COMMIT DROP;
INSERT INTO import_aulas SELECT * FROM jsonb_to_recordset(payload->'aulas') AS x(id bigint,modulo_id bigint,nome text,descricao text,ordem integer,status text);
DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM public.aulas t JOIN import_aulas s USING(id) WHERE t.id NOT IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17) AND (t.modulo_id IS DISTINCT FROM s.modulo_id OR t.nome IS DISTINCT FROM s.nome OR t.descricao IS DISTINCT FROM s.descricao OR t.ordem IS DISTINCT FROM s.ordem OR t.status IS DISTINCT FROM s.status)) THEN RAISE EXCEPTION 'Conflito de IDs na tabela aulas; nenhum cadastro foi publicado.'; END IF; END $guard$;
INSERT INTO public.aulas(id,modulo_id,nome,descricao,ordem,status) SELECT id,modulo_id,nome,descricao,ordem,status FROM import_aulas WHERE true ON CONFLICT(id) DO NOTHING;
CREATE TEMP TABLE import_slides(id bigint,aula_id bigint,titulo text,imagem_path text,ordem integer,status text) ON COMMIT DROP;
INSERT INTO import_slides SELECT * FROM jsonb_to_recordset(payload->'slides') AS x(id bigint,aula_id bigint,titulo text,imagem_path text,ordem integer,status text);
DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM public.slides t JOIN import_slides s USING(id) WHERE t.id NOT IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104) AND (t.aula_id IS DISTINCT FROM s.aula_id OR t.titulo IS DISTINCT FROM s.titulo OR t.imagem_path IS DISTINCT FROM s.imagem_path OR t.ordem IS DISTINCT FROM s.ordem OR t.status IS DISTINCT FROM s.status)) THEN RAISE EXCEPTION 'Conflito de IDs na tabela slides; nenhum cadastro foi publicado.'; END IF; END $guard$;
INSERT INTO public.slides(id,aula_id,titulo,imagem_path,ordem,status) SELECT id,aula_id,titulo,imagem_path,ordem,status FROM import_slides WHERE true ON CONFLICT(id) DO UPDATE SET titulo=EXCLUDED.titulo,imagem_path=EXCLUDED.imagem_path,ordem=EXCLUDED.ordem,status=EXCLUDED.status;
CREATE TEMP TABLE import_materiais(id bigint,aula_id bigint,nome text,arquivo_path text,tipo text,ordem integer,status text) ON COMMIT DROP;
INSERT INTO import_materiais SELECT * FROM jsonb_to_recordset(payload->'materiais') AS x(id bigint,aula_id bigint,nome text,arquivo_path text,tipo text,ordem integer,status text);
DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM public.materiais t JOIN import_materiais s USING(id) WHERE t.id NOT IN (-1) AND (t.aula_id IS DISTINCT FROM s.aula_id OR t.nome IS DISTINCT FROM s.nome OR t.arquivo_path IS DISTINCT FROM s.arquivo_path OR t.tipo IS DISTINCT FROM s.tipo OR t.ordem IS DISTINCT FROM s.ordem OR t.status IS DISTINCT FROM s.status)) THEN RAISE EXCEPTION 'Conflito de IDs na tabela materiais; nenhum cadastro foi publicado.'; END IF; END $guard$;
INSERT INTO public.materiais(id,aula_id,nome,arquivo_path,tipo,ordem,status) SELECT id,aula_id,nome,arquivo_path,tipo,ordem,status FROM import_materiais WHERE true ON CONFLICT(id) DO NOTHING;

RETURN jsonb_build_object(
  'counts',jsonb_build_object(
    'catalogo',(SELECT count(*) FROM public.catalogo),
    'modulos',(SELECT count(*) FROM public.modulos),
    'aulas',(SELECT count(*) FROM public.aulas),
    'slides',(SELECT count(*) FROM public.slides),
    'materiais',(SELECT count(*) FROM public.materiais)
  ),
  'verified_files',(SELECT count(*) FROM import_files)
);

END;
$import_rpc$;
REVOKE ALL ON FUNCTION public.praxis_import_drive_20261009(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.praxis_import_drive_20261009(jsonb) TO service_role;
DO $policy$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Praxis: leitura de materiais autenticada') THEN
    CREATE POLICY "Praxis: leitura de materiais autenticada" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='materiais');
  END IF;
END $policy$;

NOTIFY pgrst,'reload schema';
COMMIT;
SELECT p.proname, p.prosecdef AS security_definer,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='praxis_import_drive_20261009';
