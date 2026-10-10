"""Upload only missing content files; credentials never enter source or receipts."""
import argparse
import concurrent.futures
import hashlib
import json
import importlib.util
from pathlib import Path
import re
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = 'https://fxpmeosnnrgqdelffnvy.supabase.co'
BUCKETS = ('slides','materiais','storage capas')
_layout_spec=importlib.util.spec_from_file_location('storage_layout',Path(__file__).with_name('storage-layout.py'))
_layout=importlib.util.module_from_spec(_layout_spec)
_layout_spec.loader.exec_module(_layout)
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('cache',type=Path)
    parser.add_argument('key_file',type=Path)
    parser.add_argument('--verify-only',action='store_true')
    args=parser.parse_args()
    plan_path=Path(__file__).with_name('import-plan.json')
    plan=json.loads(plan_path.read_text(encoding='utf-8'))
    key=args.key_file.read_text(encoding='utf-8').strip()
    if not key.startswith('sb_secret_'): raise ValueError('Server credential required')
    opener=urllib.request.build_opener(NoRedirect())
    def request(path,body=None,mime='application/json',method=None):
        req=urllib.request.Request(BASE+path,data=body,method=method,
          headers={'apikey':key,'Content-Type':mime,'x-upsert':'false','User-Agent':'Praxis content import'})
        with opener.open(req,timeout=45) as response:
            return json.loads(response.read())
    def stored_files():
        return {(o['bucket'],o['path']):o['size'] for o in _layout.Client(args.key_file).storage()}
    existing=stored_files()
    receipts={}
    receipt_path=plan_path.with_name('upload-receipts.json')
    if receipt_path.exists(): receipts=json.loads(receipt_path.read_text(encoding='utf-8'))
    def upload(item):
        bucket,target=item['bucket'],item['target']
        if bucket not in BUCKETS or target!=_layout.storage_path(item['path']):
            raise ValueError('Unexpected upload destination')
        source=(args.cache/bucket/(item['id']+item['extension'])).resolve()
        if not source.is_relative_to(args.cache.resolve()): raise ValueError('Source outside cache')
        content=source.read_bytes()
        if len(content)!=item['size']: raise ValueError('Local file size mismatch')
        if (bucket,target) in existing:
            if existing[(bucket,target)]!=item['size']: raise ValueError('Existing file size mismatch; overwrite refused')
            action='already_uploaded'
        elif args.verify_only:
            raise ValueError('Missing stored file')
        else:
            for attempt in range(3):
                try:
                    request('/storage/v1/object/'+urllib.parse.quote(bucket,safe='')+'/'+urllib.parse.quote(target,safe='/'),content,item['mime_type'])
                    break
                except (OSError,urllib.error.URLError):
                    if attempt==2: raise
                    time.sleep(attempt+1)
            action='uploaded'
        return {'drive_id':item['id'],'source':item['path'],'bucket':bucket,'path':target,
                'size':len(content),'sha256':hashlib.sha256(content).hexdigest(),'action':action}
    errors=[]
    complete=0
    available=[i for i in plan['uploads'] if (args.cache/i['bucket']/(i['id']+i['extension'])).exists()]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures={pool.submit(upload,item):item for item in available}
        for future in concurrent.futures.as_completed(futures):
            item=futures[future]
            try:
                receipts[item['id']]=future.result()
                complete+=1
                if complete%25==0: print(json.dumps({'checked':complete,'available':len(available)}),flush=True)
            except Exception as error:
                errors.append({'id':item['id'],'error':type(error).__name__,'http':getattr(error,'code',None),
                    'details':str(error) if isinstance(error,ValueError) else None})
    receipt_path.write_text(json.dumps(receipts,ensure_ascii=False,indent=2),encoding='utf-8')
    after=stored_files()
    verified=[i for i in plan['uploads'] if after.get((i['bucket'],i['target']))==i['size']]
    print(json.dumps({'planned':len(plan['uploads']),'available':len(available),'processed':complete,
       'verified':len(verified),'missing':[i['id'] for i in plan['uploads'] if i not in verified],
       'errors':errors},ensure_ascii=False),flush=True)
    if errors or len(verified)!=len(plan['uploads']): raise SystemExit(1)

if __name__=='__main__':
    main()
