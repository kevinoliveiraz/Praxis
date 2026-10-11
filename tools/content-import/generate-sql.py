"""Generate an atomic, repeatable migration from the reviewed import plan."""  # Documenta o propósito deste módulo ou desta função.
import json  # Importa json.
from pathlib import Path  # Importa Path de pathlib.
from urllib.parse import quote  # Importa quote de urllib.parse.

ROOT=Path(__file__).resolve().parent  # Define ROOT como Path(__file__).resolve().parent.
plan=json.loads((ROOT/'import-plan.json').read_text(encoding='utf-8'))  # Define plan como os dados interpretados do JSON o conteúdo textual do arquivo ROOT / 'import-plan.json'.
before=json.loads((ROOT/'supabase-before.json').read_text(encoding='utf-8-sig'))  # Define before como os dados interpretados do JSON o conteúdo textual do arquivo ROOT / 'supabase-before.json'.
layout=json.loads((ROOT/'storage-layout-plan.json').read_text(encoding='utf-8'))  # Define layout como os dados interpretados do JSON o conteúdo textual do arquivo ROOT / 'storage-layout-plan.json'.
organized_sizes={(m['bucket'],m['target']):m['size'] for m in layout['moves']}  # Define organized_sizes como uma coleção calculada percorrendo layout['moves'].
tables={t:[] for t in ('catalogo','modulos','aulas','slides','materiais')}  # Define tables como uma coleção calculada percorrendo ('catalogo', 'modulos', 'aulas', 'slides', 'materiais').
for course in plan['courses']:  # Percorre plan['courses'] usando course a cada iteração.
    catalog={k:course[k] for k in ('id','nome','categoria','descricao','ordem_exibicao')}  # Define catalog como uma coleção calculada percorrendo ('id', 'nome', 'categoria', 'descricao', 'ordem_exibicao').
    catalog['status']='publicado'  # Define catalog['status'] como o texto “publicado”.
    catalog['imagem_capa_url']='https://fxpmeosnnrgqdelffnvy.supabase.co/storage/v1/object/public/storage%20capas/'+quote(course['cover_path'],safe='/')  # Define catalog['imagem_capa_url'] como o resultado da expressão 'https://fxpmeosnnrgqdelffnvy.supabase.co/storage/v1/object/public/storage%20capas/' + quote(course['cover_path'], safe='/').
    if course['id']==4:  # Verifica course['id'] == 4 para decidir se executa o bloco.
        catalog.update(nome='Power BI',categoria='power-bi',descricao='Power BI na prática')  # Executa a atualização dos valores da coleção.
    tables['catalogo'].append(catalog)  # Executa a inclusão de catalog no final da lista.
    tables['modulos'].append({k:v for k,v in course['module'].items() if k!='existing'})  # Executa a inclusão de uma coleção calculada percorrendo course['module'].items() no final da lista.
    for lesson in course['lessons']:  # Percorre course['lessons'] usando lesson a cada iteração.
        tables['aulas'].append({k:lesson[k] for k in ('id','modulo_id','nome','descricao','ordem','status')})  # Executa a inclusão de uma coleção calculada percorrendo ('id', 'modulo_id', 'nome', 'descricao', 'ordem', 'status') no final da lista.
        tables['slides'].extend({k:slide[k] for k in ('id','aula_id','titulo','imagem_path','ordem','status')} for slide in lesson['slides'])  # Executa a inclusão dos itens de uma coleção calculada percorrendo lesson['slides'] na lista.
        tables['materiais'].extend({k:material[k] for k in ('id','aula_id','nome','arquivo_path','tipo','ordem','status')} for material in lesson['materials'])  # Executa a inclusão dos itens de uma coleção calculada percorrendo lesson['materials'] na lista.
files={(u['bucket'],u['target']):u['size'] for u in plan['uploads']}  # Define files como uma coleção calculada percorrendo plan['uploads'].
for table,column,bucket in (('slides','imagem_path','slides'),('materiais','arquivo_path','materiais')):  # Percorre uma coleção com 2 elementos usando (table, column, bucket) a cada iteração.
    for row in tables[table]:  # Percorre tables[table] usando row a cada iteração.
        path=row[column]  # Define path como row[column].
        if (bucket,path) not in files:  # Verifica (bucket, path) not in files para decidir se executa o bloco.
            files[(bucket,path)]=organized_sizes[(bucket,path)]  # Define files[bucket, path] como organized_sizes[bucket, path].
for course in plan['courses']:  # Percorre plan['courses'] usando course a cada iteração.
    path=course['cover_path']  # Define path como course['cover_path'].
    if ('storage capas',path) not in files:  # Verifica ('storage capas', path) not in files para decidir se executa o bloco.
        files[('storage capas',path)]=organized_sizes[('storage capas',path)]  # Define files['storage capas', path] como organized_sizes['storage capas', path].
sql=["-- Praxis: importação do Drive. Gerada a partir dos inventários verificados.",  # Define sql como uma coleção com 7 elementos.
     "-- Preserva IDs existentes e progresso dos alunos; não remove registros.",  # Fornece o texto “-- Preserva IDs existentes e progresso dos alunos; não remove registros.” à expressão.
     "BEGIN;", "SET LOCAL lock_timeout = '10s';", "SET LOCAL statement_timeout = '120s';",  # Fornece o texto “BEGIN;” à expressão.
     "LOCK TABLE public.catalogo,public.modulos,public.aulas,public.slides,public.materiais IN SHARE ROW EXCLUSIVE MODE;",  # Fornece o texto “LOCK TABLE public.catalogo,public.modulos,public.aulas,public.slides,public.materiai…” à expressão.
     "CREATE TEMP TABLE import_files(bucket text,path text,size bigint) ON COMMIT DROP;"]  # Fornece o texto “CREATE TEMP TABLE import_files(bucket text,path text,size bigint) ON COMMIT DROP;” à expressão.
rows=[{'bucket':b,'path':p,'size':s} for (b,p),s in sorted(files.items())]  # Define rows como uma coleção calculada percorrendo sorted(files.items()).
sql.append("INSERT INTO import_files SELECT * FROM jsonb_to_recordset($files$"+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+"$files$::jsonb) AS x(bucket text,path text,size bigint);")  # Executa a inclusão de o resultado da expressão 'INSERT INTO import_files SELECT * FROM jsonb_to_recordset($files$' + json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + '$files$::js… no final da lista.
# Explicações do trecho literal abaixo, sem alterar seu conteúdo:
# Linha 1 do trecho: Executa a inclusão de o texto “DO $verify$ BEGIN IF EXISTS (SELECT 1 FROM import_files f LEFT JOIN storage.objects …” no final da lista.
# Linha 2 do trecho: Inclui no SQL gerado: Inicia o bloco de instruções da função ou da verificação.
# Linha 3 do trecho: Inclui no SQL gerado: Verifica se algum arquivo do plano está ausente no Storage ou tem tamanho diferente.
# Linha 4 do trecho: Inclui no SQL gerado: Interrompe a transação com a mensagem indicada quando a verificação de segurança falha.
# Linha 5 do trecho: Inclui no SQL gerado: Encerra a verificação condicional atual.
# Linha 6 do trecho: Inclui no SQL gerado: Verifica se o bucket materiais existe e permanece privado.
# Linha 7 do trecho: Inclui no SQL gerado: Interrompe a transação com a mensagem indicada quando a verificação de segurança falha.
# Linha 8 do trecho: Inclui no SQL gerado: Encerra a verificação condicional atual.
# Linha 9 do trecho: Fornece o texto “DO $verify$ BEGIN IF EXISTS (SELECT 1 FROM import_files f LEFT JOIN storage.objects …” à expressão.
sql.append("""DO $verify$
BEGIN
  IF EXISTS (SELECT 1 FROM import_files f LEFT JOIN storage.objects o ON o.bucket_id=f.bucket AND o.name=f.path WHERE o.id IS NULL OR (o.metadata->>'size')::bigint<>f.size) THEN
    RAISE EXCEPTION 'Importação interrompida: arquivo ausente ou tamanho diferente no Storage.';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='materiais' AND public=false) THEN
    RAISE EXCEPTION 'O bucket materiais deve existir e permanecer privado.';
  END IF;
END $verify$;""")
for table,rows in tables.items():  # Percorre os pares de chave e valor do dicionário usando (table, rows) a cada iteração.
    keys=list(rows[0])  # Define keys como o resultado de list com rows[0].
    definitions=','.join(k+(' bigint' if k=='id' or k.endswith('_id') else ' integer' if k in ('ordem','ordem_exibicao') else ' text') for k in keys)  # Define definitions como a união dos trechos de texto com o separador definido.
    sql.append(f'CREATE TEMP TABLE import_{table}({definitions}) ON COMMIT DROP;')  # Executa a inclusão de um texto formatado com os valores das expressões embutidas no final da lista.
    payload=json.dumps(rows,ensure_ascii=False,separators=(',',':'))  # Define payload como a serialização de rows para JSON.
    sql.append(f'INSERT INTO import_{table} SELECT * FROM jsonb_to_recordset($payload${payload}$payload$::jsonb) AS x({definitions});')  # Executa a inclusão de um texto formatado com os valores das expressões embutidas no final da lista.
    existing_ids=','.join(str(r['id']) for r in before.get(table) or []) or '-1'  # Define existing_ids como o resultado da expressão ','.join((str(r['id']) for r in before.get(table) or [])) or '-1'.
    # New numeric IDs may only be reused when they already contain this exact import row.
    comparisons=' OR '.join(f't.{k} IS DISTINCT FROM s.{k}' for k in keys if k!='id')  # Define comparisons como a união dos trechos de texto com o separador definido.
    sql.append(f"DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM public.{table} t JOIN import_{table} s USING(id) WHERE t.id NOT IN ({existing_ids}) AND ({comparisons})) THEN RAISE EXCEPTION 'Conflito de IDs na tabela {table}; nenhum cadastro foi publicado.'; END IF; END $guard$;")  # Executa a inclusão de um texto formatado com os valores das expressões embutidas no final da lista.
    if table=='catalogo': update='nome=EXCLUDED.nome,categoria=EXCLUDED.categoria,descricao=EXCLUDED.descricao,imagem_capa_url=EXCLUDED.imagem_capa_url'  # Define update como o texto “nome=EXCLUDED.nome,categoria=EXCLUDED.categoria,descricao=EXCLUDED.descricao,imagem_…”.
    elif table=='slides': update='titulo=EXCLUDED.titulo,imagem_path=EXCLUDED.imagem_path,ordem=EXCLUDED.ordem,status=EXCLUDED.status'  # Define update como o texto “titulo=EXCLUDED.titulo,imagem_path=EXCLUDED.imagem_path,ordem=EXCLUDED.ordem,status=…”.
    else: update=None  # Executa a alternativa quando a condição anterior não foi atendida.
    action='DO UPDATE SET '+update if update else 'DO NOTHING'  # Define action como o resultado da expressão 'DO UPDATE SET ' + update quando update; caso contrário, o texto “DO NOTHING”.
    columns=','.join(keys)  # Define columns como a união dos trechos de texto com o separador definido.
    sql.append(f'INSERT INTO public.{table}({columns}) SELECT {columns} FROM import_{table} WHERE true ON CONFLICT(id) {action};')  # Executa a inclusão de um texto formatado com os valores das expressões embutidas no final da lista.
    sql.append(f"SELECT setval('public.{table}_id_seq',greatest((SELECT last_value FROM public.{table}_id_seq),(SELECT max(id) FROM public.{table})),true);")  # Executa a inclusão de um texto formatado com os valores das expressões embutidas no final da lista.
# Explicações do trecho literal abaixo, sem alterar seu conteúdo:
# Linha 1 do trecho: Executa a inclusão de o texto “DO $policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage'…” no final da lista.
# Linha 2 do trecho: Inclui no SQL gerado: Inicia o bloco de instruções da função ou da verificação.
# Linha 3 do trecho: Inclui no SQL gerado: Verifica se a política de leitura autenticada de materiais ainda precisa ser criada.
# Linha 4 do trecho: Inclui no SQL gerado: Permite a leitura dos objetos do bucket materiais para o papel authenticated.
# Linha 5 do trecho: Inclui no SQL gerado: Encerra a verificação condicional atual.
# Linha 6 do trecho: Inclui no SQL gerado: Encerra o bloco de verificação e seu corpo delimitado por dólar.
# Linha 7 do trecho: Inclui no SQL gerado: Confirma as alterações da transação após as verificações.
# Linha 8 do trecho: Inclui no SQL gerado: Inicia o relatório de cursos e das quantidades de conteúdo publicadas.
# Linha 9 do trecho: Compõe o texto “(SELECT count(*) FROM public.modulos m WHERE m.curso_id=c.id AND m.status='publicado') AS modulos,” dentro do valor multilinha.
# Linha 10 do trecho: Compõe o texto “(SELECT count(*) FROM public.aulas a JOIN public.modulos m ON m.id=a.modulo_id WHERE m.curso_id=c.id AND a.status='publicado') AS aulas,” dentro do valor multilinha.
# Linha 11 do trecho: Compõe o texto “(SELECT count(*) FROM public.slides s JOIN public.aulas a ON a.id=s.aula_id JOIN public.modulos m ON m.id=a.modulo_id WHERE m.curso_id=c.id AND s.status='publi…” dentro do valor multilinha.
# Linha 12 do trecho: Compõe o texto “(SELECT count(*) FROM public.materiais mt JOIN public.aulas a ON a.id=mt.aula_id JOIN public.modulos m ON m.id=a.modulo_id WHERE m.curso_id=c.id AND mt.status=…” dentro do valor multilinha.
# Linha 13 do trecho: Inclui no SQL gerado: Lê os cursos do catálogo e os ordena pela ordem de exibição e pelo ID.
# Linha 14 do trecho: Fornece o texto “DO $policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage'…” à expressão.
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
(ROOT/'import-content.sql').write_text('\n'.join(sql).rstrip()+'\n',encoding='utf-8')  # Executa a gravação do texto em ROOT / 'import-content.sql'.
print(json.dumps({'rows':{t:len(r) for t,r in tables.items()},'verified_files_required':len(files),'sql_bytes':(ROOT/'import-content.sql').stat().st_size}))  # Executa a exibição de a serialização de um dicionário com as chaves 'rows', 'verified_files_required', 'sql_bytes' para JSON na saída do programa.
