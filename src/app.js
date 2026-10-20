let dadosAnalisados = [];
let itemAtualModalIdx = null;

// Função para atualizar o texto do botão de upload ao selecionar arquivos
function atualizarNomeArquivo(input, labelId) {
    const label = document.getElementById(labelId);
    if (!label) return;

    if (input.files && input.files.length > 1) {
        label.textContent = `${input.files.length} arquivos selecionados`;
        label.style.color = '#818cf8';
        label.style.fontWeight = '600';
    } else if (input.files && input.files.length === 1) {
        label.textContent = input.files[0].name;
        label.style.color = '#818cf8';
        label.style.fontWeight = '600';
    } else {
        label.textContent = labelId === 'label-rf' ? 'Selecionar arquivos RF...' : 'Selecionar arquivo de cargas...';
        label.style.color = '#94a3b8';
        label.style.fontWeight = 'normal';
    }
}

// Submissão do Formulário
document.getElementById('analise-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.add('active');

    const codigosInput = document.getElementById('codigos').value.trim();
    if (!codigosInput) {
        alert('Por favor, insira ao menos um código de pedido.');
        if (loadingOverlay) loadingOverlay.classList.remove('active');
        return;
    }

    const formData = new FormData();
    formData.append('codigos', codigosInput);

    const filesRF = document.getElementById('arquivo_rf').files;
    if (filesRF.length === 0) {
        alert('Por favor, selecione ao menos um arquivo RF.');
        if (loadingOverlay) loadingOverlay.classList.remove('active');
        return;
    }

    for (let f of filesRF) {
        formData.append('arquivo_rf', f);
    }

    const fileCargasInput = document.getElementById('arquivo_cargas');
    if (fileCargasInput && fileCargasInput.files.length > 0) {
        formData.append('arquivo_cargas', fileCargasInput.files[0]);
    }

    try {
        const resp = await fetch('/api/analisar', {
            method: 'POST',
            body: formData
        });

        if (!resp.ok) {
            throw new Error(`Erro na requisição: ${resp.status} ${resp.statusText}`);
        }

        const res = await resp.json();

        if (res.erro) {
            alert(res.erro);
            return;
        }

        document.getElementById('boas-vindas').style.display = 'none';
        document.getElementById('area-resultados').style.display = 'block';

        document.getElementById('res-buscados').textContent = res.total_buscados || 0;
        document.getElementById('res-arquivos').textContent = res.total_arquivos || 0;
        document.getElementById('res-encontrados').textContent = res.resultados ? res.resultados.length : 0;

        dadosAnalisados = res.resultados || [];
        renderizarTabela(dadosAnalisados);
    } catch (err) {
        console.error("Erro ao analisar:", err);
        alert('Erro ao processar dados: ' + err.message);
    } finally {
        if (loadingOverlay) loadingOverlay.classList.remove('active');
    }
});

function renderizarTabela(itens) {
    const tbody = document.getElementById('tabela-corpo');
    tbody.innerHTML = '';

    if (itens.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5">Nenhum registro encontrado.</td></tr>';
        document.getElementById('contador-visiveis').textContent = 0;
        return;
    }

    itens.forEach((item, idx) => {
        const cargaBadgeId = `badge-carga-${idx}`;

        const trPrincipal = document.createElement('tr');
        trPrincipal.className = 'row-item';
        trPrincipal.dataset.hasNf = item.has_nf;
        trPrincipal.dataset.hasCarga = item.has_carga;

        trPrincipal.innerHTML = `
            <td class="fw-bold text-white">${item.pedido_id || '—'}</td>
            <td>${item.cliente_id || '—'}</td>
            <td>R$ ${item.valor_pedido_fmt || '0,00'}</td>
            <td>${item.has_nf ? `<span class="badge badge-modern badge-success-glow"><i class="bi bi-check-lg me-1"></i>${item.nf}</span>` : '<span class="badge badge-modern badge-danger-glow">Sem NF</span>'}</td>
            <td><span id="${cargaBadgeId}" class="badge badge-modern ${item.has_carga ? 'badge-info-glow' : 'bg-slate-800 text-slate-400'}">${item.carga || '—'}</span></td>
            <td class="small text-uppercase text-muted">${item.arquivo || '—'}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-info me-1" title="Editar Carga" onclick="alterarCarga(${idx}, '${cargaBadgeId}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-primary" title="Ver Detalhes do RF" onclick="abrirModalRf(${idx})"><i class="bi bi-eye-fill me-1"></i> Ver RF</button>
            </td>
        `;

        tbody.appendChild(trPrincipal);
    });

    document.getElementById('contador-visiveis').textContent = itens.length;
}

// Alterar carga diretamente na memória e atualizar a tela
function alterarCarga(idx, badgeId) {
    const novaCarga = prompt("Digite o novo valor da CARGA:");
    if (novaCarga === null) return;

    const valTrim = novaCarga.trim();
    const item = dadosAnalisados[idx];

    // Atualiza as linhas na memória
    item.linhas = item.linhas.map(line => {
        if (line.indexOf('01|') === 0) {
            let parts = line.split('|');
            while (parts.length <= 16) parts.push('');
            parts[16] = valTrim;
            return parts.join('|');
        }
        return line;
    });

    item.carga = valTrim;
    item.has_carga = !!valTrim;

    // Atualiza o badge na tabela
    const badge = document.getElementById(badgeId);
    if (badge) {
        badge.textContent = valTrim || '—';
        badge.className = `badge badge-modern ${valTrim ? 'badge-info-glow' : 'bg-slate-800 text-slate-400'}`;
    }

    // Se o modal estiver aberto com este item, atualiza o modal também
    if (itemAtualModalIdx === idx) {
        document.getElementById('conteudoModalRf').innerText = item.linhas.join('\n');
    }
}

// Abrir o Modal de Detalhes
function abrirModalRf(idx) {
    itemAtualModalIdx = idx;
    const item = dadosAnalisados[idx];
    if (!item) return;

    document.getElementById('modalSubtituloPed').textContent = `Pedido: ${item.pedido_id || '—'} | Arquivo: ${item.arquivo || '—'}`;
    document.getElementById('conteudoModalRf').innerText = (item.linhas || []).join('\n');

    const modalEl = document.getElementById('modalDetalhesRf');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

// Copiar conteúdo direto do Modal
function copiarTextoModal(btn) {
    const el = document.getElementById('conteudoModalRf');
    navigator.clipboard.writeText(el.innerText).then(() => {
        const orig = btn.innerHTML;
        btn.className = 'btn btn-sm btn-success';
        btn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Copiado!';
        setTimeout(() => {
            btn.className = 'btn btn-sm btn-outline-light';
            btn.innerHTML = orig;
        }, 1500);
    });
}

// Filtros da Tabela
function filtrarTabela(filtro, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('btn-primary', 'active');
        b.classList.add('btn-outline-secondary');
    });
    btn.classList.remove('btn-outline-secondary');
    btn.classList.add('btn-primary', 'active');

    const rows = document.querySelectorAll('.row-item');
    let visiveis = 0;

    rows.forEach(row => {
        const nextCollapse = row.nextElementSibling;
        const hasNf = row.dataset.hasNf === 'true';
        const hasCarga = row.dataset.hasCarga === 'true';
        let show = false;

        if (filtro === 'todos') show = true;
        else if (filtro === 'com_nf') show = hasNf;
        else if (filtro === 'sem_nf') show = !hasNf;
        else if (filtro === 'com_carga') show = hasCarga;
        else if (filtro === 'sem_carga') show = !hasCarga;

        if (show) {
            row.style.display = '';
            visiveis++;
        } else {
            row.style.display = 'none';
            if (nextCollapse && nextCollapse.classList.contains('show')) {
                const bsCollapse = bootstrap.Collapse.getInstance(nextCollapse);
                if (bsCollapse) bsCollapse.hide();
            }
        }
    });

    document.getElementById('contador-visiveis').textContent = visiveis;
}

// Utilitários de Copiar e Exportar
function copiarTexto(elementId, btn) {
    const el = document.getElementById(elementId);
    navigator.clipboard.writeText(el.innerText).then(() => {
        const orig = btn.innerHTML;
        btn.className = 'btn btn-sm btn-success';
        btn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Copiado!';
        setTimeout(() => {
            btn.className = 'btn btn-sm btn-outline-light';
            btn.innerHTML = orig;
        }, 1500);
    });
}

function copiarPedidosVisiveis(btn) {
    const pids = [];
    document.querySelectorAll('.row-item').forEach(r => {
        if (r.style.display !== 'none') {
            pids.push(r.querySelector('td').innerText);
        }
    });
    navigator.clipboard.writeText(pids.join('\n')).then(() => {
        const orig = btn.innerHTML;
        btn.className = 'btn btn-sm btn-success';
        btn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Copiado!';
        setTimeout(() => {
            btn.className = 'btn btn-sm btn-outline-light';
            btn.innerHTML = orig;
        }, 1500);
    });
}

function exportarTudo() {
    const pres = document.querySelectorAll('pre.rf-code');
    if (pres.length === 0) return alert('Nenhum dado para exportar.');

    const conteudo = Array.from(pres).map(p => p.innerText).join('\n');
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'RF_CARGAS_AJUSTADO.txt';
    a.click();
}

async function baixarCsvModelo() {
    const codigos = document.getElementById('codigos').value.trim();
    if (!codigos) {
        alert('Por favor, cole primeiro os códigos dos pedidos para gerar o modelo CSV.');
        return;
    }

    const formData = new FormData();
    formData.append('codigos', codigos);

    try {
        const resp = await fetch('/api/exportar-csv-modelo', { method: 'POST', body: formData });
        const blob = await resp.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modelo_cargas_pedidos.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        alert('Erro ao gerar arquivo CSV: ' + err.message);
    }
}