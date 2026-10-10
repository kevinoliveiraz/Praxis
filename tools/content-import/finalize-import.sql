SELECT setval('public.catalogo_id_seq',greatest((SELECT last_value FROM public.catalogo_id_seq),(SELECT max(id) FROM public.catalogo)),true);
SELECT setval('public.modulos_id_seq',greatest((SELECT last_value FROM public.modulos_id_seq),(SELECT max(id) FROM public.modulos)),true);
SELECT setval('public.aulas_id_seq',greatest((SELECT last_value FROM public.aulas_id_seq),(SELECT max(id) FROM public.aulas)),true);
SELECT setval('public.slides_id_seq',greatest((SELECT last_value FROM public.slides_id_seq),(SELECT max(id) FROM public.slides)),true);
SELECT setval('public.materiais_id_seq',greatest((SELECT last_value FROM public.materiais_id_seq),(SELECT max(id) FROM public.materiais)),true);
DROP FUNCTION public.praxis_import_drive_20261009(jsonb);
NOTIFY pgrst,'reload schema';
