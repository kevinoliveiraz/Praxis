"""Generate an atomic, repeatable migration from the reviewed import plan."""
import json
from pathlib import Path
from urllib.parse import quote

ROOT=Path(__file__).resolve().parent
plan=json.loads((ROOT/'import-plan.json').read_text(encoding='utf-8'))
before=json.loads((ROOT/'supabase-before.json').read_text(encoding='utf-8-sig'))
tables={t:[] for t in ('catalogo','modulos','aulas','slides','materiais')}
for course in plan['courses']:
    catalog={k:course[k] for k in ('id','nome','categoria','descricao','ordem_exibicao')}
    catalog['status']='publicado'
    catalog['imagem_capa_url']='https://fxpmeosnnrgqdelffnvy.supabase.co/storage/v1/object/public/storage%20capas/'+quote(course['cover_path'],safe='/')
    if course['id']==4:
        catalog.update(nome='Power BI',categoria='power-bi',descricao='Power BI na prática')
    tables['catalogo'].append(catalog)
    tables['modulos'].append({k:v for k,v in course['module'].items() if k!='existing'})
    for lesson in course['lessons']:
        tables['aulas'].append({k:lesson[k] for k in ('id','modulo_id','nome','descricao','ordem','status')})
        tables['slides'].extend({k:slide[k] for k in ('id','aula_id','titulo','imagem_path','ordem','status')} for slide in lesson['slides'])
        tables['materiais'].extend({k:material[k] for k in ('id','aula_id','nome','arquivo_path','tipo','ordem','status')} for material in lesson['materials'])
files={(u['bucket'],u['target']):u['size'] for u in plan['uploads']}
for table,column,bucket in (('slides','imagem_path','slides'),('materiais','arquivo_path','materiais')):
    for row in tables[table]:
        path=row[column]
        if (bucket,path) not in files:
            match=next(x for x in before['objects'] if x['bucket']==bucket and x['name']==path)
            files[(bucket,path)]=int(match['size'])
for course in plan['courses']:
    path=course['cover_path']
    if ('storage capas',path) not in files:
        match=next(x for x in before['objects'] if x['bucket']=='storage capas' and x['name']==path)
        files[('storage capas',path)]=int(match['size'])
sql=["-- Praxis: importação do Drive. Gerada a partir dos inventários verificados.",
     "-- Preserva IDs existentes e progresso dos alunos; não remove registros.",
     "BEGIN;", "SET LOCAL lock_timeout = '10s';", "SET LOCAL statement_timeout = '120s';",
     "LOCK TABLE public.catalogo,public.modulos,public.aulas,public.slides,public.materiais IN SHARE ROW EXCLUSIVE MODE;",
     "CREATE TEMP TABLE import_files(bucket text,path text,size bigint) ON COMMIT DROP;"]
rows=[{'bucket':b,'path':p,'size':s} for (b,p),s in sorted(files.items())]
sql.append("INSERT INTO import_files SELECT * FROM jsonb_to_recordset($files$"+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+"$files$::jsonb) AS x(bucket text,path text,size bigint);")
sql.append("""DO $verify$
BEGIN
  IF EXISTS (SELECT 1 FROM import_files f LEFT JOIN storage.objects o ON o.bucket_id=f.bucket AND o.name=f.path WHERE o.id IS NULL OR (o.metadata->>'size')::bigint<>f.size) THEN
    RAISE EXCEPTION 'Importação interrompida: arquivo ausente ou tamanho diferente no Storage.';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='materiais' AND public=false) THEN
    RAISE EXCEPTION 'O bucket materiais deve existir e permanecer privado.';
  END IF;
END $verify$;""")
for table,rows in tables.items():
    keys=list(rows[0])
    definitions=','.join(k+(' bigint' if k=='id' or k.endswith('_id') else ' integer' if k in ('ordem','ordem_exibicao') else ' text') for k in keys)
    sql.append(f'CREATE TEMP TABLE import_{table}({definitions}) ON COMMIT DROP;')
    payload=json.dumps(rows,ensure_ascii=False,separators=(',',':'))
    sql.append(f'INSERT INTO import_{table} SELECT * FROM jsonb_to_recordset($payload${payload}$payload$::jsonb) AS x({definitions});')
    existing_ids=','.join(str(r['id']) for r in before.get(table) or []) or '-1'
    # New numeric IDs may only be reused when they already contain this exact import row.
    comparisons=' OR '.join(f't.{k} IS DISTINCT FROM s.{k}' for k in keys if k!='id')
    sql.append(f"DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM public.{table} t JOIN import_{table} s USING(id) WHERE t.id NOT IN ({existing_ids}) AND ({comparisons})) THEN RAISE EXCEPTION 'Conflito de IDs na tabela {table}; nenhum cadastro foi publicado.'; END IF; END $guard$;")
    if table=='catalogo': update='nome=EXCLUDED.nome,categoria=EXCLUDED.categoria,descricao=EXCLUDED.descricao,imagem_capa_url=EXCLUDED.imagem_capa_url'
    elif table=='slides': update='titulo=EXCLUDED.titulo,imagem_path=EXCLUDED.imagem_path,ordem=EXCLUDED.ordem,status=EXCLUDED.status'
    else: update=None
    action='DO UPDATE SET '+update if update else 'DO NOTHING'
    columns=','.join(keys)
    sql.append(f'INSERT INTO public.{table}({columns}) SELECT {columns} FROM import_{table} WHERE true ON CONFLICT(id) {action};')
    sql.append(f"SELECT setval('public.{table}_id_seq',greatest((SELECT last_value FROM public.{table}_id_seq),(SELECT max(id) FROM public.{table})),true);")
sql.append("""DO $policy$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Praxis: leitura de materiais autenticada') THEN
    CREATE POLICY "Praxis: leitura de materiais autenticada" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='materiais');
  END IF;
END $policy$;
COMMIT;
SELECT c.id,c.nome,
  (SELECT count(*) FROM public.modulos m WHERE m.curso_id=c.id AND m.status='publicado') AS modulos,
  (SELECT count(*) FROM public.aulas a JOIN public.modulos m ON m.id=a.modulo_id WHERE m.curso_id=c.id AND a.status='publicado') AS aulas,
  (SELECT count(*) FROM public.slides s JOIN public.aulas a ON a.id=s.aula_id JOIN public.modulos m ON m.id=a.modulo_id WHERE m.curso_id=c.id AND s.status='publicado') AS slides,
  (SELECT count(*) FROM public.materiais mt JOIN public.aulas a ON a.id=mt.aula_id JOIN public.modulos m ON m.id=a.modulo_id WHERE m.curso_id=c.id AND mt.status='publicado') AS materiais
FROM public.catalogo c ORDER BY c.ordem_exibicao,c.id;
""")
(ROOT/'import-content.sql').write_text('\n'.join(sql).rstrip()+'\n',encoding='utf-8')
print(json.dumps({'rows':{t:len(r) for t,r in tables.items()},'verified_files_required':len(files),'sql_bytes':(ROOT/'import-content.sql').stat().st_size}))
