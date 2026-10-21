# Usa uma imagem leve do Python 3.11
FROM python:3.13-slim

# Define o diretório de trabalho dentro do contentor
WORKDIR /app

# Desativa a escrita de ficheiros .pyc e garante logs em tempo real
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Instala dependências do sistema necessárias
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copia os ficheiros de dependências e instala
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia toda a estrutura do projeto (app/ e src/)
COPY . .

# Expõe a porta 8080 usada pelo FastAPI/Uvicorn
EXPOSE 8000

# Comando para iniciar o servidor Uvicorn
CMD ["python", "-m", "uvicorn", "app.app:app", "--host", "0.0.0.0", "--port", "8000"]