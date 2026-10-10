"""Mirror Drive paths in Storage while preserving every lesson and file.

Run inspect first, then build, apply and verify. A file is copied and checked,
its existing database row is updated with an expected-value guard, and only
then is the old copy removed. This keeps a valid file at the registered path.
No bucket permissions, lesson IDs, progress or authentication data are changed.
"""
import argparse
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import json
from pathlib import Path, PurePosixPath
import re
import threading
import time
import unicodedata
from urllib.parse import quote, unquote, urlencode
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent
BASE = 'https://fxpmeosnnrgqdelffnvy.supabase.co'
BUCKETS = ('slides', 'materiais', 'storage capas')
TABLES = ('catalogo', 'modulos', 'aulas', 'slides', 'materiais')

def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8-sig'))

def save(name, value):
    destination = ROOT / name
    temporary = destination.with_suffix(destination.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(destination)

def storage_path(source):
    # Supabase currently accepts only ASCII S3-safe characters for object keys.
    result = ''.join(c for c in unicodedata.normalize('NFD', source)
                     if not unicodedata.combining(c))
    result = result.replace('—', '-').replace('–', '-')
    result = re.sub(r"[^A-Za-z0-9_/!.*'() &$=@;:+,?-]", '_', result)
    assert result and all(p not in ('', '.', '..') for p in result.split('/'))
    return result

def cover_url(path):
    return BASE + '/storage/v1/object/public/storage%20capas/' + quote(path, safe='/')

def same_checksum(original, copied):
    if not original or not copied:
        return False
    original, copied = original.strip('"'), copied.strip('"')
    if original == copied:
        return True
    # CopyObject changes a one-part multipart ETag into the full-file MD5.
    # Its old composite checksum is MD5(binary file MD5) followed by '-1'.
    if re.fullmatch(r'[a-fA-F0-9]{32}-1', original) and re.fullmatch(r'[a-fA-F0-9]{32}', copied):
        return hashlib.md5(bytes.fromhex(copied)).hexdigest() + '-1' == original.lower()
    return False

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class Client:
    def __init__(self, key_file):
        self.key = key_file.read_text(encoding='utf-8').strip()
        assert self.key.startswith('sb_secret_'), 'Existing server credential required'
        self.opener = urllib.request.build_opener(NoRedirect())

    def request(self, path, payload=None, method=None, content=None, mime=None, prefer=None):
        assert path.startswith(('/storage/v1/', '/rest/v1/'))
        headers = {'apikey': self.key, 'User-Agent': 'Praxis storage organization'}
        body = content
        if payload is not None:
            body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
            headers['Content-Type'] = 'application/json'
        if mime:
            headers['Content-Type'] = mime
            headers['x-upsert'] = 'false'
        if prefer:
            headers['Prefer'] = prefer
        for attempt in range(3):
            try:
                request = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
                with self.opener.open(request, timeout=60) as response:
                    data = response.read()
                    return json.loads(data) if data else None
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise
            except urllib.error.URLError:
                if attempt == 2:
                    raise
            time.sleep(attempt + 1)

    def tables(self):
        return {t: self.request(f'/rest/v1/{t}?select=*&order=id.asc&limit=1000') for t in TABLES}

    def storage(self):
        objects = []
        for bucket in BUCKETS:
            cursor = None
            while True:
                options = {'prefix': '', 'limit': 1000, 'with_delimiter': False,
                           'sortBy': {'column': 'name', 'order': 'asc'}}
                if cursor:
                    options['cursor'] = cursor
                # V2 returns authoritative full keys; the folder listing can
                # merge paths that differ only in case during this migration.
                result = self.request('/storage/v1/object/list-v2/' + quote(bucket, safe=''), options)
                for item in result['objects']:
                    objects.append({'bucket': bucket, 'path': item['name'],
                        'size': int((item.get('metadata') or {}).get('size', 0)),
                        'metadata': item.get('metadata') or {}, 'object_id': item['id']})
                if not result['hasNext']:
                    break
                cursor = result['nextCursor']
        return objects

    def info(self, bucket, path):
        info = self.request('/storage/v1/object/info/' + quote(bucket, safe='') + '/' + quote(path, safe='/'))
        # Storage's current FileObjectV2 exposes size/etag at the top level.
        if not info.get('metadata'):
            info['metadata'] = {'size': info['size'], 'eTag': info.get('etag'),
                                'mimetype': info.get('content_type')}
        return info

    def relocate_copy(self, bucket, source, target):
        return self.request('/storage/v1/object/copy',
            {'bucketId': bucket, 'sourceKey': source, 'destinationKey': target})

    def remove_old_copy(self, bucket, path):
        return self.request('/storage/v1/object/' + quote(bucket, safe=''),
                            {'prefixes': [path]}, method='DELETE')

def build():
    inventory, imported, before = read('drive-inventory.json'), read('import-plan.json'), read('storage-layout-before.json')
    objects = {(o['bucket'], o['path']): o for o in before['objects']}
    links = {(x['bucket'], x['path']): x for x in imported['links']}
    files = {x['id']: x for x in inventory['items'] if x['mime_type'] != 'application/vnd.google-apps.folder'}
    lessons = {l['id']: l for c in imported['courses'] for l in c['lessons']}
    moves, legacy = [], []
    for table, column, bucket in [('slides', 'imagem_path', 'slides'), ('materiais', 'arquivo_path', 'materiais'),
                                   ('catalogo', 'imagem_capa_url', 'storage capas')]:
        for row in before[table]:
            original = row[column]
            old_path = unquote(original.split('/object/public/storage%20capas/', 1)[1]) if table == 'catalogo' else original
            obj = objects[(bucket, old_path)]
            linked = links.get((bucket, old_path))
            source, source_id = None, None
            action, size = 'relocate', obj['size']
            if linked:
                source_id = linked['drive_id']
                item = files[source_id]
                source = item['path']
                if obj['size'] != int(item['size']):
                    assert table == 'catalogo' and row['id'] == 1, 'Unexpected difference from Drive'
                    action, size = 'original_upload', int(item['size'])
                    legacy.append({'bucket': bucket, 'from_path': old_path,
                        'target': 'EXCEL/CAPA/' + PurePosixPath(old_path).name, 'size': obj['size']})
            else:
                assert bucket == 'slides' and old_path.startswith('excel/conteudo/'), 'Unmapped file'
                lesson = lessons[row['aula_id']]
                archive = next(m for m in lesson['materials'] if m['tipo'] == 'ZIP')
                item = files[archive['drive_id']]
                source = str(PurePosixPath(item['path']).parent / PurePosixPath(old_path).name)
            target = storage_path(source)
            new_value = cover_url(target) if table == 'catalogo' else target
            moves.append({'bucket': bucket, 'from_path': old_path, 'target': target,
                'size': size, 'source': source, 'drive_id': source_id, 'action': action,
                'reference': {'table': table, 'id': row['id'], 'column': column,
                              'old_value': original, 'new_value': new_value}})
    destinations = [(m['bucket'], m['target']) for m in moves + legacy]
    assert len(destinations) == len(set(destinations)), 'Names collide after normalization'
    source_ids = {m['drive_id'] for m in moves if m['drive_id']}
    assert source_ids == set(files), 'A Drive file is not represented'
    assert len([m for m in moves if not m['drive_id']]) == 53, 'Unexpected archive-derived slides'
    assert not any((m['bucket'], m['target']) in objects for m in moves + legacy), 'A destination already exists'
    empty_folders = []
    for item in inventory['items']:
        if item['mime_type'] != 'application/vnd.google-apps.folder':
            continue
        path = item['path']
        if any(f['path'].startswith(path + '/') for f in files.values()):
            continue
        bucket = 'storage capas' if re.search(r'/CAPAS?(?:/|$)', path) else 'materiais' if 'MATERIAL' in path or 'EXTERNO' in path else 'slides'
        empty_folders.append({'bucket': bucket, 'path': storage_path(path) + '/.emptyFolderPlaceholder'})
    plan = {'project_ref': 'fxpmeosnnrgqdelffnvy', 'created_at': datetime.now(timezone.utc).isoformat(),
            'moves': moves, 'legacy_assets': legacy, 'empty_folders': empty_folders,
            'old_placeholders': [o for o in before['objects'] if o['path'].endswith('/.emptyFolderPlaceholder') and o['size'] == 0]}
    save('storage-layout-plan.json', plan)
    print(json.dumps({'files': len(moves), 'legacy_preserved': len(legacy),
        'source_files': len(source_ids), 'empty_folders': len(empty_folders),
        'examples': [m['target'] for m in moves if m['bucket'] == 'materiais'][:6]}, ensure_ascii=False))

def apply(client, cache):
    plan = read('storage-layout-plan.json')
    assert plan['project_ref'] == 'fxpmeosnnrgqdelffnvy'
    current = client.tables()
    objects = {(o['bucket'], o['path']): o for o in client.storage()}
    receipts = read('storage-layout-receipts.json') if (ROOT / 'storage-layout-receipts.json').exists() else {}
    receipt_lock = threading.Lock()

    def record(item, phase, info=None):
        ref = item.get('reference', {})
        key = item['bucket'] + '/' + item['from_path']
        with receipt_lock:
            receipts[key] = {'bucket': item['bucket'], 'old_path': item['from_path'],
                'path': item['target'], 'size': item['size'], 'phase': phase,
                'table': ref.get('table'), 'row_id': ref.get('id'),
                'updated_at': datetime.now(timezone.utc).isoformat()}
            if info:
                receipts[key]['metadata'] = info.get('metadata') or {}
            save('storage-layout-receipts.json', receipts)

    def work(item):
        bucket, old, target = item['bucket'], item['from_path'], item['target']
        assert bucket in BUCKETS and target == storage_path(target)
        ref = item['reference']
        row = next(r for r in current[ref['table']] if r['id'] == ref['id'])
        assert row[ref['column']] in (ref['old_value'], ref['new_value']), 'Reference changed externally'
        old_object, new_object = objects.get((bucket, old)), objects.get((bucket, target))
        owned_copy = receipts.get(bucket + '/' + old)
        if new_object and not owned_copy:
            # Recover a verified copy after an interrupted run. The first snapshot
            # established that every destination was absent; accept only identical
            # bytes, without overwriting anything or changing a foreign reference.
            assert old_object, 'An unrecorded destination has no original'
            assert new_object['size'] == item['size'], 'Unrecorded destination size differs'
            if item['action'] == 'original_upload':
                source = cache / 'storage capas' / (item['drive_id'] + '.png')
                expected_etag = '"' + hashlib.md5(source.read_bytes()).hexdigest() + '"'
            else:
                expected_etag = old_object['metadata'].get('eTag')
            assert same_checksum(expected_etag, new_object['metadata'].get('eTag')), 'Unrecorded destination checksum differs'
            record(item, 'recovered_verified_copy', {'metadata': new_object['metadata']})
        if not new_object:
            assert old_object, 'Original file is missing'
            if item['action'] == 'original_upload':
                path = (cache / 'storage capas' / (item['drive_id'] + '.png')).resolve()
                assert path.is_relative_to(cache.resolve()), 'Source outside cache'
                content = path.read_bytes()
                assert len(content) == item['size'] and content.startswith(b'\x89PNG\r\n\x1a\n')
                client.request('/storage/v1/object/' + quote(bucket, safe='') + '/' + quote(target, safe='/'),
                               content=content, mime='image/png', method='POST')
            else:
                client.relocate_copy(bucket, old, target)
        info = client.info(bucket, target)
        metadata = info.get('metadata') or {}
        assert int(metadata['size']) == item['size'], 'Destination size mismatch'
        if old_object and item['action'] != 'original_upload':
            old_etag, new_etag = old_object['metadata'].get('eTag'), metadata.get('eTag')
            if old_etag and new_etag:
                assert same_checksum(old_etag, new_etag), 'Copy checksum mismatch'
        record(item, 'copied_and_verified', info)
        if row[ref['column']] != ref['new_value']:
            filters = urlencode({'id': 'eq.' + str(ref['id']), ref['column']: 'eq.' + ref['old_value'], 'select': 'id,' + ref['column']})
            updated = client.request('/rest/v1/' + ref['table'] + '?' + filters,
                {ref['column']: ref['new_value']}, method='PATCH', prefer='return=representation')
            assert len(updated) == 1 and updated[0][ref['column']] == ref['new_value'], 'Reference update conflicted'
        record(item, 'reference_updated', info)
        # Keep Excel's distinct older JPEG until it is moved to its CAPA folder.
        if old_object and item['action'] != 'original_upload' and old != target:
            client.remove_old_copy(bucket, old)
        record(item, 'complete', info)
        return item

    errors, completed = [], 0
    moves = sorted(plan['moves'], key=lambda m: (m['bucket'] != 'materiais', m['bucket'], m['target']))
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(work, item): item for item in moves}
        for future in as_completed(futures):
            item = futures[future]
            try:
                future.result()
                completed += 1
                if completed % 25 == 0:
                    print(json.dumps({'organized': completed, 'total': len(moves)}), flush=True)
            except Exception as error:
                errors.append({'bucket': item['bucket'], 'path': item['target'],
                    'error': type(error).__name__, 'http': getattr(error, 'code', None),
                    'details': str(error) if isinstance(error, (AssertionError, ValueError)) else None})
    if errors:
        save('storage-layout-errors.json', errors)
        print(json.dumps({'organized': completed, 'errors': errors}, ensure_ascii=False))
        raise SystemExit(1)
    for item in plan['legacy_assets']:
        bucket, old, target = item['bucket'], item['from_path'], item['target']
        remaining = {(o['bucket'], o['path']): o for o in client.storage()}
        if (bucket, old) in remaining:
            assert (bucket, target) not in remaining, 'Legacy destination already exists'
            client.request('/storage/v1/object/move', {'bucketId': bucket, 'sourceKey': old, 'destinationKey': target})
        assert int(client.info(bucket, target)['metadata']['size']) == item['size']
        record(item, 'complete')
    # These zero-byte markers can be recreated; they contain no course content.
    for old in plan['old_placeholders']:
        assert old['size'] == 0 and old['path'].endswith('/.emptyFolderPlaceholder')
        client.remove_old_copy(old['bucket'], old['path'])
    current_objects = {(o['bucket'], o['path']): o for o in client.storage()}
    for folder in plan['empty_folders']:
        if (folder['bucket'], folder['path']) not in current_objects:
            client.request('/storage/v1/object/' + quote(folder['bucket'], safe='') + '/' + quote(folder['path'], safe='/'),
                           content=b'', mime='application/octet-stream', method='POST')
    save('storage-layout-errors.json', [])
    print(json.dumps({'organized': completed, 'legacy_preserved': len(plan['legacy_assets']), 'errors': []}))

def verify(client):
    plan, before = read('storage-layout-plan.json'), read('storage-layout-before.json')
    after = client.tables()
    objects = {(o['bucket'], o['path']): o for o in client.storage()}
    changed = {(m['reference']['table'], m['reference']['id']): m['reference'] for m in plan['moves']}
    for table in TABLES:
        old_rows, new_rows = {r['id']: r for r in before[table]}, {r['id']: r for r in after[table]}
        assert old_rows.keys() == new_rows.keys(), 'Row IDs changed: ' + table
        for row_id, old in old_rows.items():
            expected = dict(old)
            ref = changed.get((table, row_id))
            if ref:
                expected[ref['column']] = ref['new_value']
            assert expected == new_rows[row_id], 'Unexpected content change: ' + table
    for item in plan['moves'] + plan['legacy_assets']:
        assert objects[(item['bucket'], item['target'])]['size'] == item['size']
        assert (item['bucket'], item['from_path']) not in objects, 'Old copy remains'
    assert not any(o['path'].startswith('drive-import/') for o in objects.values()), 'Flat folder remains'
    for folder in plan['empty_folders']:
        assert (folder['bucket'], folder['path']) in objects, 'Original empty folder missing'
    save('storage-layout-after.json', {**after, 'objects': list(objects.values())})
    result = {'verified_at': datetime.now(timezone.utc).isoformat(),
        'counts': {t: len(after[t]) for t in TABLES}, 'organized_referenced_files': len(plan['moves']),
        'legacy_assets_preserved': len(plan['legacy_assets']), 'flat_files_remaining': 0,
        'all_references_verified': True, 'all_ids_and_other_fields_preserved': True,
        'empty_source_folders': len(plan['empty_folders'])}
    save('storage-layout-audit.json', result)
    print(json.dumps(result, ensure_ascii=False))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['inspect', 'build', 'apply', 'verify'])
    parser.add_argument('--key-file', type=Path)
    parser.add_argument('--cache', type=Path)
    args = parser.parse_args()
    if args.mode == 'build':
        build()
        return
    assert args.key_file, 'Server credential file required'
    client = Client(args.key_file)
    if args.mode == 'inspect':
        assert not (ROOT / 'storage-layout-before.json').exists(), 'Preserve the first snapshot'
        data = {**client.tables(), 'objects': client.storage()}
        save('storage-layout-before.json', data)
        print(json.dumps({'rows': {t: len(data[t]) for t in TABLES}, 'objects': len(data['objects'])}))
    elif args.mode == 'apply':
        assert args.cache, 'Local cache required for the original Excel cover'
        apply(client, args.cache)
    else:
        verify(client)

if __name__ == '__main__':
    main()
