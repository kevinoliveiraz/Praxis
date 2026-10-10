"""Materialize connector-issued Drive references without logging temporary URLs."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request
import time

def download_once(item, root):
    name = item['id'] + item['extension']
    destination = (root / item['bucket'] / name).resolve()
    if not destination.is_relative_to(root.resolve()):
        raise ValueError('Destination outside import cache')
    destination.parent.mkdir(parents=True, exist_ok=True)
    expected = int(item['size'])
    if destination.exists() and destination.stat().st_size == expected:
        return {'id': item['id'], 'path': str(destination), 'size': expected,
                'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'cached': True}
    url = item['download_url']
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != 'https' or not parsed.hostname.endswith('.oaiusercontent.com'):
        raise ValueError('Expected an authenticated connector download reference')
    request = urllib.request.Request(url, headers={'User-Agent': 'Praxis content import'})
    with urllib.request.urlopen(request, timeout=25) as response:
        content = response.read()
    if len(content) != expected:
        raise ValueError(f'Downloaded size differs from Drive metadata: expected={expected}, actual={len(content)}, type={response.headers.get("Content-Type")}, magic={content[:12].hex()}')
    destination.write_bytes(content)
    return {'id': item['id'], 'path': str(destination), 'size': len(content),
            'sha256': hashlib.sha256(content).hexdigest(), 'cached': False}

def download(item, root):
    for attempt in range(3):
        try:
            return download_once(item, root)
        except (OSError, ValueError, urllib.error.URLError):
            if attempt == 2:
                raise
            time.sleep(1 + attempt)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('references', type=Path)
    parser.add_argument('cache', type=Path)
    args = parser.parse_args()
    references = json.loads(args.references.read_text(encoding='utf-8-sig'))
    receipt_path = args.cache / 'download-receipts.json'
    receipts = json.loads(receipt_path.read_text(encoding='utf-8')) if receipt_path.exists() else {}
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(download, item, args.cache): item for item in references}
        for future in concurrent.futures.as_completed(futures):
            item = futures[future]
            try:
                result = future.result()
                receipts[item['id']] = result
                if not result['cached'] and len(receipts) % 16 == 0:
                    print(json.dumps({'cached_total': len(receipts)}), flush=True)
            except Exception as error:
                errors.append({'id': item['id'], 'error': type(error).__name__,
                               'status': getattr(error, 'code', None),
                               'details': str(error) if isinstance(error, ValueError) else None})
    args.cache.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipts, indent=2), encoding='utf-8')
    print(json.dumps({'requested': len(references), 'complete': len(references)-len(errors),
                      'cached_total': len(receipts), 'errors': errors}, ensure_ascii=False))
    if errors:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
