"""Validate source coverage and preserve the IDs used by student progress."""  # Documenta o propósito deste módulo ou desta função.
import json  # Importa json.
import importlib.util  # Importa importlib.util.
from pathlib import Path  # Importa Path de pathlib.

ROOT=Path(__file__).resolve().parent  # Define ROOT como Path(__file__).resolve().parent.
spec=importlib.util.spec_from_file_location('storage_layout',ROOT/'storage-layout.py')  # Define spec como o resultado de importlib.util.spec_from_file_location com o texto “storage_layout” e o resultado da expressão ROOT / 'storage-layout.py'.
layout=importlib.util.module_from_spec(spec)  # Define layout como o resultado de importlib.util.module_from_spec com spec.
spec.loader.exec_module(layout)  # Executa o resultado de spec.loader.exec_module com layout.
drive=json.loads((ROOT/'drive-inventory.json').read_text(encoding='utf-8'))  # Define drive como os dados interpretados do JSON o conteúdo textual do arquivo ROOT / 'drive-inventory.json'.
before=json.loads((ROOT/'supabase-before.json').read_text(encoding='utf-8-sig'))  # Define before como os dados interpretados do JSON o conteúdo textual do arquivo ROOT / 'supabase-before.json'.
plan=json.loads((ROOT/'import-plan.json').read_text(encoding='utf-8'))  # Define plan como os dados interpretados do JSON o conteúdo textual do arquivo ROOT / 'import-plan.json'.
source_ids={x['id'] for x in drive['items'] if x['mime_type']!='application/vnd.google-apps.folder'}  # Define source_ids como uma coleção calculada percorrendo drive['items'].
assert source_ids=={x['drive_id'] for x in plan['links']},'A source file has no destination'  # Confere source_ids == {x['drive_id'] for x in plan['links']}, interrompendo o programa se a condição for falsa.
assert len(plan['links'])==len(source_ids),'A source file is assigned twice'  # Confere len(plan['links']) == len(source_ids), interrompendo o programa se a condição for falsa.
source_files={x['id']:x for x in drive['items'] if x['id'] in source_ids}  # Define source_files como uma coleção calculada percorrendo drive['items'].
for link in plan['links']:  # Percorre plan['links'] usando link a cada iteração.
    source=source_files[link['drive_id']]  # Define source como source_files[link['drive_id']].
    assert link['source']==source['path'],'Source path changed'  # Confere link['source'] == source['path'], interrompendo o programa se a condição for falsa.
    assert link['path']==layout.storage_path(source['path']),'Drive hierarchy or original filename lost'  # Confere link['path'] == layout.storage_path(source['path']), interrompendo o programa se a condição for falsa.
assert len({(x['bucket'],x['path']) for x in plan['links']})==len(plan['links']),'Normalized source names collide'  # Confere len({(x['bucket'], x['path']) for x in plan['links']}) == len(plan['links']), interrompendo o programa se a condição for falsa.
tables={'catalogo':plan['courses'],'modulos':[c['module'] for c in plan['courses']],  # Define tables como um dicionário com as chaves 'catalogo', 'modulos', 'aulas', 'slides', 'materiais'.
        'aulas':[l for c in plan['courses'] for l in c['lessons']],  # Fornece o texto “aulas” à expressão.
        'slides':[s for c in plan['courses'] for l in c['lessons'] for s in l['slides']],  # Fornece o texto “slides” à expressão.
        'materiais':[m for c in plan['courses'] for l in c['lessons'] for m in l['materials']]}  # Fornece o texto “materiais” à expressão.
ids={t:{r['id'] for r in rows} for t,rows in tables.items()}  # Define ids como uma coleção calculada percorrendo tables.items().
for table,rows in tables.items():  # Percorre os pares de chave e valor do dicionário usando (table, rows) a cada iteração.
    assert len(rows)==len(ids[table]),f'Duplicate {table} IDs'  # Confere len(rows) == len(ids[table]), interrompendo o programa se a condição for falsa.
    assert {r['id'] for r in before.get(table) or []}.issubset(ids[table]),f'An existing {table} ID was lost'  # Confere {r['id'] for r in before.get(table) or []}.issubset(ids[table]), interrompendo o programa se a condição for falsa.
for table,column,parent in [('modulos','curso_id','catalogo'),('aulas','modulo_id','modulos'),('slides','aula_id','aulas'),('materiais','aula_id','aulas')]:  # Percorre uma coleção com 4 elementos usando (table, column, parent) a cada iteração.
    assert all(r[column] in ids[parent] for r in tables[table]),f'Invalid {table} reference'  # Confere all((r[column] in ids[parent] for r in tables[table])), interrompendo o programa se a condição for falsa.
assert len({(r['aula_id'],r['ordem']) for r in tables['slides']})==len(tables['slides']),'Duplicate slide order'  # Confere len({(r['aula_id'], r['ordem']) for r in tables['slides']}) == len(tables['slides']), interrompendo o programa se a condição for falsa.
destinations={(x['bucket'],x['target']) for x in plan['uploads']}  # Define destinations como uma coleção calculada percorrendo plan['uploads'].
assert len(destinations)==len(plan['uploads']),'Duplicate file destination'  # Confere len(destinations) == len(plan['uploads']), interrompendo o programa se a condição for falsa.
assert not any(x['type']=='archive_pending_verification' for x in plan['issues']),'Unverified Excel archive'  # Confere not any((x['type'] == 'archive_pending_verification' for x in plan['issues'])), interrompendo o programa se a condição for falsa.
if (ROOT/'upload-receipts.json').exists():  # Verifica (ROOT / 'upload-receipts.json').exists() para decidir se executa o bloco.
    receipts=json.loads((ROOT/'upload-receipts.json').read_text(encoding='utf-8'))  # Define receipts como os dados interpretados do JSON o conteúdo textual do arquivo ROOT / 'upload-receipts.json'.
    for upload in plan['uploads']:  # Percorre plan['uploads'] usando upload a cada iteração.
        receipt=receipts.get(upload['id'])  # Define receipt como o valor da chave upload['id'], usando a alternativa se necessário.
        if receipt:  # Verifica receipt para decidir se executa o bloco.
            assert receipt['size']==upload['size'] and receipt['path']==upload['target']  # Confere receipt['size'] == upload['size'] and receipt['path'] == upload['target'], interrompendo o programa se a condição for falsa.
report={'source_files':len(source_ids),'courses':len(tables['catalogo']),'lessons':len(tables['aulas']),  # Define report como um dicionário com as chaves 'source_files', 'courses', 'lessons', 'drive_hierarchy_and_names_preserved', 'slides'.
        'drive_hierarchy_and_names_preserved':True,  # Fornece o texto “drive_hierarchy_and_names_preserved” à expressão.
        'slides':len(tables['slides']),'materials':len(tables['materiais']),  # Obtém ou executa a quantidade de itens de tables['slides'].
        'uploads':len(plan['uploads']),'source_gaps':[x for x in plan['issues'] if x['type']=='course_source_gap'],  # Obtém ou executa a quantidade de itens de plan['uploads'].
        'preserved_existing_ids':{t:len(before.get(t) or []) for t in tables}}  # Obtém ou executa a quantidade de itens de o resultado da expressão before.get(t) or [].
(ROOT/'audit-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')  # Executa a gravação do texto em ROOT / 'audit-report.json'.
print(json.dumps(report,ensure_ascii=False,indent=2))  # Executa a exibição de a serialização de report para JSON na saída do programa.
