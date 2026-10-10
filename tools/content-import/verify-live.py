"""Read back content tables and compare them with the reviewed import payload."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parent
BASE = 'https://fxpmeosnnrgqdelffnvy.supabase.co'
TABLES = ('catalogo', 'modulos', 'aulas', 'slides', 'materiais')

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

parser = argparse.ArgumentParser()
parser.add_argument('key_file', type=Path)
args = parser.parse_args()
key = args.key_file.read_text(encoding='utf-8').strip()
assert key.startswith('sb_secret_')
opener = urllib.request.build_opener(NoRedirect())
after = {}
for table in TABLES:
    req = urllib.request.Request(
        BASE + f'/rest/v1/{table}?select=*&order=id.asc&limit=1000',
        headers={'apikey': key, 'User-Agent': 'Praxis content audit'},
    )
    with opener.open(req, timeout=45) as response:
        after[table] = json.loads(response.read())

payload = json.loads((ROOT / 'import-payload.json').read_text(encoding='utf-8'))['payload']
before = json.loads((ROOT / 'supabase-before.json').read_text(encoding='utf-8-sig'))
for table in TABLES:
    actual = {r['id']: r for r in after[table]}
    expected = {r['id']: r for r in payload[table]}
    assert set(actual) == set(expected), f'Unexpected or missing IDs: {table}'
    for row_id, row in expected.items():
        for column, value in row.items():
            assert actual[row_id][column] == value, f'Value mismatch: {table} {row_id} {column}'
    for old in before.get(table) or []:
        assert old['id'] in actual, f'Existing ID lost: {table}'
        parent = {'modulos': 'curso_id', 'aulas': 'modulo_id', 'slides': 'aula_id', 'materiais': 'aula_id'}.get(table)
        if parent:
            assert old[parent] == actual[old['id']][parent], f'Existing parent changed: {table}'
        old_time = datetime.fromisoformat(old['created_at'].replace('Z', '+00:00'))
        live_time = datetime.fromisoformat(actual[old['id']]['created_at'].replace('Z', '+00:00'))
        assert old_time == live_time, f'Existing timestamp changed: {table}'

assert len({(s['aula_id'], s['ordem']) for s in after['slides']}) == len(after['slides'])
receipts = json.loads((ROOT / 'upload-receipts.json').read_text(encoding='utf-8'))
plan = json.loads((ROOT / 'import-plan.json').read_text(encoding='utf-8'))
assert {u['id'] for u in plan['uploads']} == set(receipts), 'Incomplete upload receipts'
for u in plan['uploads']:
    r = receipts[u['id']]
    assert r['size'] == u['size'] and r['path'] == u['target'] and r['bucket'] == u['bucket']

report = {
    'verified_at': datetime.now(timezone.utc).isoformat(),
    'counts': {t: len(after[t]) for t in TABLES},
    'all_planned_values_match': True,
    'existing_ids_and_parents_preserved': True,
    'duplicate_slide_order': 0,
    'verified_upload_receipts': len(receipts),
    'upload_buckets': dict(Counter(u['bucket'] for u in plan['uploads'])),
    'source_gaps': [x for x in plan['issues'] if x['type'] == 'course_source_gap'],
    'courses': [],
}
for course in after['catalogo']:
    modules = {m['id'] for m in after['modulos'] if m['curso_id'] == course['id']}
    lessons = {a['id'] for a in after['aulas'] if a['modulo_id'] in modules}
    report['courses'].append({
        'id': course['id'], 'nome': course['nome'], 'modulos': len(modules), 'aulas': len(lessons),
        'slides': sum(s['aula_id'] in lessons for s in after['slides']),
        'materiais': sum(m['aula_id'] in lessons for m in after['materiais']),
    })
(ROOT / 'supabase-after.json').write_text(json.dumps(after, ensure_ascii=False, indent=2), encoding='utf-8')
(ROOT / 'live-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({k: v for k, v in report.items() if k != 'courses'}, ensure_ascii=False))
