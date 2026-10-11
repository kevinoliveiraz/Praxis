-- Sincroniza a sequência de IDs de os cursos do catálogo com o maior ID atual sem reduzir o contador existente.
SELECT setval('public.catalogo_id_seq',greatest((SELECT last_value FROM public.catalogo_id_seq),(SELECT max(id) FROM public.catalogo)),true);
-- Sincroniza a sequência de IDs de os módulos dos cursos com o maior ID atual sem reduzir o contador existente.
SELECT setval('public.modulos_id_seq',greatest((SELECT last_value FROM public.modulos_id_seq),(SELECT max(id) FROM public.modulos)),true);
-- Sincroniza a sequência de IDs de as aulas dos módulos com o maior ID atual sem reduzir o contador existente.
SELECT setval('public.aulas_id_seq',greatest((SELECT last_value FROM public.aulas_id_seq),(SELECT max(id) FROM public.aulas)),true);
-- Sincroniza a sequência de IDs de os slides das aulas com o maior ID atual sem reduzir o contador existente.
SELECT setval('public.slides_id_seq',greatest((SELECT last_value FROM public.slides_id_seq),(SELECT max(id) FROM public.slides)),true);
-- Sincroniza a sequência de IDs de os materiais das aulas com o maior ID atual sem reduzir o contador existente.
SELECT setval('public.materiais_id_seq',greatest((SELECT last_value FROM public.materiais_id_seq),(SELECT max(id) FROM public.materiais)),true);
-- Remove a função temporária de importação depois da publicação verificada.
DROP FUNCTION public.praxis_import_drive_20261009(jsonb);
-- Solicita ao PostgREST a atualização do cache do esquema do banco.
NOTIFY pgrst,'reload schema';
