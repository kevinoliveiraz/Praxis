"""Publish the reviewed payload in one transaction using the restricted RPC."""  # Documenta o propósito deste módulo ou desta função.
import argparse  # Importa argparse.
from datetime import datetime, timezone  # Importa datetime, timezone de datetime.
import json  # Importa json.
from pathlib import Path  # Importa Path de pathlib.
import urllib.error  # Importa urllib.error.
import urllib.request  # Importa urllib.request.

ROOT = Path(__file__).resolve().parent  # Define ROOT como Path(__file__).resolve().parent.
BASE = 'https://fxpmeosnnrgqdelffnvy.supabase.co'  # Define BASE como o texto “https://fxpmeosnnrgqdelffnvy.supabase.co”.

class NoRedirect(urllib.request.HTTPRedirectHandler):  # Declara a classe NoRedirect herdando de urllib.request.HTTPRedirectHandler.
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # Declara a função redirect_request com os parâmetros self, req, fp, code, msg, headers, newurl.
        return None  # Retorna None (ausência de valor).

parser = argparse.ArgumentParser()  # Define parser como o resultado de argparse.ArgumentParser.
parser.add_argument('key_file', type=Path)  # Executa o registro do argumento de linha de comando o texto “key_file”.
args = parser.parse_args()  # Define args como os argumentos recebidos na linha de comando.
key = args.key_file.read_text(encoding='utf-8').strip()  # Define key como o texto sem os caracteres de borda indicados.
assert key.startswith('sb_secret_'), 'A server credential is required'  # Confere key.startswith('sb_secret_'), interrompendo o programa se a condição for falsa.
payload = (ROOT / 'import-payload.json').read_bytes()  # Define payload como os bytes do arquivo ROOT / 'import-payload.json'.
opener = urllib.request.build_opener(NoRedirect())  # Define opener como um cliente HTTP com os manipuladores informados.
request = urllib.request.Request(  # Define request como uma requisição HTTP para o resultado da expressão BASE + '/rest/v1/rpc/praxis_import_drive_20261009'.
    BASE + '/rest/v1/rpc/praxis_import_drive_20261009', data=payload,  # Fornece o argumento data com payload.
    headers={'apikey': key, 'Content-Type': 'application/json', 'User-Agent': 'Praxis content import'},  # Fornece o argumento headers com um dicionário com as chaves 'apikey', 'Content-Type', 'User-Agent'.
    method='POST',  # Fornece o argumento method com o texto “POST”.
)  # Encerra a coleção, a chamada ou a expressão iniciada acima.
try:  # Inicia a tentativa de execução com tratamento de falhas.
    with opener.open(request, timeout=120) as response:  # Abre e gerencia o recurso a abertura do arquivo ou da conexão com os parâmetros informados, encerrando-o ao sair do bloco.
        result = json.loads(response.read())  # Define result como os dados interpretados do JSON a leitura do conteúdo disponível no fluxo.
except urllib.error.HTTPError as error:  # Captura urllib.error.HTTPError em error para tratar a falha.
    # This fixed RPC returns only database diagnostics, never credentials.
    print(json.dumps({'http': error.code, 'database_error': error.read().decode('utf-8')}, ensure_ascii=False))  # Executa a exibição de a serialização de um dicionário com as chaves 'http', 'database_error' para JSON na saída do programa.
    raise SystemExit(1)  # Lança o resultado de SystemExit com 1 para interromper o fluxo.
result['completed_at'] = datetime.now(timezone.utc).isoformat()  # Define result['completed_at'] como a data e hora no formato ISO 8601.
(ROOT / 'publication-receipt.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')  # Executa a gravação do texto em ROOT / 'publication-receipt.json'.
print(json.dumps(result, ensure_ascii=False))  # Executa a exibição de a serialização de result para JSON na saída do programa.
