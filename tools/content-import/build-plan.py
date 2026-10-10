"""Compare the supplied Drive tree with a read-only Supabase content export."""
import json
from pathlib import Path, PurePosixPath
import importlib.util
import re
import unicodedata
from urllib.parse import unquote
import zipfile

ROOT = Path(__file__).resolve().parent
_layout_spec = importlib.util.spec_from_file_location('storage_layout', ROOT/'storage-layout.py')
_layout = importlib.util.module_from_spec(_layout_spec)
_layout_spec.loader.exec_module(_layout)
storage_path = _layout.storage_path
DRIVE = json.loads((ROOT/'drive-inventory.json').read_text(encoding='utf-8-sig'))
DB = json.loads((ROOT/'supabase-before.json').read_text(encoding='utf-8-sig'))
DB = {key: value or [] for key, value in DB.items()}
COURSES = [
    ('EXCEL',1,'Excel','excel'),('WORD',2,'Word','word'),
    ('POWER POINT',3,'PowerPoint','power-point'),('POWER BI',4,'Power BI','power-bi'),
    ('OUTLOOK',5,'Outlook','outlook'),('CHAT GPT',6,'ChatGPT','chat-gpt'),
    ('TEAMS',7,'Teams','teams'),('CLAUDE',8,'Claude na Prática','claude'),
    ('COPILOT',9,'Copilot na Prática','copilot'),('GEMINI',10,'Gemini na Prática','gemini'),
    ('INVESTIMENTO PESSOAL',11,'Investimentos Pessoais','investimentos-pessoais'),
    ('ORATORIA',12,'Oratória na Prática','oratoria'),
    ('PROJETOS PRATICOS',13,'Projetos Práticos','projetos-praticos'),
    ('SOFT SKILLS',14,'Soft Skills na Prática','soft-skills'),
    ('VIBE CODING',15,'Vibe Coding','vibe-coding'),
    ('TRANSIÇÃO DE CARREIRA',16,'Transição de Carreira','transicao-de-carreira'),
    ('LINKEDIN, CURRICULO E ENTREVISTAS',17,'LinkedIn, Currículo e Entrevistas','linkedin-curriculo-entrevistas'),
    ('POWE AUTOMATE',18,'Power Automate na Prática','power-automate'),
    ('SUCESSO DO CLIENTE',19,'Sucesso do Cliente','sucesso-do-cliente'),
    ('PROCESSOS E MELHORIA CONTINUA',20,'Processos e Melhoria Contínua','processos-melhoria-continua'),
    ('COMUNICAÇÃO ESCRITA CORPORATIVA',21,'Comunicação Escrita Corporativa','comunicacao-escrita'),
    ('AGENTES DE IA NA PRATICA',22,'Agentes de IA na Prática','agentes-ia'),
    ('STORYTELLING NA PRATICA',23,'Storytelling na Prática','storytelling'),
]

def norm(text):
    text = ''.join(c for c in unicodedata.normalize('NFD',str(text)) if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+','-',text.lower()).strip('-')

def lesson_key(path):
    for part in path.split('/'):
        key = norm(part)
        if re.fullmatch(r'pratica-\d+',key) or key in ('introducao','conhecendo-excel'):
            return key
    return 'pratica-01'

def lesson_sort(key):
    if key == 'conhecendo-excel': return -2
    if key == 'introducao': return -1
    return int(key.rsplit('-',1)[1])

def lesson_name(key):
    if key == 'conhecendo-excel': return 'Conhecendo Excel'
    if key == 'introducao': return 'Introdução'
    return f'Prática {int(key.rsplit("-",1)[1]):02d}'

def page(name):
    match = re.match(r'^(\d+)',name)
    return int(match.group(1)) if match else 10000

def extension(item):
    ext = Path(item['name']).suffix.lower()
    return ext or {'image/png':'.png','image/jpeg':'.jpg'}.get(item['mime_type'],'')

uploads = {}
links = []
issues = []
courses = []
next_ids = {t:max([x['id'] for x in DB[t]]+[0])+1 for t in ('catalogo','modulos','aulas','slides','materiais')}
def new_id(table):
    value = next_ids[table]
    next_ids[table] += 1
    return value

def stage(item,bucket):
    target = storage_path(item['path'])
    uploads[item['id']] = {**item,'bucket':bucket,'target':target,'extension':extension(item)}
    links.append({'drive_id':item['id'],'bucket':bucket,'path':target,'source':item['path'],'action':'upload'})
    return target

object_lookup = {(x['bucket'],x['name']):x for x in DB['objects']}
for source_title,course_id,title,slug in COURSES:
    source = next(x for x in DRIVE['courses'] if x['title']==source_title)
    files = [x for x in DRIVE['items'] if x['course_id']==source['id'] and x['mime_type']!='application/vnd.google-apps.folder']
    cover = [x for x in files if any(norm(p) in ('capa','capas') for p in x['path'].split('/')[1:-1]) or x['name']=='CAPA.png']
    assert len(cover)==1,(source_title,'cover count',len(cover))
    existing = next((x for x in DB['catalogo'] if x['id']==course_id),None)
    cover_path = ''
    if existing:
        encoded = existing.get('imagem_capa_url','').split('/object/public/storage%20capas/')[-1]
        original = unquote(encoded)
        candidates = [x for x in DB['objects'] if x['bucket']=='storage capas' and re.sub(r'\s+',' ',x['name'])==re.sub(r'\s+',' ',original)]
        if len(candidates)==1 and int(candidates[0]['size'])==int(cover[0]['size']):
            cover_path = storage_path(cover[0]['path'])
            links.append({'drive_id':cover[0]['id'],'bucket':'storage capas','path':cover_path,'source':cover[0]['path'],'action':'reuse'})
    if not cover_path: cover_path = stage(cover[0],'storage capas')
    module = next((x for x in DB['modulos'] if x['curso_id']==course_id),None)
    module_id = module['id'] if module else new_id('modulos')
    content = [x for x in files if x not in cover]
    lesson_keys = set(lesson_key(x['path']) for x in content if '/CONTEUDO/' in x['path'] or re.search(r'/PRATICA \d+/',x['path']))
    assert lesson_keys,(title,'no lessons')
    planned_lessons=[]
    for lesson_order,key in enumerate(sorted(lesson_keys,key=lesson_sort),1):
        old = next((x for x in DB['aulas'] if x['modulo_id']==module_id and norm(x['nome'])==key),None)
        lesson_id = old['id'] if old else new_id('aulas')
        source_files=[x for x in content if lesson_key(x['path'])==key and '/EXTERNO/' not in x['path'] and '/MATERIAL' not in x['path']]
        images=sorted([x for x in source_files if x['mime_type'].startswith('image/')],key=lambda x:(page(x['name']),x['name']))
        archives=[x for x in source_files if 'zip' in x['mime_type']]
        old_slides=sorted([x for x in DB['slides'] if x['aula_id']==lesson_id],key=lambda x:x['ordem'])
        planned_slides=[]
        if archives:
            # Excel's original archives are preserved as downloads; existing extracted slides stay intact.
            stored=[x for x in DB['objects'] if x['bucket']=='slides' and x['name'].startswith(f'excel/conteudo/{key}/') and x['mimetype'].startswith('image/')]
            for order,obj in enumerate(sorted(stored,key=lambda x:page(Path(x['name']).name)),1):
                prior=next((x for x in old_slides if x['imagem_path']==obj['name']),None)
                target = storage_path(str(PurePosixPath(archives[0]['path']).parent / PurePosixPath(obj['name']).name))
                planned_slides.append({'id':prior['id'] if prior else new_id('slides'),'aula_id':lesson_id,'ordem':order,'titulo':f'{lesson_name(key)} — Slide {order}','imagem_path':target,'status':'publicado','existing':prior is not None})
            for archive in archives:
                cached=Path('C:/Users/Aluno/AppData/Local/Temp/praxis-drive-import-20261009/files/materiais')/(archive['id']+'.zip')
                if not cached.exists():
                    issues.append({'course':title,'lesson':lesson_name(key),'type':'archive_pending_verification'})
                    continue
                entries=zipfile.ZipFile(cached).infolist()
                assert len(entries)==len(stored),(title,key,'archive page count mismatch')
                assert all(any(Path(x['name']).name==entry.filename and int(x['size'])==entry.file_size for x in stored) for entry in entries),(title,key,'archive files mismatch')
        else:
            for order,item in enumerate(images,1):
                # Match only a specific course, lesson and page; filenames in different lessons may repeat.
                matching=[x for x in DB['objects'] if x['bucket']=='slides' and x['name'].startswith(f'{slug}/conteudo/{key}/') and (norm(Path(x['name']).name)==norm(item['name']) or (page(Path(x['name']).name)==page(item['name']) and page(item['name'])!=10000))]
                if len(matching)>1: raise ValueError(('Ambiguous storage match',item['path']))
                target=matching[0]['name'] if matching else stage(item,'slides')
                if matching: links.append({'drive_id':item['id'],'bucket':'slides','path':target,'source':item['path'],'action':'reuse'})
                prior=next((x for x in old_slides if x['imagem_path']==target),None)
                # Repair a broken stored path by source page number, while preserving the row id.
                if prior is None:
                    prior=next((x for x in old_slides if page(Path(x['imagem_path']).name)==page(item['name']) and ('slides',x['imagem_path']) not in object_lookup),None)
                if prior is None:
                    prior=next((x for x in old_slides if ('slides',x['imagem_path']) not in object_lookup and not any(s['id']==x['id'] for s in planned_slides)),None)
                planned_slides.append({'id':prior['id'] if prior else new_id('slides'),'aula_id':lesson_id,'ordem':order,'titulo':f'{lesson_name(key)} — '+('Bônus' if page(item['name'])==10000 else f'Slide {order}'),'imagem_path':target,'status':'publicado','existing':prior is not None})
                # Match old rows before replacing their paths with the original Drive hierarchy.
                planned_slides[-1]['imagem_path'] = storage_path(item['path'])
                if matching:
                    links[-1]['path'] = storage_path(item['path'])
            numbered=[page(x['name']) for x in images if page(x['name'])!=10000]
            if numbered:
                missing=[n for n in range(min(numbered),max(numbered)+1) if n not in numbered]
                if missing: issues.append({'course':title,'lesson':lesson_name(key),'type':'source_gap','pages':missing})
        for prior in old_slides:
            if not any(s['id']==prior['id'] for s in planned_slides):
                if ('slides',prior['imagem_path']) not in object_lookup:
                    issues.append({'course':title,'lesson':lesson_name(key),'type':'broken_reference','slide_id':prior['id'],'path':prior['imagem_path']})
                else:
                    # Keep valid existing pages absent from the Drive rather than removing content.
                    planned_slides.append({**prior,'existing':True})
        planned_lessons.append({'id':lesson_id,'key':key,'nome':old['nome'] if old else lesson_name(key),'modulo_id':module_id,'descricao':old['descricao'] if old else f'{lesson_name(key)} de {title}, com o conteúdo original da Praxis.','ordem':old['ordem'] if old else lesson_order,'status':'publicado','existing':old is not None,'slides':planned_slides,'materials':[]})
    for item in content:
        is_archive='zip' in item['mime_type']
        is_supplement=not item['mime_type'].startswith('image/') or (source_title=='EXCEL' and '/PRATICA 01/' in item['path'])
        if not is_supplement: continue
        target=stage(item,'materiais')
        practice = re.search(r'(?:PRATICA|PRT)[ _-]*0*(\d+)',item['name'],re.I)
        selected_key=f'pratica-{int(practice.group(1)):02d}' if practice else lesson_key(item['path'])
        if source_title=='WORD':
            selected_key={'Comunicado_Interno_Sem_Formatacao.docx':'pratica-01','Relatorio_Institucional_Para_Correcao.docx':'pratica-02','Relatorio_Cliente_Para_Revisao.docx':'pratica-04'}[item['name']]
        if source_title=='PROJETOS PRATICOS': selected_key='pratica-02'
        chosen=next((x for x in planned_lessons if x['key']==selected_key),planned_lessons[0])
        chosen['materials'].append({'id':new_id('materiais'),'aula_id':chosen['id'],'nome':item['name'] if not is_archive else f'{chosen["nome"]} — apresentação original (ZIP)','arquivo_path':target,'tipo':extension(item).lstrip('.').upper(),'ordem':len(chosen['materials'])+1,'status':'publicado','drive_id':item['id']})
    courses.append({'id':course_id,'nome':existing['nome'] if existing else title,'categoria':existing['categoria'] if existing else slug,'descricao':existing['descricao'] if existing else f'{title} na prática, com aulas e atividades da Praxis.','ordem_exibicao':existing['ordem_exibicao'] if existing else course_id,'cover_path':cover_path,'existing':existing is not None,'module':{'id':module_id,'curso_id':course_id,'nome':module['nome'] if module else f'{title} — Conteúdo Prático','descricao':module['descricao'] if module else f'Conteúdo prático de {title}.','ordem':1,'status':'publicado','existing':module is not None},'lessons':planned_lessons})
    numbered=[page(x['name']) for x in content if x['mime_type'].startswith('image/') and re.match(r'^\d+[^0-9]+\d+\.png$',x['name'])]
    if numbered:
        missing=sorted(set(range(1,max(numbered)+1))-set(numbered))
        if missing: issues.append({'course':title,'type':'course_source_gap','pages':missing})

plan={'project_ref':'fxpmeosnnrgqdelffnvy','source':DRIVE['root_url'],'courses':courses,'uploads':list(uploads.values()),'links':links,'issues':issues}
(ROOT/'import-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'courses':len(courses),'lessons':sum(len(c['lessons']) for c in courses),'slides':sum(len(l['slides']) for c in courses for l in c['lessons']),'materials':sum(len(l['materials']) for c in courses for l in c['lessons']),'uploads':len(uploads),'upload_bytes':sum(x['size'] for x in uploads.values()),'reused_files':len([x for x in links if x['action']=='reuse']),'issues':issues},ensure_ascii=False,indent=2))
