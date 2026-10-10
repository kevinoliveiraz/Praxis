from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re

root = Path(__file__).resolve().parent.parent
void = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

class Page(HTMLParser):
    def __init__(self, file):
        super().__init__(convert_charrefs=True)
        self.file, self.stack, self.ids, self.refs, self.links, self.h1 = file, [], set(), [], [], 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag not in void: self.stack.append(tag)
        if tag == 'h1': self.h1 += 1
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, f'{self.file}: ID duplicado {attrs["id"]}'
            self.ids.add(attrs['id'])
        if tag == 'img': assert 'alt' in attrs, f'{self.file}: imagem sem alt'
        for name in ('aria-labelledby', 'aria-describedby', 'aria-controls'):
            self.refs.extend((attrs.get(name) or '').split())
        if 'for' in attrs: self.refs.append(attrs['for'])
        for name in ('href', 'src'):
            if attrs.get(name): self.links.append(attrs[name])
    def handle_endtag(self, tag):
        if tag in void: return
        assert self.stack and self.stack[-1] == tag, f'{self.file}: fechamento {tag}, pilha {self.stack[-4:]}'
        self.stack.pop()

pages = {}
session_script = (root / 'scripts/header-session.js').read_text(encoding='utf-8')
account_markup = re.search(r'return `(<div class="user-info[\s\S]*?)`;', session_script).group(1)
account_markup = re.sub(r'\$\{[^}]+\}', 'Usuário', account_markup)
account_component = Page('menu da conta')
account_component.feed(account_markup)
assert not account_component.stack, 'menu da conta: tags abertas'
assert all(ref in account_component.ids for ref in account_component.refs), 'menu da conta: referência ARIA inexistente'
header_script = (root / 'scripts/header.js').read_text(encoding='utf-8')
header_markup = re.search(r'header.innerHTML = `([\s\S]*?)`;', header_script).group(1)
subscription_markup = re.search(r"const subscription = [^\n]+\? `([\s\S]*?)` : '';", header_script).group(1)
for file in root.glob('*.html'):
    source = file.read_text(encoding='utf-8-sig')
    if 'data-site-header' in source:
        assert '<script src="scripts/header.js" defer></script>' in source, f'{file.name}: cabeçalho deve montar antes do DOMContentLoaded'
        assert source.index('styles/theme.css') < source.index('styles/header.css'), f'{file.name}: ordem dos estilos do cabeçalho'
        placeholder = re.search(r'<header class="site-header" data-site-header data-subscription="(true|false)"></header>', source)
        assert placeholder, f'{file.name}: configuração do cabeçalho ausente'
        assert (placeholder.group(1) == 'true') == (file.name == 'index.html'), f'{file.name}: assinatura aparece apenas na home'
        markup = header_markup.replace('${subscription}', subscription_markup if placeholder.group(1) == 'true' else '')
        source = source.replace(placeholder.group(0), '<header class="site-header">' + markup + '</header>')
    page = Page(file.name)
    page.feed(source)
    assert not page.stack, f'{file.name}: tags abertas {page.stack}'
    assert page.h1 == 1, f'{file.name}: {page.h1} títulos h1'
    assert all(ref in page.ids for ref in page.refs), f'{file.name}: referência ARIA/label inexistente'
    assert source.count('data-theme-toggle') == 1, f'{file.name}: seletor de tema ausente/duplicado'
    assert source.index('scripts/theme.js') < source.index('rel="stylesheet"'), f'{file.name}: tema deve iniciar antes do CSS'
    assert source.index('styles/tokens.css') < source.index('styles/theme.css'), f'{file.name}: ordem dos estilos'
    pages[file.name] = page
for file, page in [*pages.items(), ('menu da conta', account_component)]:
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc: continue
        target = root / unquote(url.path or file)
        assert target.exists(), f'{file}: arquivo inexistente {link}'
        if url.fragment and target.suffix == '.html':
            assert unquote(url.fragment) in pages[target.name].ids, f'{file}: âncora inexistente {link}'

css = '\n'.join(file.read_text(encoding='utf-8') for file in (root / 'styles').glob('*.css'))
css = re.sub(r'/\*[\s\S]*?\*/', '', css)
definitions = set(re.findall(r'(--[\w-]+)\s*:', css))
# Variáveis de movimento podem ser definidas pelo JavaScript; seu fallback já é válido.
used = set(re.findall(r'var\(\s*(--[\w-]+)\s*\)', css))
assert not used - definitions, f'Tokens indefinidos: {used - definitions}'
for file in (root / 'styles').glob('*.css'):
    source = re.sub(r'/\*[\s\S]*?\*/', '', file.read_text(encoding='utf-8'))
    assert source.count('{') == source.count('}'), f'{file.name}: chaves CSS'
    assert source.count('(') == source.count(')'), f'{file.name}: parênteses CSS'
    for image in re.findall(r'url\([\"\']?([^\)\"\']+)', source):
        if not urlsplit(image).scheme: assert (file.parent / image).exists(), f'{file.name}: imagem {image}'

def luminance(color):
    values = [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    values = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in values]
    return sum(x * weight for x, weight in zip(values, (.2126, .7152, .0722)))
def contrast(a, b):
    a, b = sorted((luminance(a), luminance(b)))
    return (b + .05) / (a + .05)
tokens = (root / 'styles/tokens.css').read_text(encoding='utf-8')
for theme in ('dark', 'light'):
    block = re.search(r':root\[data-theme="' + theme + r'"\]\s*\{([^}]+)', tokens).group(1)
    roles = dict(re.findall(r'--praxis-([\w-]+):\s*(#[\da-f]+);', block))
    ratios = [contrast(roles[foreground], roles[background]) for foreground in ('text', 'muted', 'accent-text')
              for background in ('page', 'panel', 'panel-alt', 'panel-raised')]
    assert min(ratios) >= 4.5, f'{theme}: contraste insuficiente {min(ratios):.2f}'
    for kind in ('error', 'success'):
        assert contrast(roles[kind + '-text'], roles[kind + '-bg']) >= 4.5
    print(f'{theme}: menor contraste de texto {min(ratios):.2f}:1')
assert contrast('#0b0d10', '#e0fb38') >= 4.5
print(f'{len(pages)} páginas: estrutura, IDs, ARIA, arquivos, temas e tokens verificados.')
