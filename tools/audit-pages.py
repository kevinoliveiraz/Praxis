from html.parser import HTMLParser  # Importa HTMLParser de html.parser.
from pathlib import Path  # Importa Path de pathlib.
from urllib.parse import urlsplit, unquote  # Importa urlsplit, unquote de urllib.parse.
import re  # Importa re.

root = Path(__file__).resolve().parent.parent  # Define root como Path(__file__).resolve().parent.parent.
void = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}  # Define void como uma coleção com 14 elementos.

class Page(HTMLParser):  # Declara a classe Page herdando de HTMLParser.
    def __init__(self, file):  # Declara a função __init__ com os parâmetros self, file.
        super().__init__(convert_charrefs=True)  # Executa o resultado de super().__init__.
        self.file, self.stack, self.ids, self.refs, self.links, self.h1 = file, [], set(), [], [], 0  # Define (self.file, self.stack, self.ids, self.refs, self.links, self.h1) como uma coleção com 6 elementos.
    def handle_starttag(self, tag, attrs):  # Declara a função handle_starttag com os parâmetros self, tag, attrs.
        attrs = dict(attrs)  # Define attrs como o resultado de dict com attrs.
        if tag not in void: self.stack.append(tag)  # Verifica tag not in void para decidir se executa o bloco.
        if tag == 'h1': self.h1 += 1  # Atualiza self.h1 usando 1 na operação acumulada.
        if 'id' in attrs:  # Verifica 'id' in attrs para decidir se executa o bloco.
            assert attrs['id'] not in self.ids, f'{self.file}: ID duplicado {attrs["id"]}'  # Confere attrs['id'] not in self.ids, interrompendo o programa se a condição for falsa.
            self.ids.add(attrs['id'])  # Executa a inclusão de attrs['id'] no conjunto.
        if tag == 'img': assert 'alt' in attrs, f'{self.file}: imagem sem alt'  # Verifica tag == 'img' para decidir se executa o bloco.
        for name in ('aria-labelledby', 'aria-describedby', 'aria-controls'):  # Percorre uma coleção com 3 elementos usando name a cada iteração.
            self.refs.extend((attrs.get(name) or '').split())  # Executa a inclusão dos itens de a divisão do texto em partes por os parâmetros informados na lista.
        if 'for' in attrs: self.refs.append(attrs['for'])  # Verifica 'for' in attrs para decidir se executa o bloco.
        for name in ('href', 'src'):  # Percorre uma coleção com 2 elementos usando name a cada iteração.
            if attrs.get(name): self.links.append(attrs[name])  # Verifica attrs.get(name) para decidir se executa o bloco.
    def handle_endtag(self, tag):  # Declara a função handle_endtag com os parâmetros self, tag.
        if tag in void: return  # Verifica tag in void para decidir se executa o bloco.
        assert self.stack and self.stack[-1] == tag, f'{self.file}: fechamento {tag}, pilha {self.stack[-4:]}'  # Confere self.stack and self.stack[-1] == tag, interrompendo o programa se a condição for falsa.
        self.stack.pop()  # Executa o resultado de self.stack.pop.

pages = {}  # Define pages como um dicionário vazio.
session_script = (root / 'scripts/header-session.js').read_text(encoding='utf-8')  # Define session_script como o conteúdo textual do arquivo root / 'scripts/header-session.js'.
account_markup = re.search(r'return `(<div class="user-info[\s\S]*?)`;', session_script).group(1)  # Define account_markup como o grupo capturado 1 da busca.
account_markup = re.sub(r'\$\{[^}]+\}', 'Usuário', account_markup)  # Define account_markup como a substituição das ocorrências do padrão o texto “\$\{[^}]+\}”.
account_component = Page('menu da conta')  # Define account_component como o resultado de Page com o texto “menu da conta”.
account_component.feed(account_markup)  # Executa o resultado de account_component.feed com account_markup.
assert not account_component.stack, 'menu da conta: tags abertas'  # Confere not account_component.stack, interrompendo o programa se a condição for falsa.
assert all(ref in account_component.ids for ref in account_component.refs), 'menu da conta: referência ARIA inexistente'  # Confere all((ref in account_component.ids for ref in account_component.refs)), interrompendo o programa se a condição for falsa.
header_script = (root / 'scripts/header.js').read_text(encoding='utf-8')  # Define header_script como o conteúdo textual do arquivo root / 'scripts/header.js'.
header_markup = re.search(r'header.innerHTML = `([\s\S]*?)`;', header_script).group(1)  # Define header_markup como o grupo capturado 1 da busca.
subscription_markup = re.search(r"const subscription = [^\n]+\? `([\s\S]*?)` : '';", header_script).group(1)  # Define subscription_markup como o grupo capturado 1 da busca.
for file in root.glob('*.html'):  # Percorre os arquivos que correspondem a o texto “*.html” usando file a cada iteração.
    source = file.read_text(encoding='utf-8-sig')  # Define source como o conteúdo textual do arquivo file.
    if 'data-site-header' in source:  # Verifica 'data-site-header' in source para decidir se executa o bloco.
        assert '<script src="scripts/header.js" defer></script>' in source, f'{file.name}: cabeçalho deve montar antes do DOMContentLoaded'  # Confere '<script src="scripts/header.js" defer></script>' in source, interrompendo o programa se a condição for falsa.
        assert source.index('styles/theme.css') < source.index('styles/header.css'), f'{file.name}: ordem dos estilos do cabeçalho'  # Confere source.index('styles/theme.css') < source.index('styles/header.css'), interrompendo o programa se a condição for falsa.
        placeholder = re.search(r'<header class="site-header" data-site-header data-subscription="(true|false)"></header>', source)  # Define placeholder como a busca do padrão o texto “<header class="site-header" data-site-header data-subscription="(true|false)"></head…” no texto.
        assert placeholder, f'{file.name}: configuração do cabeçalho ausente'  # Confere placeholder, interrompendo o programa se a condição for falsa.
        assert (placeholder.group(1) == 'true') == (file.name == 'index.html'), f'{file.name}: assinatura aparece apenas na home'  # Confere (placeholder.group(1) == 'true') == (file.name == 'index.html'), interrompendo o programa se a condição for falsa.
        markup = header_markup.replace('${subscription}', subscription_markup if placeholder.group(1) == 'true' else '')  # Define markup como a substituição dos trechos que correspondem a o texto “${subscription}”.
        source = source.replace(placeholder.group(0), '<header class="site-header">' + markup + '</header>')  # Define source como a substituição dos trechos que correspondem a o grupo capturado 0 da busca.
    page = Page(file.name)  # Define page como o resultado de Page com file.name.
    page.feed(source)  # Executa o resultado de page.feed com source.
    assert not page.stack, f'{file.name}: tags abertas {page.stack}'  # Confere not page.stack, interrompendo o programa se a condição for falsa.
    assert page.h1 == 1, f'{file.name}: {page.h1} títulos h1'  # Confere page.h1 == 1, interrompendo o programa se a condição for falsa.
    assert all(ref in page.ids for ref in page.refs), f'{file.name}: referência ARIA/label inexistente'  # Confere all((ref in page.ids for ref in page.refs)), interrompendo o programa se a condição for falsa.
    assert source.count('data-theme-toggle') == 1, f'{file.name}: seletor de tema ausente/duplicado'  # Confere source.count('data-theme-toggle') == 1, interrompendo o programa se a condição for falsa.
    assert source.index('scripts/theme.js') < source.index('rel="stylesheet"'), f'{file.name}: tema deve iniciar antes do CSS'  # Confere source.index('scripts/theme.js') < source.index('rel="stylesheet"'), interrompendo o programa se a condição for falsa.
    assert source.index('styles/tokens.css') < source.index('styles/theme.css'), f'{file.name}: ordem dos estilos'  # Confere source.index('styles/tokens.css') < source.index('styles/theme.css'), interrompendo o programa se a condição for falsa.
    pages[file.name] = page  # Define pages[file.name] como page.
for file, page in [*pages.items(), ('menu da conta', account_component)]:  # Percorre uma coleção com 2 elementos usando (file, page) a cada iteração.
    for link in page.links:  # Percorre page.links usando link a cada iteração.
        url = urlsplit(link)  # Define url como o resultado de urlsplit com link.
        if url.scheme or url.netloc: continue  # Verifica url.scheme or url.netloc para decidir se executa o bloco.
        target = root / unquote(url.path or file)  # Define target como o resultado da expressão root / unquote(url.path or file).
        assert target.exists(), f'{file}: arquivo inexistente {link}'  # Confere target.exists(), interrompendo o programa se a condição for falsa.
        if url.fragment and target.suffix == '.html':  # Verifica url.fragment and target.suffix == '.html' para decidir se executa o bloco.
            assert unquote(url.fragment) in pages[target.name].ids, f'{file}: âncora inexistente {link}'  # Confere unquote(url.fragment) in pages[target.name].ids, interrompendo o programa se a condição for falsa.

css = '\n'.join(file.read_text(encoding='utf-8') for file in (root / 'styles').glob('*.css'))  # Define css como a união dos trechos de texto com o separador definido.
css = re.sub(r'/\*[\s\S]*?\*/', '', css)  # Define css como a substituição das ocorrências do padrão o texto “/\*[\s\S]*?\*/”.
definitions = set(re.findall(r'(--[\w-]+)\s*:', css))  # Define definitions como um conjunto sem repetições a partir de todas as ocorrências do padrão o texto “(--[\w-]+)\s*:”.
# Variáveis de movimento podem ser definidas pelo JavaScript; seu fallback já é válido.
used = set(re.findall(r'var\(\s*(--[\w-]+)\s*\)', css))  # Define used como um conjunto sem repetições a partir de todas as ocorrências do padrão o texto “var\(\s*(--[\w-]+)\s*\)”.
assert not used - definitions, f'Tokens indefinidos: {used - definitions}'  # Confere not used - definitions, interrompendo o programa se a condição for falsa.
for file in (root / 'styles').glob('*.css'):  # Percorre os arquivos que correspondem a o texto “*.css” usando file a cada iteração.
    source = re.sub(r'/\*[\s\S]*?\*/', '', file.read_text(encoding='utf-8'))  # Define source como a substituição das ocorrências do padrão o texto “/\*[\s\S]*?\*/”.
    assert source.count('{') == source.count('}'), f'{file.name}: chaves CSS'  # Confere source.count('{') == source.count('}'), interrompendo o programa se a condição for falsa.
    assert source.count('(') == source.count(')'), f'{file.name}: parênteses CSS'  # Confere source.count('(') == source.count(')'), interrompendo o programa se a condição for falsa.
    for image in re.findall(r'url\([\"\']?([^\)\"\']+)', source):  # Percorre todas as ocorrências do padrão o texto “url\([\"\']?([^\)\"\']+)” usando image a cada iteração.
        if not urlsplit(image).scheme: assert (file.parent / image).exists(), f'{file.name}: imagem {image}'  # Verifica not urlsplit(image).scheme para decidir se executa o bloco.

def luminance(color):  # Declara a função luminance com os parâmetros color.
    values = [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]  # Define values como uma coleção calculada percorrendo (1, 3, 5).
    values = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in values]  # Define values como uma coleção calculada percorrendo values.
    return sum(x * weight for x, weight in zip(values, (.2126, .7152, .0722)))  # Retorna a soma dos valores de uma coleção calculada percorrendo zip(values, (0.2126, 0.7152, 0.0722)).
def contrast(a, b):  # Declara a função contrast com os parâmetros a, b.
    a, b = sorted((luminance(a), luminance(b)))  # Define (a, b) como os itens de uma coleção com 2 elementos em ordem.
    return (b + .05) / (a + .05)  # Retorna o resultado da expressão (b + 0.05) / (a + 0.05).
tokens = (root / 'styles/tokens.css').read_text(encoding='utf-8')  # Define tokens como o conteúdo textual do arquivo root / 'styles/tokens.css'.
for theme in ('dark', 'light'):  # Percorre uma coleção com 2 elementos usando theme a cada iteração.
    block = re.search(r':root\[data-theme="' + theme + r'"\]\s*\{([^}]+)', tokens).group(1)  # Define block como o grupo capturado 1 da busca.
    roles = dict(re.findall(r'--praxis-([\w-]+):\s*(#[\da-f]+);', block))  # Define roles como o resultado de dict com todas as ocorrências do padrão o texto “--praxis-([\w-]+):\s*(#[\da-f]+);”.
    ratios = [contrast(roles[foreground], roles[background]) for foreground in ('text', 'muted', 'accent-text')  # Define ratios como uma coleção calculada percorrendo ('text', 'muted', 'accent-text'), ('page', 'panel', 'panel-alt', 'panel-raised').
              for background in ('page', 'panel', 'panel-alt', 'panel-raised')]  # Fornece o texto “page” à expressão.
    assert min(ratios) >= 4.5, f'{theme}: contraste insuficiente {min(ratios):.2f}'  # Confere min(ratios) >= 4.5, interrompendo o programa se a condição for falsa.
    for kind in ('error', 'success'):  # Percorre uma coleção com 2 elementos usando kind a cada iteração.
        assert contrast(roles[kind + '-text'], roles[kind + '-bg']) >= 4.5  # Confere contrast(roles[kind + '-text'], roles[kind + '-bg']) >= 4.5, interrompendo o programa se a condição for falsa.
    print(f'{theme}: menor contraste de texto {min(ratios):.2f}:1')  # Executa a exibição de um texto formatado com os valores das expressões embutidas na saída do programa.
assert contrast('#0b0d10', '#e0fb38') >= 4.5  # Confere contrast('#0b0d10', '#e0fb38') >= 4.5, interrompendo o programa se a condição for falsa.
print(f'{len(pages)} páginas: estrutura, IDs, ARIA, arquivos, temas e tokens verificados.')  # Executa a exibição de um texto formatado com os valores das expressões embutidas na saída do programa.
