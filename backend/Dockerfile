FROM python:3.12-slim

# System dependencies for git and faiss
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Create temp dirs
RUN mkdir -p /tmp/repomind_repos /tmp/repomind_faiss

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
