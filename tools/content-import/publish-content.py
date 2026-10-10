"""Publish the reviewed payload in one transaction using the restricted RPC."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent
BASE = 'https://fxpmeosnnrgqdelffnvy.supabase.co'

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

parser = argparse.ArgumentParser()
parser.add_argument('key_file', type=Path)
args = parser.parse_args()
key = args.key_file.read_text(encoding='utf-8').strip()
assert key.startswith('sb_secret_'), 'A server credential is required'
payload = (ROOT / 'import-payload.json').read_bytes()
opener = urllib.request.build_opener(NoRedirect())
request = urllib.request.Request(
    BASE + '/rest/v1/rpc/praxis_import_drive_20261009', data=payload,
    headers={'apikey': key, 'Content-Type': 'application/json', 'User-Agent': 'Praxis content import'},
    method='POST',
)
try:
    with opener.open(request, timeout=120) as response:
        result = json.loads(response.read())
except urllib.error.HTTPError as error:
    # This fixed RPC returns only database diagnostics, never credentials.
    print(json.dumps({'http': error.code, 'database_error': error.read().decode('utf-8')}, ensure_ascii=False))
    raise SystemExit(1)
result['completed_at'] = datetime.now(timezone.utc).isoformat()
(ROOT / 'publication-receipt.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
