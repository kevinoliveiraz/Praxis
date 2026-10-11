# Explicações do trecho literal abaixo, sem alterar seu conteúdo:
# Linha 1 do trecho: Documenta o propósito deste módulo ou desta função.
# Linha 3 do trecho: Compõe o texto “The dashboard's virtual clipboard cannot read a local file. Only the fixed SQL” dentro do valor multilinha.
# Linha 4 do trecho: Compõe o texto “structure is pasted there; the data is submitted through the official REST API.” dentro do valor multilinha.
# Linha 5 do trecho: Compõe o texto “The RPC runs with its caller's existing service-role privileges and is removed” dentro do valor multilinha.
# Linha 6 do trecho: Compõe o texto “after verification. It never accepts executable SQL.” dentro do valor multilinha.
# Linha 7 do trecho: Documenta o propósito deste módulo ou desta função.
"""Prepare a restricted, one-use RPC to execute the reviewed migration atomically.

The dashboard's virtual clipboard cannot read a local file. Only the fixed SQL
structure is pasted there; the data is submitted through the official REST API.
The RPC runs with its caller's existing service-role privileges and is removed
after verification. It never accepts executable SQL.
"""
import json  # Importa json.
from pathlib import Path  # Importa Path de pathlib.
import re  # Importa re.

ROOT = Path(__file__).resolve().parent  # Define ROOT como Path(__file__).resolve().parent.
sql = (ROOT / 'import-content.sql').read_text(encoding='utf-8')  # Define sql como o conteúdo textual do arquivo ROOT / 'import-content.sql'.
payload = {}  # Define payload como um dicionário vazio.

def extract(match):  # Declara a função extract com os parâmetros match.
    table, delimiter, data = match.groups()  # Define (table, delimiter, data) como os grupos capturados pela busca.
    payload[table] = json.loads(data)  # Define payload[table] como os dados interpretados do JSON data.
    return f"INSERT INTO import_{table} SELECT * FROM jsonb_to_recordset(payload->'{table}')"  # Retorna um texto formatado com os valores das expressões embutidas.

body = re.sub(  # Define body como a substituição das ocorrências do padrão o texto “INSERT INTO import_(\w+) SELECT \* FROM jsonb_to_recordset\(\$(files|payload)\$(.*?)…”.
    r'INSERT INTO import_(\w+) SELECT \* FROM jsonb_to_recordset\(\$(files|payload)\$(.*?)\$\2\$::jsonb\)',  # Fornece o texto “INSERT INTO import_(\w+) SELECT \* FROM jsonb_to_recordset\(\$(files|payload)\$(.*?)…” à expressão.
    extract, sql, flags=re.S,  # Fornece o argumento flags com re.S.
)  # Encerra a coleção, a chamada ou a expressão iniciada acima.
assert set(payload) == {'files', 'catalogo', 'modulos', 'aulas', 'slides', 'materiais'}  # Confere set(payload) == {'files', 'catalogo', 'modulos', 'aulas', 'slides', 'materiais'}, interrompendo o programa se a condição for falsa.
policy_start = body.index('DO $policy$')  # Define policy_start como o resultado de body.index com o texto “DO $policy$”.
policy_end = body.index('COMMIT;', policy_start)  # Define policy_end como o resultado de body.index com o texto “COMMIT;” e policy_start.
policy_sql = body[policy_start:policy_end]  # Define policy_sql como body[policy_start:policy_end].
body = body[:policy_start]  # Define body como body[:policy_start].
body = body[body.index('BEGIN;') + len('BEGIN;'):]  # Define body como body[body.index('BEGIN;') + len('BEGIN;'):].
sequence_sql = '\n'.join(re.findall(r'^SELECT setval\([^\n]+;', body, flags=re.M))  # Define sequence_sql como a união dos trechos de texto com o separador definido.
body = re.sub(r'^SELECT setval\([^\n]+;\n', '', body, flags=re.M)  # Define body como a substituição das ocorrências do padrão o texto “^SELECT setval\([^\n]+;\n”.
# The service role can import rows but lacks SELECT on these sequences. Keep
# its grants unchanged; synchronize identity counters in the dashboard instead.
(ROOT / 'finalize-import.sql').write_text(  # Executa a gravação do texto em ROOT / 'finalize-import.sql'.
    sequence_sql + '\nDROP FUNCTION public.praxis_import_drive_20261009(jsonb);\n'  # Fornece o texto “DROP FUNCTION public.praxis_import_drive_20261009(jsonb); NOTIFY pgrst,'reload schem…” à expressão.
    "NOTIFY pgrst,'reload schema';\n", encoding='utf-8',  # Fornece o argumento encoding com o texto “utf-8”.
)  # Encerra a coleção, a chamada ou a expressão iniciada acima.
# Explicações do trecho literal abaixo, sem alterar seu conteúdo:
# Linha 1 do trecho: Define result como o texto “RETURN jsonb_build_object( 'counts',jsonb_build_object( 'catalogo',(SELECT count(*) …”.
# Linha 2 do trecho: Inclui no SQL gerado: Retorna um objeto JSONB com os totais publicados e a quantidade de arquivos verificados.
# Linha 3 do trecho: Compõe o texto “'counts',jsonb_build_object(” dentro do valor multilinha.
# Linha 4 do trecho: Compõe o texto “'catalogo',(SELECT count(*) FROM public.catalogo),” dentro do valor multilinha.
# Linha 5 do trecho: Compõe o texto “'modulos',(SELECT count(*) FROM public.modulos),” dentro do valor multilinha.
# Linha 6 do trecho: Compõe o texto “'aulas',(SELECT count(*) FROM public.aulas),” dentro do valor multilinha.
# Linha 7 do trecho: Compõe o texto “'slides',(SELECT count(*) FROM public.slides),” dentro do valor multilinha.
# Linha 8 do trecho: Compõe o texto “'materiais',(SELECT count(*) FROM public.materiais)” dentro do valor multilinha.
# Linha 9 do trecho: Compõe o texto “),” dentro do valor multilinha.
# Linha 10 do trecho: Compõe o texto “'verified_files',(SELECT count(*) FROM import_files)” dentro do valor multilinha.
# Linha 11 do trecho: Compõe o texto “);” dentro do valor multilinha.
# Linha 12 do trecho: Fornece o texto “RETURN jsonb_build_object( 'counts',jsonb_build_object( 'catalogo',(SELECT count(*) …” à expressão.
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
# Explicações do trecho literal abaixo, sem alterar seu conteúdo:
# Linha 1 do trecho: Define rpc como o resultado da expressão '-- Importador temporário: somente service_role; sem SQL fornecido pelo cliente.\nBEGIN;\nCREATE FUNCTION public.praxis_import_drive_20261009(pa….
# Linha 2 do trecho: Inclui no SQL gerado: Inicia uma transação para publicar todas as alterações de forma atômica.
# Linha 3 do trecho: Inclui no SQL gerado: Declara a função temporária praxis_import_drive_20261009 que recebe o pacote JSONB revisado.
# Linha 4 do trecho: Compõe o texto “RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp” dentro do valor multilinha.
# Linha 5 do trecho: Compõe o texto “AS $import_rpc$” dentro do valor multilinha.
# Linha 6 do trecho: Inclui no SQL gerado: Inicia o bloco de instruções da função ou da verificação.
# Linha 7 do trecho: Compõe o texto “""" + body + result + """” dentro do valor multilinha.
# Linha 8 do trecho: Inclui no SQL gerado: Encerra o bloco de instruções atual.
# Linha 9 do trecho: Compõe o texto “$import_rpc$;” dentro do valor multilinha.
# Linha 10 do trecho: Inclui no SQL gerado: Remove a permissão de execução da função para os papéis públicos e de usuários comuns.
# Linha 11 do trecho: Inclui no SQL gerado: Autoriza somente service_role a executar a função de importação temporária.
# Linha 12 do trecho: Compõe o texto “""" + policy_sql + """” dentro do valor multilinha.
# Linha 13 do trecho: Inclui no SQL gerado: Solicita ao PostgREST a atualização do cache do esquema do banco.
# Linha 14 do trecho: Inclui no SQL gerado: Confirma as alterações da transação após as verificações.
# Linha 15 do trecho: Inclui no SQL gerado: Inicia a conferência do nome e do modo de segurança da função temporária.
# Linha 16 do trecho: Compõe o texto “has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,” dentro do valor multilinha.
# Linha 17 do trecho: Compõe o texto “has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,” dentro do valor multilinha.
# Linha 18 do trecho: Compõe o texto “has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute” dentro do valor multilinha.
# Linha 19 do trecho: Inclui no SQL gerado: Consulta as funções e os esquemas no catálogo interno do PostgreSQL.
# Linha 20 do trecho: Inclui no SQL gerado: Restringe a conferência à função de importação no esquema public.
# Linha 21 do trecho: Fornece o texto “NOTIFY pgrst,'reload schema'; COMMIT; SELECT p.proname, p.prosecdef AS security_defi…” à expressão.
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
(ROOT / 'temporary-rpc.sql').write_text(rpc, encoding='utf-8')  # Executa a gravação do texto em ROOT / 'temporary-rpc.sql'.
(ROOT / 'import-payload.json').write_text(json.dumps({'payload': payload}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')  # Executa a gravação do texto em ROOT / 'import-payload.json'.
print(json.dumps({'rpc_characters': len(rpc), 'rows': {k: len(v) for k, v in payload.items()}}))  # Executa a exibição de a serialização de um dicionário com as chaves 'rpc_characters', 'rows' para JSON na saída do programa.
