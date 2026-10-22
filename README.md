# 📦 RF Analyzer

O **RF Analyzer** é uma aplicação web de alta performance construída para simplificar e automatizar a análise, filtragem e atualização de dados de logística em lote (arquivos de registros RF e conciliação de cargas).

---

## 🚀 Funcionalidades Principal

- **Processamento de Arquivos RF:** Extração rápida de dados de pedidos, clientes, valores e Notas Fiscais a partir de arquivos texto RF.
- **Tratamento Inteligente de NF:** Mapeamento automático com remoção de zeros à esquerda e identificação de sequências nulas/zeradas (ex: `"000000000"` interpretado corretamente como *Sem NF*).
- **Associação de Cargas:** Upload de arquivos CSV/TXT para atualização dinâmica do número de carga por pedido.
- **Edição em Tempo Real:** Edição direta do campo de carga na interface e atualização instantânea na memória e visualização do RF.
- **Filtros e Exportação:** Filtragem inteligente por status (*Com NF, Sem NF, Com Carga, Sem Carga*) e exportação dos blocos de dados ajustados em formato `.txt` com quebras de linha preservadas.
- **Drag & Drop:** Suporte a arrastar e soltar arquivos de pedidos e cargas diretamente na interface.

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** [FastAPI](https://fastapi.tiangolo.com/) + [Uvicorn](https://www.uvicorn.org/)
- **Frontend:** HTML5, CSS3 (com customização Tailwind/Slate), JavaScript (ES6+), Bootstrap 5
- **Visual:** Bootstrap Icons & Tema Dark Moderno

---

## 📁 Estrutura do Projeto

```text
.
├── app.py                # Servidor FastAPI e lógica principal de processamento
├── README.md             # Documentação do projeto
└── src/
    ├── index.html        # Interface principal da aplicação
    ├── style.css         # Estilização visual (tons de cinza/slate)
    ├── app.js            # Lógica interativa da interface e exportações
    └── favicon.svg       # Ícone vetorial da aplicação
```

---

## 🔧 Como Executar o Projeto

### Pré-requisitos
- Python 3.8 ou superior
- Pip (gerenciador de pacotes do Python)

### Passo a Passo

1. **Instale as dependências:**
   ```bash
   pip install fastapi uvicorn
   ```

2. **Inicie o servidor:**
   ```bash
   python app.py
   ```

3. **Acesse no navegador:**
   Abra o seu navegador e acesse `http://localhost:8080` (ou `http://127.0.0.1:8080`).

---

## 💻 Uso da Aplicação

1. Cole a lista de códigos de pedido na caixa de texto da barra lateral.
2. Selecione ou arraste os arquivos de relatório **RF**.
3. *(Opcional)* Selecione ou arraste um arquivo `.csv` ou `.txt` com o mapeamento de **Cargas**.
4. Clique em **Processar Dados**.
5. Utilize as ações da tabela para editar cargas individualmente, visualizar o bloco RF original ou exportar os resultados atualizados em `.txt`.