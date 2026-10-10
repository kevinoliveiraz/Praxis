"""Prepare a restricted, one-use RPC to execute the reviewed migration atomically.

The dashboard's virtual clipboard cannot read a local file. Only the fixed SQL
structure is pasted there; the data is submitted through the official REST API.
The RPC runs with its caller's existing service-role privileges and is removed
after verification. It never accepts executable SQL.
"""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
sql = (ROOT / 'import-content.sql').read_text(encoding='utf-8')
payload = {}

def extract(match):
    table, delimiter, data = match.groups()
    payload[table] = json.loads(data)
    return f"INSERT INTO import_{table} SELECT * FROM jsonb_to_recordset(payload->'{table}')"

body = re.sub(
    r'INSERT INTO import_(\w+) SELECT \* FROM jsonb_to_recordset\(\$(files|payload)\$(.*?)\$\2\$::jsonb\)',
    extract, sql, flags=re.S,
)
assert set(payload) == {'files', 'catalogo', 'modulos', 'aulas', 'slides', 'materiais'}
policy_start = body.index('DO $policy$')
policy_end = body.index('COMMIT;', policy_start)
policy_sql = body[policy_start:policy_end]
body = body[:policy_start]
body = body[body.index('BEGIN;') + len('BEGIN;'):]
sequence_sql = '\n'.join(re.findall(r'^SELECT setval\([^\n]+;', body, flags=re.M))
body = re.sub(r'^SELECT setval\([^\n]+;\n', '', body, flags=re.M)
# The service role can import rows but lacks SELECT on these sequences. Keep
# its grants unchanged; synchronize identity counters in the dashboard instead.
(ROOT / 'finalize-import.sql').write_text(
    sequence_sql + '\nDROP FUNCTION public.praxis_import_drive_20261009(jsonb);\n'
    "NOTIFY pgrst,'reload schema';\n", encoding='utf-8',
)
result = """
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
"""
rpc = """-- Importador temporário: somente service_role; sem SQL fornecido pelo cliente.
BEGIN;
CREATE FUNCTION public.praxis_import_drive_20261009(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp
AS $import_rpc$
BEGIN
""" + body + result + """
END;
$import_rpc$;
REVOKE ALL ON FUNCTION public.praxis_import_drive_20261009(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.praxis_import_drive_20261009(jsonb) TO service_role;
""" + policy_sql + """
NOTIFY pgrst,'reload schema';
COMMIT;
SELECT p.proname, p.prosecdef AS security_definer,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='praxis_import_drive_20261009';
"""
(ROOT / 'temporary-rpc.sql').write_text(rpc, encoding='utf-8')
(ROOT / 'import-payload.json').write_text(json.dumps({'payload': payload}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(json.dumps({'rpc_characters': len(rpc), 'rows': {k: len(v) for k, v in payload.items()}}))
