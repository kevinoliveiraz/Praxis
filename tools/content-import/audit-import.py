"""Validate source coverage and preserve the IDs used by student progress."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
drive=json.loads((ROOT/'drive-inventory.json').read_text(encoding='utf-8'))
before=json.loads((ROOT/'supabase-before.json').read_text(encoding='utf-8-sig'))
plan=json.loads((ROOT/'import-plan.json').read_text(encoding='utf-8'))
source_ids={x['id'] for x in drive['items'] if x['mime_type']!='application/vnd.google-apps.folder'}
assert source_ids=={x['drive_id'] for x in plan['links']},'A source file has no destination'
assert len(plan['links'])==len(source_ids),'A source file is assigned twice'
tables={'catalogo':plan['courses'],'modulos':[c['module'] for c in plan['courses']],
        'aulas':[l for c in plan['courses'] for l in c['lessons']],
        'slides':[s for c in plan['courses'] for l in c['lessons'] for s in l['slides']],
        'materiais':[m for c in plan['courses'] for l in c['lessons'] for m in l['materials']]}
ids={t:{r['id'] for r in rows} for t,rows in tables.items()}
for table,rows in tables.items():
    assert len(rows)==len(ids[table]),f'Duplicate {table} IDs'
    assert {r['id'] for r in before.get(table) or []}.issubset(ids[table]),f'An existing {table} ID was lost'
for table,column,parent in [('modulos','curso_id','catalogo'),('aulas','modulo_id','modulos'),('slides','aula_id','aulas'),('materiais','aula_id','aulas')]:
    assert all(r[column] in ids[parent] for r in tables[table]),f'Invalid {table} reference'
assert len({(r['aula_id'],r['ordem']) for r in tables['slides']})==len(tables['slides']),'Duplicate slide order'
destinations={(x['bucket'],x['target']) for x in plan['uploads']}
assert len(destinations)==len(plan['uploads']),'Duplicate file destination'
assert not any(x['type']=='archive_pending_verification' for x in plan['issues']),'Unverified Excel archive'
if (ROOT/'upload-receipts.json').exists():
    receipts=json.loads((ROOT/'upload-receipts.json').read_text(encoding='utf-8'))
    for upload in plan['uploads']:
        receipt=receipts.get(upload['id'])
        if receipt:
            assert receipt['size']==upload['size'] and receipt['path']==upload['target']
report={'source_files':len(source_ids),'courses':len(tables['catalogo']),'lessons':len(tables['aulas']),
        'slides':len(tables['slides']),'materials':len(tables['materiais']),
        'uploads':len(plan['uploads']),'source_gaps':[x for x in plan['issues'] if x['type']=='course_source_gap'],
        'preserved_existing_ids':{t:len(before.get(t) or []) for t in tables}}
(ROOT/'audit-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
