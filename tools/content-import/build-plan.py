"""Compare the supplied Drive tree with a read-only Supabase content export."""  # Documenta o propósito deste módulo ou desta função.
import json  # Importa json.
from pathlib import Path, PurePosixPath  # Importa Path, PurePosixPath de pathlib.
import importlib.util  # Importa importlib.util.
import re  # Importa re.
import unicodedata  # Importa unicodedata.
from urllib.parse import unquote  # Importa unquote de urllib.parse.
import zipfile  # Importa zipfile.

ROOT = Path(__file__).resolve().parent  # Define ROOT como Path(__file__).resolve().parent.
_layout_spec = importlib.util.spec_from_file_location('storage_layout', ROOT/'storage-layout.py')  # Define _layout_spec como o resultado de importlib.util.spec_from_file_location com o texto “storage_layout” e o resultado da expressão ROOT / 'storage-layout.py'.
_layout = importlib.util.module_from_spec(_layout_spec)  # Define _layout como o resultado de importlib.util.module_from_spec com _layout_spec.
_layout_spec.loader.exec_module(_layout)  # Executa o resultado de _layout_spec.loader.exec_module com _layout.
storage_path = _layout.storage_path  # Define storage_path como _layout.storage_path.
DRIVE = json.loads((ROOT/'drive-inventory.json').read_text(encoding='utf-8-sig'))  # Define DRIVE como os dados interpretados do JSON o conteúdo textual do arquivo ROOT / 'drive-inventory.json'.
DB = json.loads((ROOT/'supabase-before.json').read_text(encoding='utf-8-sig'))  # Define DB como os dados interpretados do JSON o conteúdo textual do arquivo ROOT / 'supabase-before.json'.
DB = {key: value or [] for key, value in DB.items()}  # Define DB como uma coleção calculada percorrendo DB.items().
COURSES = [  # Define COURSES como uma coleção com 23 elementos.
    ('EXCEL',1,'Excel','excel'),('WORD',2,'Word','word'),  # Fornece o texto “EXCEL” à expressão.
    ('POWER POINT',3,'PowerPoint','power-point'),('POWER BI',4,'Power BI','power-bi'),  # Fornece o texto “POWER POINT” à expressão.
    ('OUTLOOK',5,'Outlook','outlook'),('CHAT GPT',6,'ChatGPT','chat-gpt'),  # Fornece o texto “OUTLOOK” à expressão.
    ('TEAMS',7,'Teams','teams'),('CLAUDE',8,'Claude na Prática','claude'),  # Fornece o texto “TEAMS” à expressão.
    ('COPILOT',9,'Copilot na Prática','copilot'),('GEMINI',10,'Gemini na Prática','gemini'),  # Fornece o texto “COPILOT” à expressão.
    ('INVESTIMENTO PESSOAL',11,'Investimentos Pessoais','investimentos-pessoais'),  # Fornece o texto “INVESTIMENTO PESSOAL” à expressão.
    ('ORATORIA',12,'Oratória na Prática','oratoria'),  # Fornece o texto “ORATORIA” à expressão.
    ('PROJETOS PRATICOS',13,'Projetos Práticos','projetos-praticos'),  # Fornece o texto “PROJETOS PRATICOS” à expressão.
    ('SOFT SKILLS',14,'Soft Skills na Prática','soft-skills'),  # Fornece o texto “SOFT SKILLS” à expressão.
    ('VIBE CODING',15,'Vibe Coding','vibe-coding'),  # Fornece o texto “VIBE CODING” à expressão.
    ('TRANSIÇÃO DE CARREIRA',16,'Transição de Carreira','transicao-de-carreira'),  # Fornece o texto “TRANSIÇÃO DE CARREIRA” à expressão.
    ('LINKEDIN, CURRICULO E ENTREVISTAS',17,'LinkedIn, Currículo e Entrevistas','linkedin-curriculo-entrevistas'),  # Fornece o texto “LINKEDIN, CURRICULO E ENTREVISTAS” à expressão.
    ('POWE AUTOMATE',18,'Power Automate na Prática','power-automate'),  # Fornece o texto “POWE AUTOMATE” à expressão.
    ('SUCESSO DO CLIENTE',19,'Sucesso do Cliente','sucesso-do-cliente'),  # Fornece o texto “SUCESSO DO CLIENTE” à expressão.
    ('PROCESSOS E MELHORIA CONTINUA',20,'Processos e Melhoria Contínua','processos-melhoria-continua'),  # Fornece o texto “PROCESSOS E MELHORIA CONTINUA” à expressão.
    ('COMUNICAÇÃO ESCRITA CORPORATIVA',21,'Comunicação Escrita Corporativa','comunicacao-escrita'),  # Fornece o texto “COMUNICAÇÃO ESCRITA CORPORATIVA” à expressão.
    ('AGENTES DE IA NA PRATICA',22,'Agentes de IA na Prática','agentes-ia'),  # Fornece o texto “AGENTES DE IA NA PRATICA” à expressão.
    ('STORYTELLING NA PRATICA',23,'Storytelling na Prática','storytelling'),  # Fornece o texto “STORYTELLING NA PRATICA” à expressão.
]  # Encerra a coleção, a chamada ou a expressão iniciada acima.

def norm(text):  # Declara a função norm com os parâmetros text.
    text = ''.join(c for c in unicodedata.normalize('NFD',str(text)) if not unicodedata.combining(c))  # Define text como a união dos trechos de texto com o separador definido.
    return re.sub(r'[^a-z0-9]+','-',text.lower()).strip('-')  # Retorna o texto sem os caracteres de borda indicados.

def lesson_key(path):  # Declara a função lesson_key com os parâmetros path.
    for part in path.split('/'):  # Percorre a divisão do texto em partes por o texto “/” usando part a cada iteração.
        key = norm(part)  # Define key como o resultado de norm com part.
        if re.fullmatch(r'pratica-\d+',key) or key in ('introducao','conhecendo-excel'):  # Verifica re.fullmatch('pratica-\\d+', key) or key in ('introducao', 'conhecendo-excel') para decidir se executa o bloco.
            return key  # Retorna key.
    return 'pratica-01'  # Retorna o texto “pratica-01”.

def lesson_sort(key):  # Declara a função lesson_sort com os parâmetros key.
    if key == 'conhecendo-excel': return -2  # Verifica key == 'conhecendo-excel' para decidir se executa o bloco.
    if key == 'introducao': return -1  # Verifica key == 'introducao' para decidir se executa o bloco.
    return int(key.rsplit('-',1)[1])  # Retorna a conversão de key.rsplit('-', 1)[1] em inteiro.

def lesson_name(key):  # Declara a função lesson_name com os parâmetros key.
    if key == 'conhecendo-excel': return 'Conhecendo Excel'  # Verifica key == 'conhecendo-excel' para decidir se executa o bloco.
    if key == 'introducao': return 'Introdução'  # Verifica key == 'introducao' para decidir se executa o bloco.
    return f'Prática {int(key.rsplit("-",1)[1]):02d}'  # Retorna um texto formatado com os valores das expressões embutidas.

def page(name):  # Declara a função page com os parâmetros name.
    match = re.match(r'^(\d+)',name)  # Define match como a comparação do início do texto com o padrão o texto “^(\d+)”.
    return int(match.group(1)) if match else 10000  # Retorna a conversão de o grupo capturado 1 da busca em inteiro quando match; caso contrário, 10000.

def extension(item):  # Declara a função extension com os parâmetros item.
    ext = Path(item['name']).suffix.lower()  # Define ext como o resultado de Path(item['name']).suffix.lower.
    return ext or {'image/png':'.png','image/jpeg':'.jpg'}.get(item['mime_type'],'')  # Retorna o resultado da expressão ext or {'image/png': '.png', 'image/jpeg': '.jpg'}.get(item['mime_type'], '').

uploads = {}  # Define uploads como um dicionário vazio.
links = []  # Define links como uma coleção com 0 elementos.
issues = []  # Define issues como uma coleção com 0 elementos.
courses = []  # Define courses como uma coleção com 0 elementos.
next_ids = {t:max([x['id'] for x in DB[t]]+[0])+1 for t in ('catalogo','modulos','aulas','slides','materiais')}  # Define next_ids como uma coleção calculada percorrendo ('catalogo', 'modulos', 'aulas', 'slides', 'materiais').
def new_id(table):  # Declara a função new_id com os parâmetros table.
    value = next_ids[table]  # Define value como next_ids[table].
    next_ids[table] += 1  # Atualiza next_ids[table] usando 1 na operação acumulada.
    return value  # Retorna value.

def stage(item,bucket):  # Declara a função stage com os parâmetros item, bucket.
    target = storage_path(item['path'])  # Define target como o resultado de storage_path com item['path'].
    uploads[item['id']] = {**item,'bucket':bucket,'target':target,'extension':extension(item)}  # Define uploads[item['id']] como um dicionário com as chaves nenhum valor, 'bucket', 'target', 'extension'.
    links.append({'drive_id':item['id'],'bucket':bucket,'path':target,'source':item['path'],'action':'upload'})  # Executa a inclusão de um dicionário com as chaves 'drive_id', 'bucket', 'path', 'source', 'action' no final da lista.
    return target  # Retorna target.

object_lookup = {(x['bucket'],x['name']):x for x in DB['objects']}  # Define object_lookup como uma coleção calculada percorrendo DB['objects'].
for source_title,course_id,title,slug in COURSES:  # Percorre COURSES usando (source_title, course_id, title, slug) a cada iteração.
    source = next(x for x in DRIVE['courses'] if x['title']==source_title)  # Define source como o resultado de next com uma coleção calculada percorrendo DRIVE['courses'].
    files = [x for x in DRIVE['items'] if x['course_id']==source['id'] and x['mime_type']!='application/vnd.google-apps.folder']  # Define files como uma coleção calculada percorrendo DRIVE['items'].
    cover = [x for x in files if any(norm(p) in ('capa','capas') for p in x['path'].split('/')[1:-1]) or x['name']=='CAPA.png']  # Define cover como uma coleção calculada percorrendo files.
    assert len(cover)==1,(source_title,'cover count',len(cover))  # Confere len(cover) == 1, interrompendo o programa se a condição for falsa.
    existing = next((x for x in DB['catalogo'] if x['id']==course_id),None)  # Define existing como o resultado de next com uma coleção calculada percorrendo DB['catalogo'] e None (ausência de valor).
    cover_path = ''  # Define cover_path como o texto “”.
    if existing:  # Verifica existing para decidir se executa o bloco.
        encoded = existing.get('imagem_capa_url','').split('/object/public/storage%20capas/')[-1]  # Define encoded como existing.get('imagem_capa_url', '').split('/object/public/storage%20capas/')[-1].
        original = unquote(encoded)  # Define original como o resultado de unquote com encoded.
        candidates = [x for x in DB['objects'] if x['bucket']=='storage capas' and re.sub(r'\s+',' ',x['name'])==re.sub(r'\s+',' ',original)]  # Define candidates como uma coleção calculada percorrendo DB['objects'].
        if len(candidates)==1 and int(candidates[0]['size'])==int(cover[0]['size']):  # Verifica len(candidates) == 1 and int(candidates[0]['size']) == int(cover[0]['size']) para decidir se executa o bloco.
            cover_path = storage_path(cover[0]['path'])  # Define cover_path como o resultado de storage_path com cover[0]['path'].
            links.append({'drive_id':cover[0]['id'],'bucket':'storage capas','path':cover_path,'source':cover[0]['path'],'action':'reuse'})  # Executa a inclusão de um dicionário com as chaves 'drive_id', 'bucket', 'path', 'source', 'action' no final da lista.
    if not cover_path: cover_path = stage(cover[0],'storage capas')  # Define cover_path como o resultado de stage com cover[0] e o texto “storage capas”.
    module = next((x for x in DB['modulos'] if x['curso_id']==course_id),None)  # Define module como o resultado de next com uma coleção calculada percorrendo DB['modulos'] e None (ausência de valor).
    module_id = module['id'] if module else new_id('modulos')  # Define module_id como module['id'] quando module; caso contrário, o resultado de new_id com o texto “modulos”.
    content = [x for x in files if x not in cover]  # Define content como uma coleção calculada percorrendo files.
    lesson_keys = set(lesson_key(x['path']) for x in content if '/CONTEUDO/' in x['path'] or re.search(r'/PRATICA \d+/',x['path']))  # Define lesson_keys como um conjunto sem repetições a partir de uma coleção calculada percorrendo content.
    assert lesson_keys,(title,'no lessons')  # Confere lesson_keys, interrompendo o programa se a condição for falsa.
    planned_lessons=[]  # Define planned_lessons como uma coleção com 0 elementos.
    for lesson_order,key in enumerate(sorted(lesson_keys,key=lesson_sort),1):  # Percorre os índices e valores de os itens de lesson_keys em ordem usando (lesson_order, key) a cada iteração.
        old = next((x for x in DB['aulas'] if x['modulo_id']==module_id and norm(x['nome'])==key),None)  # Define old como o resultado de next com uma coleção calculada percorrendo DB['aulas'] e None (ausência de valor).
        lesson_id = old['id'] if old else new_id('aulas')  # Define lesson_id como old['id'] quando old; caso contrário, o resultado de new_id com o texto “aulas”.
        source_files=[x for x in content if lesson_key(x['path'])==key and '/EXTERNO/' not in x['path'] and '/MATERIAL' not in x['path']]  # Define source_files como uma coleção calculada percorrendo content.
        images=sorted([x for x in source_files if x['mime_type'].startswith('image/')],key=lambda x:(page(x['name']),x['name']))  # Define images como os itens de uma coleção calculada percorrendo source_files em ordem.
        archives=[x for x in source_files if 'zip' in x['mime_type']]  # Define archives como uma coleção calculada percorrendo source_files.
        old_slides=sorted([x for x in DB['slides'] if x['aula_id']==lesson_id],key=lambda x:x['ordem'])  # Define old_slides como os itens de uma coleção calculada percorrendo DB['slides'] em ordem.
        planned_slides=[]  # Define planned_slides como uma coleção com 0 elementos.
        if archives:  # Verifica archives para decidir se executa o bloco.
            # Excel's original archives are preserved as downloads; existing extracted slides stay intact.
            stored=[x for x in DB['objects'] if x['bucket']=='slides' and x['name'].startswith(f'excel/conteudo/{key}/') and x['mimetype'].startswith('image/')]  # Define stored como uma coleção calculada percorrendo DB['objects'].
            for order,obj in enumerate(sorted(stored,key=lambda x:page(Path(x['name']).name)),1):  # Percorre os índices e valores de os itens de stored em ordem usando (order, obj) a cada iteração.
                prior=next((x for x in old_slides if x['imagem_path']==obj['name']),None)  # Define prior como o resultado de next com uma coleção calculada percorrendo old_slides e None (ausência de valor).
                target = storage_path(str(PurePosixPath(archives[0]['path']).parent / PurePosixPath(obj['name']).name))  # Define target como o resultado de storage_path com a conversão de o resultado da expressão PurePosixPath(archives[0]['path']).parent / PurePosixPath(obj['name']).name em texto.
                planned_slides.append({'id':prior['id'] if prior else new_id('slides'),'aula_id':lesson_id,'ordem':order,'titulo':f'{lesson_name(key)} — Slide {order}','imagem_path':target,'status':'publicado','existing':prior is not None})  # Executa a inclusão de um dicionário com as chaves 'id', 'aula_id', 'ordem', 'titulo', 'imagem_path' no final da lista.
            for archive in archives:  # Percorre archives usando archive a cada iteração.
                cached=Path('C:/Users/Aluno/AppData/Local/Temp/praxis-drive-import-20261009/files/materiais')/(archive['id']+'.zip')  # Define cached como o resultado da expressão Path('C:/Users/Aluno/AppData/Local/Temp/praxis-drive-import-20261009/files/materiais') / (archive['id'] + '.zip').
                if not cached.exists():  # Verifica not cached.exists() para decidir se executa o bloco.
                    issues.append({'course':title,'lesson':lesson_name(key),'type':'archive_pending_verification'})  # Executa a inclusão de um dicionário com as chaves 'course', 'lesson', 'type' no final da lista.
                    continue  # Avança para a próxima iteração do laço.
                entries=zipfile.ZipFile(cached).infolist()  # Define entries como o resultado de zipfile.ZipFile(cached).infolist.
                assert len(entries)==len(stored),(title,key,'archive page count mismatch')  # Confere len(entries) == len(stored), interrompendo o programa se a condição for falsa.
                assert all(any(Path(x['name']).name==entry.filename and int(x['size'])==entry.file_size for x in stored) for entry in entries),(title,key,'archive files mismatch')  # Confere all((any((Path(x['name']).name == entry.filename and int(x['size']) == entry.file_size for x in stored)) for entry in entries)), interrompendo o programa se a condição for falsa.
        else:  # Executa a alternativa quando a condição anterior não foi atendida.
            for order,item in enumerate(images,1):  # Percorre os índices e valores de images usando (order, item) a cada iteração.
                # Match only a specific course, lesson and page; filenames in different lessons may repeat.
                matching=[x for x in DB['objects'] if x['bucket']=='slides' and x['name'].startswith(f'{slug}/conteudo/{key}/') and (norm(Path(x['name']).name)==norm(item['name']) or (page(Path(x['name']).name)==page(item['name']) and page(item['name'])!=10000))]  # Define matching como uma coleção calculada percorrendo DB['objects'].
                if len(matching)>1: raise ValueError(('Ambiguous storage match',item['path']))  # Verifica len(matching) > 1 para decidir se executa o bloco.
                target=matching[0]['name'] if matching else stage(item,'slides')  # Define target como matching[0]['name'] quando matching; caso contrário, o resultado de stage com item e o texto “slides”.
                if matching: links.append({'drive_id':item['id'],'bucket':'slides','path':target,'source':item['path'],'action':'reuse'})  # Verifica matching para decidir se executa o bloco.
                prior=next((x for x in old_slides if x['imagem_path']==target),None)  # Define prior como o resultado de next com uma coleção calculada percorrendo old_slides e None (ausência de valor).
                # Repair a broken stored path by source page number, while preserving the row id.
                if prior is None:  # Verifica prior is None para decidir se executa o bloco.
                    prior=next((x for x in old_slides if page(Path(x['imagem_path']).name)==page(item['name']) and ('slides',x['imagem_path']) not in object_lookup),None)  # Define prior como o resultado de next com uma coleção calculada percorrendo old_slides e None (ausência de valor).
                if prior is None:  # Verifica prior is None para decidir se executa o bloco.
                    prior=next((x for x in old_slides if ('slides',x['imagem_path']) not in object_lookup and not any(s['id']==x['id'] for s in planned_slides)),None)  # Define prior como o resultado de next com uma coleção calculada percorrendo old_slides e None (ausência de valor).
                planned_slides.append({'id':prior['id'] if prior else new_id('slides'),'aula_id':lesson_id,'ordem':order,'titulo':f'{lesson_name(key)} — '+('Bônus' if page(item['name'])==10000 else f'Slide {order}'),'imagem_path':target,'status':'publicado','existing':prior is not None})  # Executa a inclusão de um dicionário com as chaves 'id', 'aula_id', 'ordem', 'titulo', 'imagem_path' no final da lista.
                # Match old rows before replacing their paths with the original Drive hierarchy.
                planned_slides[-1]['imagem_path'] = storage_path(item['path'])  # Define planned_slides[-1]['imagem_path'] como o resultado de storage_path com item['path'].
                if matching:  # Verifica matching para decidir se executa o bloco.
                    links[-1]['path'] = storage_path(item['path'])  # Define links[-1]['path'] como o resultado de storage_path com item['path'].
            numbered=[page(x['name']) for x in images if page(x['name'])!=10000]  # Define numbered como uma coleção calculada percorrendo images.
            if numbered:  # Verifica numbered para decidir se executa o bloco.
                missing=[n for n in range(min(numbered),max(numbered)+1) if n not in numbered]  # Define missing como uma coleção calculada percorrendo range(min(numbered), max(numbered) + 1).
                if missing: issues.append({'course':title,'lesson':lesson_name(key),'type':'source_gap','pages':missing})  # Verifica missing para decidir se executa o bloco.
        for prior in old_slides:  # Percorre old_slides usando prior a cada iteração.
            if not any(s['id']==prior['id'] for s in planned_slides):  # Verifica not any((s['id'] == prior['id'] for s in planned_slides)) para decidir se executa o bloco.
                if ('slides',prior['imagem_path']) not in object_lookup:  # Verifica ('slides', prior['imagem_path']) not in object_lookup para decidir se executa o bloco.
                    issues.append({'course':title,'lesson':lesson_name(key),'type':'broken_reference','slide_id':prior['id'],'path':prior['imagem_path']})  # Executa a inclusão de um dicionário com as chaves 'course', 'lesson', 'type', 'slide_id', 'path' no final da lista.
                else:  # Executa a alternativa quando a condição anterior não foi atendida.
                    # Keep valid existing pages absent from the Drive rather than removing content.
                    planned_slides.append({**prior,'existing':True})  # Executa a inclusão de um dicionário com as chaves nenhum valor, 'existing' no final da lista.
        planned_lessons.append({'id':lesson_id,'key':key,'nome':old['nome'] if old else lesson_name(key),'modulo_id':module_id,'descricao':old['descricao'] if old else f'{lesson_name(key)} de {title}, com o conteúdo original da Praxis.','ordem':old['ordem'] if old else lesson_order,'status':'publicado','existing':old is not None,'slides':planned_slides,'materials':[]})  # Executa a inclusão de um dicionário com as chaves 'id', 'key', 'nome', 'modulo_id', 'descricao' no final da lista.
    for item in content:  # Percorre content usando item a cada iteração.
        is_archive='zip' in item['mime_type']  # Define is_archive como o resultado da expressão 'zip' in item['mime_type'].
        is_supplement=not item['mime_type'].startswith('image/') or (source_title=='EXCEL' and '/PRATICA 01/' in item['path'])  # Define is_supplement como o resultado da expressão not item['mime_type'].startswith('image/') or (source_title == 'EXCEL' and '/PRATICA 01/' in item['path']).
        if not is_supplement: continue  # Verifica not is_supplement para decidir se executa o bloco.
        target=stage(item,'materiais')  # Define target como o resultado de stage com item e o texto “materiais”.
        practice = re.search(r'(?:PRATICA|PRT)[ _-]*0*(\d+)',item['name'],re.I)  # Define practice como a busca do padrão o texto “(?:PRATICA|PRT)[ _-]*0*(\d+)” no texto.
        selected_key=f'pratica-{int(practice.group(1)):02d}' if practice else lesson_key(item['path'])  # Define selected_key como um texto formatado com os valores das expressões embutidas quando practice; caso contrário, o resultado de lesson_key com item['path'].
        if source_title=='WORD':  # Verifica source_title == 'WORD' para decidir se executa o bloco.
            selected_key={'Comunicado_Interno_Sem_Formatacao.docx':'pratica-01','Relatorio_Institucional_Para_Correcao.docx':'pratica-02','Relatorio_Cliente_Para_Revisao.docx':'pratica-04'}[item['name']]  # Define selected_key como {'Comunicado_Interno_Sem_Formatacao.docx': 'pratica-01', 'Relatorio_Institucional_Para_Correcao.docx': 'pratica-02', 'Relatorio_Cliente_Para_Rev….
        if source_title=='PROJETOS PRATICOS': selected_key='pratica-02'  # Define selected_key como o texto “pratica-02”.
        chosen=next((x for x in planned_lessons if x['key']==selected_key),planned_lessons[0])  # Define chosen como o resultado de next com uma coleção calculada percorrendo planned_lessons e planned_lessons[0].
        chosen['materials'].append({'id':new_id('materiais'),'aula_id':chosen['id'],'nome':item['name'] if not is_archive else f'{chosen["nome"]} — apresentação original (ZIP)','arquivo_path':target,'tipo':extension(item).lstrip('.').upper(),'ordem':len(chosen['materials'])+1,'status':'publicado','drive_id':item['id']})  # Executa a inclusão de um dicionário com as chaves 'id', 'aula_id', 'nome', 'arquivo_path', 'tipo' no final da lista.
    courses.append({'id':course_id,'nome':existing['nome'] if existing else title,'categoria':existing['categoria'] if existing else slug,'descricao':existing['descricao'] if existing else f'{title} na prática, com aulas e atividades da Praxis.','ordem_exibicao':existing['ordem_exibicao'] if existing else course_id,'cover_path':cover_path,'existing':existing is not None,'module':{'id':module_id,'curso_id':course_id,'nome':module['nome'] if module else f'{title} — Conteúdo Prático','descricao':module['descricao'] if module else f'Conteúdo prático de {title}.','ordem':1,'status':'publicado','existing':module is not None},'lessons':planned_lessons})  # Executa a inclusão de um dicionário com as chaves 'id', 'nome', 'categoria', 'descricao', 'ordem_exibicao' no final da lista.
    numbered=[page(x['name']) for x in content if x['mime_type'].startswith('image/') and re.match(r'^\d+[^0-9]+\d+\.png$',x['name'])]  # Define numbered como uma coleção calculada percorrendo content.
    if numbered:  # Verifica numbered para decidir se executa o bloco.
        missing=sorted(set(range(1,max(numbered)+1))-set(numbered))  # Define missing como os itens de o resultado da expressão set(range(1, max(numbered) + 1)) - set(numbered) em ordem.
        if missing: issues.append({'course':title,'type':'course_source_gap','pages':missing})  # Verifica missing para decidir se executa o bloco.

plan={'project_ref':'fxpmeosnnrgqdelffnvy','source':DRIVE['root_url'],'courses':courses,'uploads':list(uploads.values()),'links':links,'issues':issues}  # Define plan como um dicionário com as chaves 'project_ref', 'source', 'courses', 'uploads', 'links'.
(ROOT/'import-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')  # Executa a gravação do texto em ROOT / 'import-plan.json'.
print(json.dumps({'courses':len(courses),'lessons':sum(len(c['lessons']) for c in courses),'slides':sum(len(l['slides']) for c in courses for l in c['lessons']),'materials':sum(len(l['materials']) for c in courses for l in c['lessons']),'uploads':len(uploads),'upload_bytes':sum(x['size'] for x in uploads.values()),'reused_files':len([x for x in links if x['action']=='reuse']),'issues':issues},ensure_ascii=False,indent=2))  # Executa a exibição de a serialização de um dicionário com as chaves 'courses', 'lessons', 'slides', 'materials', 'uploads' para JSON na saída do programa.
