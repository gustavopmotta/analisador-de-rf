import re
import os
import csv
import io
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, Response
import uvicorn

app = FastAPI(title="RF Analyzer Unified", version="6.0")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(os.path.dirname(BASE_DIR), "src")

def rf_trim0(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    t = val.strip().lstrip('0')
    return t if t else '0'

def rf_money(centavos: Optional[str]) -> Optional[str]:
    if not centavos or not centavos.strip().isdigit():
        return "0,00"
    v = int(centavos.strip()) / 100.0
    return f"{v:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

def processar_analise_rf(codigos_raw: str, arquivos_rf: List[UploadFile], arquivo_cargas: Optional[UploadFile] = None):
    pedidos_input = [p.strip() for p in codigos_raw.splitlines() if p.strip()]
    if not pedidos_input:
        return {"erro": "Nenhum código de pedido foi informado."}

    carga_map = {}
    if arquivo_cargas and arquivo_cargas.filename:
        conteudo_cargas = arquivo_cargas.file.read().decode('utf-8', errors='ignore')
        for linha in conteudo_cargas.splitlines():
            linha_limpa = linha.strip()
            if not linha_limpa or linha_limpa.upper().startswith("PEDIDO"):
                continue
            if ';' in linha_limpa:
                partes = [p.strip() for p in linha_limpa.split(';')]
            elif ',' in linha_limpa:
                partes = [p.strip() for p in linha_limpa.split(',')]
            else:
                partes = re.split(r'\s+', linha_limpa)
            if len(partes) >= 2 and partes[0].isdigit():
                carga_map[partes[0]] = partes[1]

    mapa = {}
    total_arquivos = 0

    for arq in arquivos_rf:
        if not arq.filename:
            continue
        total_arquivos += 1
        conteudo = arq.file.read().decode('utf-8', errors='ignore')
        linhas = conteudo.splitlines()

        # Variável para rastrear o bloco atual do pedido com base nas linhas 01, 02, 03
        bloco_atual_linhas = []
        pedido_atual = None
        cliente_atual = None
        carga_atual = None
        nf_atual = None
        valor_atual_fmt = "0,00"
        valor_atual_raw = 0
        has_nf = False
        has_carga = False

        for linha in linhas:
            linha_str = linha.strip()
            if not linha_str:
                continue
            p = linha_str.split('|')
            if len(p) < 2:
                continue

            tipo = p[0].strip()

            # Quando encontra um tipo '01', marca o início de um novo bloco de pedido
            if tipo == '01':
                # Se já havia um bloco em andamento, guarda-o antes de iniciar o próximo
                if bloco_atual_linhas and pedido_atual:
                    chave_unica = f"{pedido_atual}_{len(mapa)}_{arq.filename}"
                    mapa[chave_unica] = {
                        'linhas': list(bloco_atual_linhas),
                        'pedido_id': pedido_atual,
                        'cliente_id': cliente_atual,
                        'carga': carga_atual,
                        'nf': nf_atual,
                        'valor_pedido_fmt': valor_atual_fmt,
                        'valor_raw': valor_atual_raw,
                        'arquivo': arq.filename,
                        'has_nf': has_nf,
                        'has_carga': has_carga
                    }
                
                # Reseta para o novo bloco
                bloco_atual_linhas = [linha_str]
                pedido_atual = None
                cliente_atual = None
                carga_atual = None
                nf_atual = None
                valor_atual_fmt = "0,00"
                valor_atual_raw = 0
                has_nf = False
                has_carga = False

                # Extrai os dados da linha 01 atual
                if len(p) > 28 and p[28].strip().isdigit():
                    pedido_atual = p[28].strip()
                if len(p) > 17:
                    cliente_atual = rf_trim0(p[17])
                if len(p) > 9 and p[9].strip().isdigit():
                    valor_atual_raw = int(p[9].strip())
                    valor_atual_fmt = rf_money(p[9])
                
                nf_val = p[3].strip() if len(p) > 3 else ''
                if nf_val and nf_val != '0' and not re.match(r'^0+$', nf_val):
                    nf_atual = nf_val
                    has_nf = True
                else:
                    nf_atual = None
                    has_nf = False
                
                carga_val = p[16].strip() if len(p) > 16 else ''
                if carga_val:
                    carga_atual = carga_val
                    has_carga = True
            else:
                # Adiciona linhas subsequentes (02, 03, etc.) ao bloco atual
                if bloco_atual_linhas:
                    bloco_atual_linhas.append(linha_str)

        # Adiciona o último bloco do arquivo
        if bloco_atual_linhas and pedido_atual:
            chave_unica = f"{pedido_atual}_{len(mapa)}_{arq.filename}"
            mapa[chave_unica] = {
                'linhas': list(bloco_atual_linhas),
                'pedido_id': pedido_atual,
                'cliente_id': cliente_atual,
                'carga': carga_atual,
                'nf': nf_atual,
                'valor_pedido_fmt': valor_atual_fmt,
                'valor_raw': valor_atual_raw,
                'arquivo': arq.filename,
                'has_nf': has_nf,
                'has_carga': has_carga
            }

    resultados = []
    encontrados_set = set()

    for item in mapa.values():
        pid = item['pedido_id']
        if pid and pid in pedidos_input:
            if pid in carga_map:
                nova_carga = carga_map[pid]
                item['carga'] = nova_carga
                item['has_carga'] = bool(nova_carga)
                novas_linhas = []
                for l in item['linhas']:
                    if l.startswith('01|'):
                        pt = l.split('|')
                        while len(pt) <= 16:
                            pt.append('')
                        pt[16] = nova_carga
                        novas_linhas.append('|'.join(pt))
                    else:
                        novas_linhas.append(l)
                item['linhas'] = novas_linhas

            resultados.append(item)
            encontrados_set.add(pid)

    resultados.sort(key=lambda x: x['valor_raw'], reverse=True)

    return {
        "total_buscados": len(pedidos_input),
        "total_arquivos": total_arquivos,
        "resultados": resultados,
        "nao_encontrados": list(set(pedidos_input) - encontrados_set)
    }

# --- Rotas do Frontend e API ---
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    path = os.path.join(SRC_DIR, "index.html")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

@app.get("/style.css")
async def serve_css():
    return FileResponse(os.path.join(SRC_DIR, "style.css"))

@app.get("/app.js")
async def serve_js():
    return FileResponse(os.path.join(SRC_DIR, "app.js"))

@app.post("/api/analisar")
async def analisar_api(
    codigos: str = Form(...),
    arquivo_rf: List[UploadFile] = File(...),
    arquivo_cargas: Optional[UploadFile] = File(None)
):
    res = processar_analise_rf(codigos, arquivo_rf, arquivo_cargas)
    return JSONResponse(content=res)

@app.post("/api/exportar-csv-modelo")
async def exportar_csv_modelo(codigos: str = Form(...)):
    """Gera um arquivo CSV modelo contendo os pedidos informados e coluna de carga em branco."""
    pedidos = [p.strip() for p in codigos.splitlines() if p.strip()]
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(['PEDIDO', 'CARGA'])
    for p in pedidos:
        writer.writerow([p, ''])
    
    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=modelo_cargas_pedidos.csv"}
    )

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8080)