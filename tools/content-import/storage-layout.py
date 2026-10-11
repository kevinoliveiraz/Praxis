# Explicações do trecho literal abaixo, sem alterar seu conteúdo:
# Linha 1 do trecho: Documenta o propósito deste módulo ou desta função.
# Linha 3 do trecho: Compõe o texto “Run inspect first, then build, apply and verify. A file is copied and checked,” dentro do valor multilinha.
# Linha 4 do trecho: Compõe o texto “its existing database row is updated with an expected-value guard, and only” dentro do valor multilinha.
# Linha 5 do trecho: Compõe o texto “then is the old copy removed. This keeps a valid file at the registered path.” dentro do valor multilinha.
# Linha 6 do trecho: Compõe o texto “No bucket permissions, lesson IDs, progress or authentication data are changed.” dentro do valor multilinha.
# Linha 7 do trecho: Documenta o propósito deste módulo ou desta função.
"""Mirror Drive paths in Storage while preserving every lesson and file.

Run inspect first, then build, apply and verify. A file is copied and checked,
its existing database row is updated with an expected-value guard, and only
then is the old copy removed. This keeps a valid file at the registered path.
No bucket permissions, lesson IDs, progress or authentication data are changed.
"""
import argparse  # Importa argparse.
import hashlib  # Importa hashlib.
from concurrent.futures import ThreadPoolExecutor, as_completed  # Importa ThreadPoolExecutor, as_completed de concurrent.futures.
from datetime import datetime, timezone  # Importa datetime, timezone de datetime.
import json  # Importa json.
from pathlib import Path, PurePosixPath  # Importa Path, PurePosixPath de pathlib.
import re  # Importa re.
import threading  # Importa threading.
import time  # Importa time.
import unicodedata  # Importa unicodedata.
from urllib.parse import quote, unquote, urlencode  # Importa quote, unquote, urlencode de urllib.parse.
import urllib.error  # Importa urllib.error.
import urllib.request  # Importa urllib.request.

ROOT = Path(__file__).resolve().parent  # Define ROOT como Path(__file__).resolve().parent.
BASE = 'https://fxpmeosnnrgqdelffnvy.supabase.co'  # Define BASE como o texto “https://fxpmeosnnrgqdelffnvy.supabase.co”.
BUCKETS = ('slides', 'materiais', 'storage capas')  # Define BUCKETS como uma coleção com 3 elementos.
TABLES = ('catalogo', 'modulos', 'aulas', 'slides', 'materiais')  # Define TABLES como uma coleção com 5 elementos.

def read(name):  # Declara a função read com os parâmetros name.
    return json.loads((ROOT / name).read_text(encoding='utf-8-sig'))  # Retorna os dados interpretados do JSON o conteúdo textual do arquivo ROOT / name.

def save(name, value):  # Declara a função save com os parâmetros name, value.
    destination = ROOT / name  # Define destination como o resultado da expressão ROOT / name.
    temporary = destination.with_suffix(destination.suffix + '.tmp')  # Define temporary como o resultado de destination.with_suffix com o resultado da expressão destination.suffix + '.tmp'.
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')  # Executa a gravação do texto em temporary.
    temporary.replace(destination)  # Executa a substituição dos trechos que correspondem a destination.

def storage_path(source):  # Declara a função storage_path com os parâmetros source.
    # Supabase currently accepts only ASCII S3-safe characters for object keys.
    result = ''.join(c for c in unicodedata.normalize('NFD', source)  # Define result como a união dos trechos de texto com o separador definido.
                     if not unicodedata.combining(c))  # Obtém ou executa o resultado de unicodedata.combining com c.
    result = result.replace('—', '-').replace('–', '-')  # Define result como a substituição dos trechos que correspondem a o texto “–”.
    result = re.sub(r"[^A-Za-z0-9_/!.*'() &$=@;:+,?-]", '_', result)  # Define result como a substituição das ocorrências do padrão o texto “[^A-Za-z0-9_/!.*'() &$=@;:+,?-]”.
    assert result and all(p not in ('', '.', '..') for p in result.split('/'))  # Confere result and all((p not in ('', '.', '..') for p in result.split('/'))), interrompendo o programa se a condição for falsa.
    return result  # Retorna result.

def cover_url(path):  # Declara a função cover_url com os parâmetros path.
    return BASE + '/storage/v1/object/public/storage%20capas/' + quote(path, safe='/')  # Retorna o resultado da expressão BASE + '/storage/v1/object/public/storage%20capas/' + quote(path, safe='/').

def same_checksum(original, copied):  # Declara a função same_checksum com os parâmetros original, copied.
    if not original or not copied:  # Verifica not original or not copied para decidir se executa o bloco.
        return False  # Retorna False (falso).
    original, copied = original.strip('"'), copied.strip('"')  # Define (original, copied) como uma coleção com 2 elementos.
    if original == copied:  # Verifica original == copied para decidir se executa o bloco.
        return True  # Retorna True (verdadeiro).
    # CopyObject changes a one-part multipart ETag into the full-file MD5.
    # Its old composite checksum is MD5(binary file MD5) followed by '-1'.
    if re.fullmatch(r'[a-fA-F0-9]{32}-1', original) and re.fullmatch(r'[a-fA-F0-9]{32}', copied):  # Verifica re.fullmatch('[a-fA-F0-9]{32}-1', original) and re.fullmatch('[a-fA-F0-9]{32}', copied) para decidir se executa o bloco.
        return hashlib.md5(bytes.fromhex(copied)).hexdigest() + '-1' == original.lower()  # Retorna o resultado da expressão hashlib.md5(bytes.fromhex(copied)).hexdigest() + '-1' == original.lower().
    return False  # Retorna False (falso).

class NoRedirect(urllib.request.HTTPRedirectHandler):  # Declara a classe NoRedirect herdando de urllib.request.HTTPRedirectHandler.
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # Declara a função redirect_request com os parâmetros self, req, fp, code, msg, headers, newurl.
        return None  # Retorna None (ausência de valor).

class Client:  # Declara a classe Client.
    def __init__(self, key_file):  # Declara a função __init__ com os parâmetros self, key_file.
        self.key = key_file.read_text(encoding='utf-8').strip()  # Define self.key como o texto sem os caracteres de borda indicados.
        assert self.key.startswith('sb_secret_'), 'Existing server credential required'  # Confere self.key.startswith('sb_secret_'), interrompendo o programa se a condição for falsa.
        self.opener = urllib.request.build_opener(NoRedirect())  # Define self.opener como um cliente HTTP com os manipuladores informados.

    def request(self, path, payload=None, method=None, content=None, mime=None, prefer=None):  # Declara a função request com os parâmetros self, path, payload, method, content, mime, prefer.
        assert path.startswith(('/storage/v1/', '/rest/v1/'))  # Confere path.startswith(('/storage/v1/', '/rest/v1/')), interrompendo o programa se a condição for falsa.
        headers = {'apikey': self.key, 'User-Agent': 'Praxis storage organization'}  # Define headers como um dicionário com as chaves 'apikey', 'User-Agent'.
        body = content  # Define body como content.
        if payload is not None:  # Verifica payload is not None para decidir se executa o bloco.
            body = json.dumps(payload, ensure_ascii=False).encode('utf-8')  # Define body como a codificação do texto em bytes.
            headers['Content-Type'] = 'application/json'  # Define headers['Content-Type'] como o texto “application/json”.
        if mime:  # Verifica mime para decidir se executa o bloco.
            headers['Content-Type'] = mime  # Define headers['Content-Type'] como mime.
            headers['x-upsert'] = 'false'  # Define headers['x-upsert'] como o texto “false”.
        if prefer:  # Verifica prefer para decidir se executa o bloco.
            headers['Prefer'] = prefer  # Define headers['Prefer'] como prefer.
        for attempt in range(3):  # Percorre o resultado de range com 3 usando attempt a cada iteração.
            try:  # Inicia a tentativa de execução com tratamento de falhas.
                request = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)  # Define request como uma requisição HTTP para o resultado da expressão BASE + path.
                with self.opener.open(request, timeout=60) as response:  # Abre e gerencia o recurso a abertura do arquivo ou da conexão com os parâmetros informados, encerrando-o ao sair do bloco.
                    data = response.read()  # Define data como a leitura do conteúdo disponível no fluxo.
                    return json.loads(data) if data else None  # Retorna os dados interpretados do JSON data quando data; caso contrário, None (ausência de valor).
            except urllib.error.HTTPError as error:  # Captura urllib.error.HTTPError em error para tratar a falha.
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:  # Verifica error.code not in (429, 500, 502, 503, 504) or attempt == 2 para decidir se executa o bloco.
                    raise  # Relança a exceção capturada para informar a falha ao chamador.
            except urllib.error.URLError:  # Captura urllib.error.URLError para tratar a falha.
                if attempt == 2:  # Verifica attempt == 2 para decidir se executa o bloco.
                    raise  # Relança a exceção capturada para informar a falha ao chamador.
            time.sleep(attempt + 1)  # Executa a espera pelo intervalo informado.

    def tables(self):  # Declara a função tables com os parâmetros self.
        return {t: self.request(f'/rest/v1/{t}?select=*&order=id.asc&limit=1000') for t in TABLES}  # Retorna uma coleção calculada percorrendo TABLES.

    def storage(self):  # Declara a função storage com os parâmetros self.
        objects = []  # Define objects como uma coleção com 0 elementos.
        for bucket in BUCKETS:  # Percorre BUCKETS usando bucket a cada iteração.
            cursor = None  # Define cursor como None (ausência de valor).
            while True:  # Repete o bloco enquanto True.
                options = {'prefix': '', 'limit': 1000, 'with_delimiter': False,  # Define options como um dicionário com as chaves 'prefix', 'limit', 'with_delimiter', 'sortBy'.
                           'sortBy': {'column': 'name', 'order': 'asc'}}  # Fornece o texto “sortBy” à expressão.
                if cursor:  # Verifica cursor para decidir se executa o bloco.
                    options['cursor'] = cursor  # Define options['cursor'] como cursor.
                # V2 returns authoritative full keys; the folder listing can
                # merge paths that differ only in case during this migration.
                result = self.request('/storage/v1/object/list-v2/' + quote(bucket, safe=''), options)  # Define result como o resultado de self.request com o resultado da expressão '/storage/v1/object/list-v2/' + quote(bucket, safe='') e options.
                for item in result['objects']:  # Percorre result['objects'] usando item a cada iteração.
                    objects.append({'bucket': bucket, 'path': item['name'],  # Executa a inclusão de um dicionário com as chaves 'bucket', 'path', 'size', 'metadata', 'object_id' no final da lista.
                        'size': int((item.get('metadata') or {}).get('size', 0)),  # Obtém ou executa a conversão de o valor da chave o texto “size”, usando a alternativa se necessário em inteiro.
                        'metadata': item.get('metadata') or {}, 'object_id': item['id']})  # Obtém ou executa o valor da chave o texto “metadata”, usando a alternativa se necessário.
                if not result['hasNext']:  # Verifica not result['hasNext'] para decidir se executa o bloco.
                    break  # Encerra o laço atual.
                cursor = result['nextCursor']  # Define cursor como result['nextCursor'].
        return objects  # Retorna objects.

    def info(self, bucket, path):  # Declara a função info com os parâmetros self, bucket, path.
        info = self.request('/storage/v1/object/info/' + quote(bucket, safe='') + '/' + quote(path, safe='/'))  # Define info como o resultado de self.request com o resultado da expressão '/storage/v1/object/info/' + quote(bucket, safe='') + '/' + quote(path, safe='/').
        # Storage's current FileObjectV2 exposes size/etag at the top level.
        if not info.get('metadata'):  # Verifica not info.get('metadata') para decidir se executa o bloco.
            info['metadata'] = {'size': info['size'], 'eTag': info.get('etag'),  # Define info['metadata'] como um dicionário com as chaves 'size', 'eTag', 'mimetype'.
                                'mimetype': info.get('content_type')}  # Obtém ou executa o valor da chave o texto “content_type”, usando a alternativa se necessário.
        return info  # Retorna info.

    def relocate_copy(self, bucket, source, target):  # Declara a função relocate_copy com os parâmetros self, bucket, source, target.
        return self.request('/storage/v1/object/copy',  # Retorna o resultado de self.request com o texto “/storage/v1/object/copy” e um dicionário com as chaves 'bucketId', 'sourceKey', 'destinationKey'.
            {'bucketId': bucket, 'sourceKey': source, 'destinationKey': target})  # Fornece o texto “bucketId” à expressão.

    def remove_old_copy(self, bucket, path):  # Declara a função remove_old_copy com os parâmetros self, bucket, path.
        return self.request('/storage/v1/object/' + quote(bucket, safe=''),  # Retorna o resultado de self.request com o resultado da expressão '/storage/v1/object/' + quote(bucket, safe='') e um dicionário com as chaves 'prefixes'.
                            {'prefixes': [path]}, method='DELETE')  # Fornece o argumento method com o texto “DELETE”.

def build():  # Declara a função build com os parâmetros nenhum.
    inventory, imported, before = read('drive-inventory.json'), read('import-plan.json'), read('storage-layout-before.json')  # Define (inventory, imported, before) como uma coleção com 3 elementos.
    objects = {(o['bucket'], o['path']): o for o in before['objects']}  # Define objects como uma coleção calculada percorrendo before['objects'].
    links = {(x['bucket'], x['path']): x for x in imported['links']}  # Define links como uma coleção calculada percorrendo imported['links'].
    files = {x['id']: x for x in inventory['items'] if x['mime_type'] != 'application/vnd.google-apps.folder'}  # Define files como uma coleção calculada percorrendo inventory['items'].
    lessons = {l['id']: l for c in imported['courses'] for l in c['lessons']}  # Define lessons como uma coleção calculada percorrendo imported['courses'], c['lessons'].
    moves, legacy = [], []  # Define (moves, legacy) como uma coleção com 2 elementos.
    for table, column, bucket in [('slides', 'imagem_path', 'slides'), ('materiais', 'arquivo_path', 'materiais'),  # Percorre uma coleção com 3 elementos usando (table, column, bucket) a cada iteração.
                                   ('catalogo', 'imagem_capa_url', 'storage capas')]:  # Fornece o texto “catalogo” à expressão.
        for row in before[table]:  # Percorre before[table] usando row a cada iteração.
            original = row[column]  # Define original como row[column].
            old_path = unquote(original.split('/object/public/storage%20capas/', 1)[1]) if table == 'catalogo' else original  # Define old_path como o resultado de unquote com original.split('/object/public/storage%20capas/', 1)[1] quando table == 'catalogo'; caso contrário, original.
            obj = objects[(bucket, old_path)]  # Define obj como objects[bucket, old_path].
            linked = links.get((bucket, old_path))  # Define linked como o valor da chave uma coleção com 2 elementos, usando a alternativa se necessário.
            source, source_id = None, None  # Define (source, source_id) como uma coleção com 2 elementos.
            action, size = 'relocate', obj['size']  # Define (action, size) como uma coleção com 2 elementos.
            if linked:  # Verifica linked para decidir se executa o bloco.
                source_id = linked['drive_id']  # Define source_id como linked['drive_id'].
                item = files[source_id]  # Define item como files[source_id].
                source = item['path']  # Define source como item['path'].
                if obj['size'] != int(item['size']):  # Verifica obj['size'] != int(item['size']) para decidir se executa o bloco.
                    assert table == 'catalogo' and row['id'] == 1, 'Unexpected difference from Drive'  # Confere table == 'catalogo' and row['id'] == 1, interrompendo o programa se a condição for falsa.
                    action, size = 'original_upload', int(item['size'])  # Define (action, size) como uma coleção com 2 elementos.
                    legacy.append({'bucket': bucket, 'from_path': old_path,  # Executa a inclusão de um dicionário com as chaves 'bucket', 'from_path', 'target', 'size' no final da lista.
                        'target': 'EXCEL/CAPA/' + PurePosixPath(old_path).name, 'size': obj['size']})  # Obtém ou executa o resultado de PurePosixPath com old_path.
            else:  # Executa a alternativa quando a condição anterior não foi atendida.
                assert bucket == 'slides' and old_path.startswith('excel/conteudo/'), 'Unmapped file'  # Confere bucket == 'slides' and old_path.startswith('excel/conteudo/'), interrompendo o programa se a condição for falsa.
                lesson = lessons[row['aula_id']]  # Define lesson como lessons[row['aula_id']].
                archive = next(m for m in lesson['materials'] if m['tipo'] == 'ZIP')  # Define archive como o resultado de next com uma coleção calculada percorrendo lesson['materials'].
                item = files[archive['drive_id']]  # Define item como files[archive['drive_id']].
                source = str(PurePosixPath(item['path']).parent / PurePosixPath(old_path).name)  # Define source como a conversão de o resultado da expressão PurePosixPath(item['path']).parent / PurePosixPath(old_path).name em texto.
            target = storage_path(source)  # Define target como o resultado de storage_path com source.
            new_value = cover_url(target) if table == 'catalogo' else target  # Define new_value como o resultado de cover_url com target quando table == 'catalogo'; caso contrário, target.
            moves.append({'bucket': bucket, 'from_path': old_path, 'target': target,  # Executa a inclusão de um dicionário com as chaves 'bucket', 'from_path', 'target', 'size', 'source' no final da lista.
                'size': size, 'source': source, 'drive_id': source_id, 'action': action,  # Fornece o texto “size” à expressão.
                'reference': {'table': table, 'id': row['id'], 'column': column,  # Fornece o texto “reference” à expressão.
                              'old_value': original, 'new_value': new_value}})  # Fornece o texto “old_value” à expressão.
    destinations = [(m['bucket'], m['target']) for m in moves + legacy]  # Define destinations como uma coleção calculada percorrendo moves + legacy.
    assert len(destinations) == len(set(destinations)), 'Names collide after normalization'  # Confere len(destinations) == len(set(destinations)), interrompendo o programa se a condição for falsa.
    source_ids = {m['drive_id'] for m in moves if m['drive_id']}  # Define source_ids como uma coleção calculada percorrendo moves.
    assert source_ids == set(files), 'A Drive file is not represented'  # Confere source_ids == set(files), interrompendo o programa se a condição for falsa.
    assert len([m for m in moves if not m['drive_id']]) == 53, 'Unexpected archive-derived slides'  # Confere len([m for m in moves if not m['drive_id']]) == 53, interrompendo o programa se a condição for falsa.
    assert not any((m['bucket'], m['target']) in objects for m in moves + legacy), 'A destination already exists'  # Confere not any(((m['bucket'], m['target']) in objects for m in moves + legacy)), interrompendo o programa se a condição for falsa.
    empty_folders = []  # Define empty_folders como uma coleção com 0 elementos.
    for item in inventory['items']:  # Percorre inventory['items'] usando item a cada iteração.
        if item['mime_type'] != 'application/vnd.google-apps.folder':  # Verifica item['mime_type'] != 'application/vnd.google-apps.folder' para decidir se executa o bloco.
            continue  # Avança para a próxima iteração do laço.
        path = item['path']  # Define path como item['path'].
        if any(f['path'].startswith(path + '/') for f in files.values()):  # Verifica any((f['path'].startswith(path + '/') for f in files.values())) para decidir se executa o bloco.
            continue  # Avança para a próxima iteração do laço.
        bucket = 'storage capas' if re.search(r'/CAPAS?(?:/|$)', path) else 'materiais' if 'MATERIAL' in path or 'EXTERNO' in path else 'slides'  # Define bucket como o texto “storage capas” quando re.search('/CAPAS?(?:/|$)', path); caso contrário, o texto “materiais” quando 'MATERIAL' in path or 'EXTERNO' in path; caso contrário, o texto “slides”.
        empty_folders.append({'bucket': bucket, 'path': storage_path(path) + '/.emptyFolderPlaceholder'})  # Executa a inclusão de um dicionário com as chaves 'bucket', 'path' no final da lista.
    plan = {'project_ref': 'fxpmeosnnrgqdelffnvy', 'created_at': datetime.now(timezone.utc).isoformat(),  # Define plan como um dicionário com as chaves 'project_ref', 'created_at', 'moves', 'legacy_assets', 'empty_folders'.
            'moves': moves, 'legacy_assets': legacy, 'empty_folders': empty_folders,  # Fornece o texto “moves” à expressão.
            'old_placeholders': [o for o in before['objects'] if o['path'].endswith('/.emptyFolderPlaceholder') and o['size'] == 0]}  # Obtém ou executa o resultado de o['path'].endswith com o texto “/.emptyFolderPlaceholder”.
    save('storage-layout-plan.json', plan)  # Executa o resultado de save com o texto “storage-layout-plan.json” e plan.
    print(json.dumps({'files': len(moves), 'legacy_preserved': len(legacy),  # Executa a exibição de a serialização de um dicionário com as chaves 'files', 'legacy_preserved', 'source_files', 'empty_folders', 'examples' para JSON na saída do programa.
        'source_files': len(source_ids), 'empty_folders': len(empty_folders),  # Obtém ou executa a quantidade de itens de source_ids.
        'examples': [m['target'] for m in moves if m['bucket'] == 'materiais'][:6]}, ensure_ascii=False))  # Fornece o argumento ensure_ascii com False (falso).

def apply(client, cache):  # Declara a função apply com os parâmetros client, cache.
    plan = read('storage-layout-plan.json')  # Define plan como a leitura do conteúdo disponível no fluxo.
    assert plan['project_ref'] == 'fxpmeosnnrgqdelffnvy'  # Confere plan['project_ref'] == 'fxpmeosnnrgqdelffnvy', interrompendo o programa se a condição for falsa.
    current = client.tables()  # Define current como o resultado de client.tables.
    objects = {(o['bucket'], o['path']): o for o in client.storage()}  # Define objects como uma coleção calculada percorrendo client.storage().
    receipts = read('storage-layout-receipts.json') if (ROOT / 'storage-layout-receipts.json').exists() else {}  # Define receipts como a leitura do conteúdo disponível no fluxo quando (ROOT / 'storage-layout-receipts.json').exists(); caso contrário, um dicionário vazio.
    receipt_lock = threading.Lock()  # Define receipt_lock como o resultado de threading.Lock.

    def record(item, phase, info=None):  # Declara a função record com os parâmetros item, phase, info.
        ref = item.get('reference', {})  # Define ref como o valor da chave o texto “reference”, usando a alternativa se necessário.
        key = item['bucket'] + '/' + item['from_path']  # Define key como o resultado da expressão item['bucket'] + '/' + item['from_path'].
        with receipt_lock:  # Abre e gerencia o recurso receipt_lock, encerrando-o ao sair do bloco.
            receipts[key] = {'bucket': item['bucket'], 'old_path': item['from_path'],  # Define receipts[key] como um dicionário com as chaves 'bucket', 'old_path', 'path', 'size', 'phase'.
                'path': item['target'], 'size': item['size'], 'phase': phase,  # Fornece o texto “path” à expressão.
                'table': ref.get('table'), 'row_id': ref.get('id'),  # Obtém ou executa o valor da chave o texto “table”, usando a alternativa se necessário.
                'updated_at': datetime.now(timezone.utc).isoformat()}  # Obtém ou executa a data e hora no formato ISO 8601.
            if info:  # Verifica info para decidir se executa o bloco.
                receipts[key]['metadata'] = info.get('metadata') or {}  # Define receipts[key]['metadata'] como o resultado da expressão info.get('metadata') or {}.
            save('storage-layout-receipts.json', receipts)  # Executa o resultado de save com o texto “storage-layout-receipts.json” e receipts.

    def work(item):  # Declara a função work com os parâmetros item.
        bucket, old, target = item['bucket'], item['from_path'], item['target']  # Define (bucket, old, target) como uma coleção com 3 elementos.
        assert bucket in BUCKETS and target == storage_path(target)  # Confere bucket in BUCKETS and target == storage_path(target), interrompendo o programa se a condição for falsa.
        ref = item['reference']  # Define ref como item['reference'].
        row = next(r for r in current[ref['table']] if r['id'] == ref['id'])  # Define row como o resultado de next com uma coleção calculada percorrendo current[ref['table']].
        assert row[ref['column']] in (ref['old_value'], ref['new_value']), 'Reference changed externally'  # Confere row[ref['column']] in (ref['old_value'], ref['new_value']), interrompendo o programa se a condição for falsa.
        old_object, new_object = objects.get((bucket, old)), objects.get((bucket, target))  # Define (old_object, new_object) como uma coleção com 2 elementos.
        owned_copy = receipts.get(bucket + '/' + old)  # Define owned_copy como o valor da chave o resultado da expressão bucket + '/' + old, usando a alternativa se necessário.
        if new_object and not owned_copy:  # Verifica new_object and (not owned_copy) para decidir se executa o bloco.
            # Recover a verified copy after an interrupted run. The first snapshot
            # established that every destination was absent; accept only identical
            # bytes, without overwriting anything or changing a foreign reference.
            assert old_object, 'An unrecorded destination has no original'  # Confere old_object, interrompendo o programa se a condição for falsa.
            assert new_object['size'] == item['size'], 'Unrecorded destination size differs'  # Confere new_object['size'] == item['size'], interrompendo o programa se a condição for falsa.
            if item['action'] == 'original_upload':  # Verifica item['action'] == 'original_upload' para decidir se executa o bloco.
                source = cache / 'storage capas' / (item['drive_id'] + '.png')  # Define source como o resultado da expressão cache / 'storage capas' / (item['drive_id'] + '.png').
                expected_etag = '"' + hashlib.md5(source.read_bytes()).hexdigest() + '"'  # Define expected_etag como o resultado da expressão '"' + hashlib.md5(source.read_bytes()).hexdigest() + '"'.
            else:  # Executa a alternativa quando a condição anterior não foi atendida.
                expected_etag = old_object['metadata'].get('eTag')  # Define expected_etag como o valor da chave o texto “eTag”, usando a alternativa se necessário.
            assert same_checksum(expected_etag, new_object['metadata'].get('eTag')), 'Unrecorded destination checksum differs'  # Confere same_checksum(expected_etag, new_object['metadata'].get('eTag')), interrompendo o programa se a condição for falsa.
            record(item, 'recovered_verified_copy', {'metadata': new_object['metadata']})  # Executa o resultado de record com item e o texto “recovered_verified_copy”.
        if not new_object:  # Verifica not new_object para decidir se executa o bloco.
            assert old_object, 'Original file is missing'  # Confere old_object, interrompendo o programa se a condição for falsa.
            if item['action'] == 'original_upload':  # Verifica item['action'] == 'original_upload' para decidir se executa o bloco.
                path = (cache / 'storage capas' / (item['drive_id'] + '.png')).resolve()  # Define path como o caminho absoluto resolvido.
                assert path.is_relative_to(cache.resolve()), 'Source outside cache'  # Confere path.is_relative_to(cache.resolve()), interrompendo o programa se a condição for falsa.
                content = path.read_bytes()  # Define content como os bytes do arquivo path.
                assert len(content) == item['size'] and content.startswith(b'\x89PNG\r\n\x1a\n')  # Confere len(content) == item['size'] and content.startswith(b'\x89PNG\r\n\x1a\n'), interrompendo o programa se a condição for falsa.
                client.request('/storage/v1/object/' + quote(bucket, safe='') + '/' + quote(target, safe='/'),  # Executa o resultado de client.request com o resultado da expressão '/storage/v1/object/' + quote(bucket, safe='') + '/' + quote(target, safe='/').
                               content=content, mime='image/png', method='POST')  # Fornece o argumento content com content.
            else:  # Executa a alternativa quando a condição anterior não foi atendida.
                client.relocate_copy(bucket, old, target)  # Executa o resultado de client.relocate_copy com bucket e old.
        info = client.info(bucket, target)  # Define info como o resultado de client.info com bucket e target.
        metadata = info.get('metadata') or {}  # Define metadata como o resultado da expressão info.get('metadata') or {}.
        assert int(metadata['size']) == item['size'], 'Destination size mismatch'  # Confere int(metadata['size']) == item['size'], interrompendo o programa se a condição for falsa.
        if old_object and item['action'] != 'original_upload':  # Verifica old_object and item['action'] != 'original_upload' para decidir se executa o bloco.
            old_etag, new_etag = old_object['metadata'].get('eTag'), metadata.get('eTag')  # Define (old_etag, new_etag) como uma coleção com 2 elementos.
            if old_etag and new_etag:  # Verifica old_etag and new_etag para decidir se executa o bloco.
                assert same_checksum(old_etag, new_etag), 'Copy checksum mismatch'  # Confere same_checksum(old_etag, new_etag), interrompendo o programa se a condição for falsa.
        record(item, 'copied_and_verified', info)  # Executa o resultado de record com item e o texto “copied_and_verified”.
        if row[ref['column']] != ref['new_value']:  # Verifica row[ref['column']] != ref['new_value'] para decidir se executa o bloco.
            filters = urlencode({'id': 'eq.' + str(ref['id']), ref['column']: 'eq.' + ref['old_value'], 'select': 'id,' + ref['column']})  # Define filters como o resultado de urlencode com um dicionário com as chaves 'id', ref['column'], 'select'.
            updated = client.request('/rest/v1/' + ref['table'] + '?' + filters,  # Define updated como o resultado de client.request com o resultado da expressão '/rest/v1/' + ref['table'] + '?' + filters e um dicionário com as chaves ref['column'].
                {ref['column']: ref['new_value']}, method='PATCH', prefer='return=representation')  # Fornece o argumento method com o texto “PATCH”.
            assert len(updated) == 1 and updated[0][ref['column']] == ref['new_value'], 'Reference update conflicted'  # Confere len(updated) == 1 and updated[0][ref['column']] == ref['new_value'], interrompendo o programa se a condição for falsa.
        record(item, 'reference_updated', info)  # Executa o resultado de record com item e o texto “reference_updated”.
        # Keep Excel's distinct older JPEG until it is moved to its CAPA folder.
        if old_object and item['action'] != 'original_upload' and old != target:  # Verifica old_object and item['action'] != 'original_upload' and (old != target) para decidir se executa o bloco.
            client.remove_old_copy(bucket, old)  # Executa o resultado de client.remove_old_copy com bucket e old.
        record(item, 'complete', info)  # Executa o resultado de record com item e o texto “complete”.
        return item  # Retorna item.

    errors, completed = [], 0  # Define (errors, completed) como uma coleção com 2 elementos.
    moves = sorted(plan['moves'], key=lambda m: (m['bucket'] != 'materiais', m['bucket'], m['target']))  # Define moves como os itens de plan['moves'] em ordem.
    with ThreadPoolExecutor(max_workers=4) as pool:  # Abre e gerencia o recurso o resultado de ThreadPoolExecutor, encerrando-o ao sair do bloco.
        futures = {pool.submit(work, item): item for item in moves}  # Define futures como uma coleção calculada percorrendo moves.
        for future in as_completed(futures):  # Percorre o resultado de as_completed com futures usando future a cada iteração.
            item = futures[future]  # Define item como futures[future].
            try:  # Inicia a tentativa de execução com tratamento de falhas.
                future.result()  # Executa o resultado de future.result.
                completed += 1  # Atualiza completed usando 1 na operação acumulada.
                if completed % 25 == 0:  # Verifica completed % 25 == 0 para decidir se executa o bloco.
                    print(json.dumps({'organized': completed, 'total': len(moves)}), flush=True)  # Executa a exibição de a serialização de um dicionário com as chaves 'organized', 'total' para JSON na saída do programa.
            except Exception as error:  # Captura Exception em error para tratar a falha.
                errors.append({'bucket': item['bucket'], 'path': item['target'],  # Executa a inclusão de um dicionário com as chaves 'bucket', 'path', 'error', 'http', 'details' no final da lista.
                    'error': type(error).__name__, 'http': getattr(error, 'code', None),  # Obtém ou executa o resultado de type com error.
                    'details': str(error) if isinstance(error, (AssertionError, ValueError)) else None})  # Obtém ou executa a conversão de error em texto.
    if errors:  # Verifica errors para decidir se executa o bloco.
        save('storage-layout-errors.json', errors)  # Executa o resultado de save com o texto “storage-layout-errors.json” e errors.
        print(json.dumps({'organized': completed, 'errors': errors}, ensure_ascii=False))  # Executa a exibição de a serialização de um dicionário com as chaves 'organized', 'errors' para JSON na saída do programa.
        raise SystemExit(1)  # Lança o resultado de SystemExit com 1 para interromper o fluxo.
    for item in plan['legacy_assets']:  # Percorre plan['legacy_assets'] usando item a cada iteração.
        bucket, old, target = item['bucket'], item['from_path'], item['target']  # Define (bucket, old, target) como uma coleção com 3 elementos.
        remaining = {(o['bucket'], o['path']): o for o in client.storage()}  # Define remaining como uma coleção calculada percorrendo client.storage().
        if (bucket, old) in remaining:  # Verifica (bucket, old) in remaining para decidir se executa o bloco.
            assert (bucket, target) not in remaining, 'Legacy destination already exists'  # Confere (bucket, target) not in remaining, interrompendo o programa se a condição for falsa.
            client.request('/storage/v1/object/move', {'bucketId': bucket, 'sourceKey': old, 'destinationKey': target})  # Executa o resultado de client.request com o texto “/storage/v1/object/move” e um dicionário com as chaves 'bucketId', 'sourceKey', 'destinationKey'.
        assert int(client.info(bucket, target)['metadata']['size']) == item['size']  # Confere int(client.info(bucket, target)['metadata']['size']) == item['size'], interrompendo o programa se a condição for falsa.
        record(item, 'complete')  # Executa o resultado de record com item e o texto “complete”.
    # These zero-byte markers can be recreated; they contain no course content.
    for old in plan['old_placeholders']:  # Percorre plan['old_placeholders'] usando old a cada iteração.
        assert old['size'] == 0 and old['path'].endswith('/.emptyFolderPlaceholder')  # Confere old['size'] == 0 and old['path'].endswith('/.emptyFolderPlaceholder'), interrompendo o programa se a condição for falsa.
        client.remove_old_copy(old['bucket'], old['path'])  # Executa o resultado de client.remove_old_copy com old['bucket'] e old['path'].
    current_objects = {(o['bucket'], o['path']): o for o in client.storage()}  # Define current_objects como uma coleção calculada percorrendo client.storage().
    for folder in plan['empty_folders']:  # Percorre plan['empty_folders'] usando folder a cada iteração.
        if (folder['bucket'], folder['path']) not in current_objects:  # Verifica (folder['bucket'], folder['path']) not in current_objects para decidir se executa o bloco.
            client.request('/storage/v1/object/' + quote(folder['bucket'], safe='') + '/' + quote(folder['path'], safe='/'),  # Executa o resultado de client.request com o resultado da expressão '/storage/v1/object/' + quote(folder['bucket'], safe='') + '/' + quote(folder['path'], safe='/').
                           content=b'', mime='application/octet-stream', method='POST')  # Fornece o argumento content com b''.
    save('storage-layout-errors.json', [])  # Executa o resultado de save com o texto “storage-layout-errors.json” e uma coleção com 0 elementos.
    print(json.dumps({'organized': completed, 'legacy_preserved': len(plan['legacy_assets']), 'errors': []}))  # Executa a exibição de a serialização de um dicionário com as chaves 'organized', 'legacy_preserved', 'errors' para JSON na saída do programa.

def verify(client):  # Declara a função verify com os parâmetros client.
    plan, before = read('storage-layout-plan.json'), read('storage-layout-before.json')  # Define (plan, before) como uma coleção com 2 elementos.
    after = client.tables()  # Define after como o resultado de client.tables.
    objects = {(o['bucket'], o['path']): o for o in client.storage()}  # Define objects como uma coleção calculada percorrendo client.storage().
    changed = {(m['reference']['table'], m['reference']['id']): m['reference'] for m in plan['moves']}  # Define changed como uma coleção calculada percorrendo plan['moves'].
    for table in TABLES:  # Percorre TABLES usando table a cada iteração.
        old_rows, new_rows = {r['id']: r for r in before[table]}, {r['id']: r for r in after[table]}  # Define (old_rows, new_rows) como uma coleção com 2 elementos.
        assert old_rows.keys() == new_rows.keys(), 'Row IDs changed: ' + table  # Confere old_rows.keys() == new_rows.keys(), interrompendo o programa se a condição for falsa.
        for row_id, old in old_rows.items():  # Percorre os pares de chave e valor do dicionário usando (row_id, old) a cada iteração.
            expected = dict(old)  # Define expected como o resultado de dict com old.
            ref = changed.get((table, row_id))  # Define ref como o valor da chave uma coleção com 2 elementos, usando a alternativa se necessário.
            if ref:  # Verifica ref para decidir se executa o bloco.
                expected[ref['column']] = ref['new_value']  # Define expected[ref['column']] como ref['new_value'].
            assert expected == new_rows[row_id], 'Unexpected content change: ' + table  # Confere expected == new_rows[row_id], interrompendo o programa se a condição for falsa.
    for item in plan['moves'] + plan['legacy_assets']:  # Percorre o resultado da expressão plan['moves'] + plan['legacy_assets'] usando item a cada iteração.
        assert objects[(item['bucket'], item['target'])]['size'] == item['size']  # Confere objects[item['bucket'], item['target']]['size'] == item['size'], interrompendo o programa se a condição for falsa.
        assert (item['bucket'], item['from_path']) not in objects, 'Old copy remains'  # Confere (item['bucket'], item['from_path']) not in objects, interrompendo o programa se a condição for falsa.
    assert not any(o['path'].startswith('drive-import/') for o in objects.values()), 'Flat folder remains'  # Confere not any((o['path'].startswith('drive-import/') for o in objects.values())), interrompendo o programa se a condição for falsa.
    for folder in plan['empty_folders']:  # Percorre plan['empty_folders'] usando folder a cada iteração.
        assert (folder['bucket'], folder['path']) in objects, 'Original empty folder missing'  # Confere (folder['bucket'], folder['path']) in objects, interrompendo o programa se a condição for falsa.
    save('storage-layout-after.json', {**after, 'objects': list(objects.values())})  # Executa o resultado de save com o texto “storage-layout-after.json” e um dicionário com as chaves nenhum valor, 'objects'.
    result = {'verified_at': datetime.now(timezone.utc).isoformat(),  # Define result como um dicionário com as chaves 'verified_at', 'counts', 'organized_referenced_files', 'legacy_assets_preserved', 'flat_files_remaining'.
        'counts': {t: len(after[t]) for t in TABLES}, 'organized_referenced_files': len(plan['moves']),  # Obtém ou executa a quantidade de itens de after[t].
        'legacy_assets_preserved': len(plan['legacy_assets']), 'flat_files_remaining': 0,  # Obtém ou executa a quantidade de itens de plan['legacy_assets'].
        'all_references_verified': True, 'all_ids_and_other_fields_preserved': True,  # Fornece o texto “all_references_verified” à expressão.
        'empty_source_folders': len(plan['empty_folders'])}  # Obtém ou executa a quantidade de itens de plan['empty_folders'].
    save('storage-layout-audit.json', result)  # Executa o resultado de save com o texto “storage-layout-audit.json” e result.
    print(json.dumps(result, ensure_ascii=False))  # Executa a exibição de a serialização de result para JSON na saída do programa.

def main():  # Declara a função main com os parâmetros nenhum.
    parser = argparse.ArgumentParser()  # Define parser como o resultado de argparse.ArgumentParser.
    parser.add_argument('mode', choices=['inspect', 'build', 'apply', 'verify'])  # Executa o registro do argumento de linha de comando o texto “mode”.
    parser.add_argument('--key-file', type=Path)  # Executa o registro do argumento de linha de comando o texto “--key-file”.
    parser.add_argument('--cache', type=Path)  # Executa o registro do argumento de linha de comando o texto “--cache”.
    args = parser.parse_args()  # Define args como os argumentos recebidos na linha de comando.
    if args.mode == 'build':  # Verifica args.mode == 'build' para decidir se executa o bloco.
        build()  # Executa o resultado de build.
        return  # Retorna nenhum valor.
    assert args.key_file, 'Server credential file required'  # Confere args.key_file, interrompendo o programa se a condição for falsa.
    client = Client(args.key_file)  # Define client como o resultado de Client com args.key_file.
    if args.mode == 'inspect':  # Verifica args.mode == 'inspect' para decidir se executa o bloco.
        assert not (ROOT / 'storage-layout-before.json').exists(), 'Preserve the first snapshot'  # Confere not (ROOT / 'storage-layout-before.json').exists(), interrompendo o programa se a condição for falsa.
        data = {**client.tables(), 'objects': client.storage()}  # Define data como um dicionário com as chaves nenhum valor, 'objects'.
        save('storage-layout-before.json', data)  # Executa o resultado de save com o texto “storage-layout-before.json” e data.
        print(json.dumps({'rows': {t: len(data[t]) for t in TABLES}, 'objects': len(data['objects'])}))  # Executa a exibição de a serialização de um dicionário com as chaves 'rows', 'objects' para JSON na saída do programa.
    elif args.mode == 'apply':  # Verifica args.mode == 'apply' para decidir se executa o bloco.
        assert args.cache, 'Local cache required for the original Excel cover'  # Confere args.cache, interrompendo o programa se a condição for falsa.
        apply(client, args.cache)  # Executa o resultado de apply com client e args.cache.
    else:  # Executa a alternativa quando a condição anterior não foi atendida.
        verify(client)  # Executa o resultado de verify com client.

if __name__ == '__main__':  # Verifica __name__ == '__main__' para decidir se executa o bloco.
    main()  # Executa o resultado de main.
