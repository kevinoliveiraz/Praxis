"""Read back content tables and compare them with the reviewed import payload."""  # Documenta o propósito deste módulo ou desta função.
import argparse  # Importa argparse.
from collections import Counter  # Importa Counter de collections.
from datetime import datetime, timezone  # Importa datetime, timezone de datetime.
import json  # Importa json.
from pathlib import Path  # Importa Path de pathlib.
import urllib.request  # Importa urllib.request.

ROOT = Path(__file__).resolve().parent  # Define ROOT como Path(__file__).resolve().parent.
BASE = 'https://fxpmeosnnrgqdelffnvy.supabase.co'  # Define BASE como o texto “https://fxpmeosnnrgqdelffnvy.supabase.co”.
TABLES = ('catalogo', 'modulos', 'aulas', 'slides', 'materiais')  # Define TABLES como uma coleção com 5 elementos.

class NoRedirect(urllib.request.HTTPRedirectHandler):  # Declara a classe NoRedirect herdando de urllib.request.HTTPRedirectHandler.
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # Declara a função redirect_request com os parâmetros self, req, fp, code, msg, headers, newurl.
        return None  # Retorna None (ausência de valor).

parser = argparse.ArgumentParser()  # Define parser como o resultado de argparse.ArgumentParser.
parser.add_argument('key_file', type=Path)  # Executa o registro do argumento de linha de comando o texto “key_file”.
args = parser.parse_args()  # Define args como os argumentos recebidos na linha de comando.
key = args.key_file.read_text(encoding='utf-8').strip()  # Define key como o texto sem os caracteres de borda indicados.
assert key.startswith('sb_secret_')  # Confere key.startswith('sb_secret_'), interrompendo o programa se a condição for falsa.
opener = urllib.request.build_opener(NoRedirect())  # Define opener como um cliente HTTP com os manipuladores informados.
after = {}  # Define after como um dicionário vazio.
for table in TABLES:  # Percorre TABLES usando table a cada iteração.
    req = urllib.request.Request(  # Define req como uma requisição HTTP para o resultado da expressão BASE + f'/rest/v1/{table}?select=*&order=id.asc&limit=1000'.
        BASE + f'/rest/v1/{table}?select=*&order=id.asc&limit=1000',  # Fornece o texto “/rest/v1/” à expressão.
        headers={'apikey': key, 'User-Agent': 'Praxis content audit'},  # Fornece o argumento headers com um dicionário com as chaves 'apikey', 'User-Agent'.
    )  # Encerra a coleção, a chamada ou a expressão iniciada acima.
    with opener.open(req, timeout=45) as response:  # Abre e gerencia o recurso a abertura do arquivo ou da conexão com os parâmetros informados, encerrando-o ao sair do bloco.
        after[table] = json.loads(response.read())  # Define after[table] como os dados interpretados do JSON a leitura do conteúdo disponível no fluxo.

payload = json.loads((ROOT / 'import-payload.json').read_text(encoding='utf-8'))['payload']  # Define payload como json.loads((ROOT / 'import-payload.json').read_text(encoding='utf-8'))['payload'].
before = json.loads((ROOT / 'supabase-before.json').read_text(encoding='utf-8-sig'))  # Define before como os dados interpretados do JSON o conteúdo textual do arquivo ROOT / 'supabase-before.json'.
for table in TABLES:  # Percorre TABLES usando table a cada iteração.
    actual = {r['id']: r for r in after[table]}  # Define actual como uma coleção calculada percorrendo after[table].
    expected = {r['id']: r for r in payload[table]}  # Define expected como uma coleção calculada percorrendo payload[table].
    assert set(actual) == set(expected), f'Unexpected or missing IDs: {table}'  # Confere set(actual) == set(expected), interrompendo o programa se a condição for falsa.
    for row_id, row in expected.items():  # Percorre os pares de chave e valor do dicionário usando (row_id, row) a cada iteração.
        for column, value in row.items():  # Percorre os pares de chave e valor do dicionário usando (column, value) a cada iteração.
            assert actual[row_id][column] == value, f'Value mismatch: {table} {row_id} {column}'  # Confere actual[row_id][column] == value, interrompendo o programa se a condição for falsa.
    for old in before.get(table) or []:  # Percorre o resultado da expressão before.get(table) or [] usando old a cada iteração.
        assert old['id'] in actual, f'Existing ID lost: {table}'  # Confere old['id'] in actual, interrompendo o programa se a condição for falsa.
        parent = {'modulos': 'curso_id', 'aulas': 'modulo_id', 'slides': 'aula_id', 'materiais': 'aula_id'}.get(table)  # Define parent como o valor da chave table, usando a alternativa se necessário.
        if parent:  # Verifica parent para decidir se executa o bloco.
            assert old[parent] == actual[old['id']][parent], f'Existing parent changed: {table}'  # Confere old[parent] == actual[old['id']][parent], interrompendo o programa se a condição for falsa.
        old_time = datetime.fromisoformat(old['created_at'].replace('Z', '+00:00'))  # Define old_time como o resultado de datetime.fromisoformat com a substituição dos trechos que correspondem a o texto “Z”.
        live_time = datetime.fromisoformat(actual[old['id']]['created_at'].replace('Z', '+00:00'))  # Define live_time como o resultado de datetime.fromisoformat com a substituição dos trechos que correspondem a o texto “Z”.
        assert old_time == live_time, f'Existing timestamp changed: {table}'  # Confere old_time == live_time, interrompendo o programa se a condição for falsa.

assert len({(s['aula_id'], s['ordem']) for s in after['slides']}) == len(after['slides'])  # Confere len({(s['aula_id'], s['ordem']) for s in after['slides']}) == len(after['slides']), interrompendo o programa se a condição for falsa.
receipts = json.loads((ROOT / 'upload-receipts.json').read_text(encoding='utf-8'))  # Define receipts como os dados interpretados do JSON o conteúdo textual do arquivo ROOT / 'upload-receipts.json'.
plan = json.loads((ROOT / 'import-plan.json').read_text(encoding='utf-8'))  # Define plan como os dados interpretados do JSON o conteúdo textual do arquivo ROOT / 'import-plan.json'.
assert {u['id'] for u in plan['uploads']} == set(receipts), 'Incomplete upload receipts'  # Confere {u['id'] for u in plan['uploads']} == set(receipts), interrompendo o programa se a condição for falsa.
for u in plan['uploads']:  # Percorre plan['uploads'] usando u a cada iteração.
    r = receipts[u['id']]  # Define r como receipts[u['id']].
    assert r['size'] == u['size'] and r['path'] == u['target'] and r['bucket'] == u['bucket']  # Confere r['size'] == u['size'] and r['path'] == u['target'] and (r['bucket'] == u['bucket']), interrompendo o programa se a condição for falsa.

report = {  # Define report como um dicionário com as chaves 'verified_at', 'counts', 'all_planned_values_match', 'existing_ids_and_parents_preserved', 'duplicate_slide_order'.
    'verified_at': datetime.now(timezone.utc).isoformat(),  # Obtém ou executa a data e hora no formato ISO 8601.
    'counts': {t: len(after[t]) for t in TABLES},  # Obtém ou executa a quantidade de itens de after[t].
    'all_planned_values_match': True,  # Fornece o texto “all_planned_values_match” à expressão.
    'existing_ids_and_parents_preserved': True,  # Fornece o texto “existing_ids_and_parents_preserved” à expressão.
    'duplicate_slide_order': 0,  # Fornece o texto “duplicate_slide_order” à expressão.
    'verified_upload_receipts': len(receipts),  # Obtém ou executa a quantidade de itens de receipts.
    'upload_buckets': dict(Counter(u['bucket'] for u in plan['uploads'])),  # Obtém ou executa o resultado de dict com o resultado de Counter com uma coleção calculada percorrendo plan['uploads'].
    'source_gaps': [x for x in plan['issues'] if x['type'] == 'course_source_gap'],  # Fornece o texto “source_gaps” à expressão.
    'courses': [],  # Fornece o texto “courses” à expressão.
}  # Encerra a coleção, a chamada ou a expressão iniciada acima.
for course in after['catalogo']:  # Percorre after['catalogo'] usando course a cada iteração.
    modules = {m['id'] for m in after['modulos'] if m['curso_id'] == course['id']}  # Define modules como uma coleção calculada percorrendo after['modulos'].
    lessons = {a['id'] for a in after['aulas'] if a['modulo_id'] in modules}  # Define lessons como uma coleção calculada percorrendo after['aulas'].
    report['courses'].append({  # Executa a inclusão de um dicionário com as chaves 'id', 'nome', 'modulos', 'aulas', 'slides' no final da lista.
        'id': course['id'], 'nome': course['nome'], 'modulos': len(modules), 'aulas': len(lessons),  # Obtém ou executa a quantidade de itens de modules.
        'slides': sum(s['aula_id'] in lessons for s in after['slides']),  # Obtém ou executa a soma dos valores de uma coleção calculada percorrendo after['slides'].
        'materiais': sum(m['aula_id'] in lessons for m in after['materiais']),  # Obtém ou executa a soma dos valores de uma coleção calculada percorrendo after['materiais'].
    })  # Encerra a coleção, a chamada ou a expressão iniciada acima.
(ROOT / 'supabase-after.json').write_text(json.dumps(after, ensure_ascii=False, indent=2), encoding='utf-8')  # Executa a gravação do texto em ROOT / 'supabase-after.json'.
(ROOT / 'live-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')  # Executa a gravação do texto em ROOT / 'live-audit.json'.
print(json.dumps({k: v for k, v in report.items() if k != 'courses'}, ensure_ascii=False))  # Executa a exibição de a serialização de uma coleção calculada percorrendo report.items() para JSON na saída do programa.
