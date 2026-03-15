# RepoMind — Deployment Guide

Complete guide to deploying RepoMind locally and in production.

---

## Table of Contents

1. [Local Development](#local-development)
2. [Environment Variables](#environment-variables)
3. [Production Deployment](#production-deployment)
   - [Backend → Render](#backend--render)
   - [Frontend → Vercel](#frontend--vercel)
   - [Database → Supabase](#database--supabase)
4. [Docker Deployment](#docker-deployment)
5. [Architecture Overview](#architecture-overview)
6. [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+ (or Docker)
- Git
- An OpenAI API key

### Step 1: Clone and set up

```bash
git clone https://github.com/your-org/repomind.git
cd repomind
```

### Step 2: Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --port 8000
```

The API is now running at `http://localhost:8000`.
API docs available at `http://localhost:8000/docs`.

### Step 3: Frontend setup

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev
```

The app is now running at `http://localhost:3000`.

### Step 4: Database (if not using Docker)

```bash
# macOS
brew install postgresql@16
brew services start postgresql@16
createdb repomind

# Ubuntu/Debian
sudo apt install postgresql-16
sudo -u postgres createdb repomind
sudo -u postgres psql -c "CREATE USER repomind WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE repomind TO repomind;"
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (asyncpg format) |
| `OPENAI_API_KEY` | ✅ | Your OpenAI API key |
| `OPENAI_MODEL` | ❌ | Model to use (default: `gpt-4o`) |
| `OPENAI_EMBEDDING_MODEL` | ❌ | Embedding model (default: `text-embedding-3-small`) |
| `SECRET_KEY` | ✅ | Random secret for security |
| `ALLOWED_ORIGINS` | ✅ | JSON array of allowed CORS origins |
| `GITHUB_TOKEN` | ❌ | GitHub PAT for private repo access |
| `REPOS_DIR` | ❌ | Where to clone repos (default: `/tmp/repomind_repos`) |
| `FAISS_INDEX_DIR` | ❌ | Where to store vector indexes (default: `/tmp/repomind_faiss`) |
| `MAX_REPO_SIZE_MB` | ❌ | Max repo size to analyze (default: 500) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API base URL |

---

## Production Deployment

### Database → Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy the connection string from **Settings → Database → Connection string → URI**
3. Change the scheme from `postgresql://` to `postgresql+asyncpg://`
4. Use this as `DATABASE_URL` in your backend deployment

```
postgresql+asyncpg://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Backend → Render

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repository
3. Configure:
   - **Root directory**: `backend`
   - **Runtime**: Python 3
   - **Build command**: `pip install -r requirements.txt && alembic upgrade head`
   - **Start command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables from the table above
5. Set **Instance type** to at least `Standard` (2 vCPU / 2GB RAM) for FAISS operations

> **Important**: Render's ephemeral filesystem means FAISS indexes are lost on redeploy.
> For production, migrate the FAISS storage to S3 or use Pinecone/Weaviate instead.

#### Persistent storage for FAISS on Render

For persistent vector storage, add a Render Disk:
- Mount path: `/data`
- Set `FAISS_INDEX_DIR=/data/faiss` and `REPOS_DIR=/data/repos`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → Import Project
2. Connect your GitHub repository
3. Configure:
   - **Framework preset**: Next.js
   - **Root directory**: `frontend`
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL (e.g. `https://repomind-api.onrender.com`)
5. Deploy

Vercel automatically handles builds, CDN, and SSL.

### Alternative: Railway

Railway can host both backend and PostgreSQL together:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables
railway variables set OPENAI_API_KEY=sk-...
railway variables set DATABASE_URL=...
```

---

## Docker Deployment

### Local with Docker Compose

```bash
# Set your OpenAI key
export OPENAI_API_KEY=sk-your-key-here

# Start all services
docker-compose up --build

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

Services will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

### Production Docker

```bash
# Build images
docker build -t repomind-backend ./backend
docker build -t repomind-frontend ./frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://your-api.com

# Push to registry
docker tag repomind-backend ghcr.io/your-org/repomind-backend:latest
docker push ghcr.io/your-org/repomind-backend:latest
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                        │
│   Next.js + React + TailwindCSS + ReactFlow             │
│   Hosted on Vercel (CDN, Edge, Auto-scaling)            │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────┐
│                      API LAYER                           │
│   FastAPI + Uvicorn                                     │
│   Hosted on Render / Railway                            │
│                                                         │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │ Repo Analyzer│  │  Code Parser  │  │Graph Builder│ │
│  │ (GitPython)  │  │  (AST/Regex)  │  │ (NetworkX)  │ │
│  └──────────────┘  └───────────────┘  └─────────────┘ │
│                                                         │
│  ┌──────────────┐  ┌───────────────┐                   │
│  │  Embeddings  │  │  AI Service   │                   │
│  │  (FAISS)     │  │  (OpenAI)     │                   │
│  └──────────────┘  └───────────────┘                   │
└────────────────┬─────────────────────────────────────────┘
                 │
    ┌────────────┴──────────────┐
    │                           │
┌───▼──────┐           ┌───────▼──────┐
│PostgreSQL│           │  FAISS Index  │
│(Supabase)│           │  (Disk/S3)    │
└──────────┘           └──────────────┘
```

### Analysis Pipeline Flow

```
GitHub URL
    ↓
git clone (GitPython)
    ↓
Directory scan (os.walk)
    ↓ ← language detection, framework detection
AST/Regex parsing (Python/JS/TS)
    ↓ ← extract functions, classes, routes, models
Dependency graph (NetworkX)
    ↓ ← import resolution, module relationships
Code chunking (symbol-based)
    ↓
OpenAI embeddings (text-embedding-3-small)
    ↓
FAISS vector index (cosine similarity)
    ↓
LLM analysis (GPT-4o):
  ├── Project summary
  ├── Architecture explanation
  ├── Workflow detection
  └── Onboarding documentation
    ↓
Stored in PostgreSQL + FAISS
    ↓
Available for chat (RAG pipeline)
```

---

## Troubleshooting

### "Git clone failed"
- Check the GitHub URL is exactly `https://github.com/owner/repo`
- For private repos, ensure `GITHUB_TOKEN` has `repo` scope
- Large repos (>500MB) will timeout — increase `MAX_REPO_SIZE_MB` or use shallow clones

### "FAISS index not found"
- The analysis may not have completed yet — check status endpoint
- On Render free tier, ephemeral filesystem resets between deploys — use a persistent disk

### "OpenAI API error"
- Verify `OPENAI_API_KEY` is set correctly and has credits
- Rate limiting: the embedding step calls the API in batches of 100 chunks with 3s delays
- For very large repos (>5000 files), consider increasing the file limit in `analysis_orchestrator.py`

### "Analysis stuck at embedding"
- This is normal for large repos — embeddings take ~1-3 minutes per 1000 chunks
- Monitor logs: `docker-compose logs -f backend`

### Database connection issues
- Ensure `DATABASE_URL` uses `postgresql+asyncpg://` not `postgresql://`
- For Supabase, use the **direct connection** string (not the pooler) for migrations

### CORS errors in browser
- Ensure `ALLOWED_ORIGINS` in backend includes your frontend URL exactly
- Include both `http://` and `https://` versions if needed

---

## Performance Tuning

### For large repositories (>1000 files)

1. **Increase file limit** in `analysis_orchestrator.py`:
   ```python
   source_files = [...][:500]  # Increase from 200
   ```

2. **Use async embedding batches** — already implemented, but increase `batch_size`:
   ```python
   embedded_chunks = await embedding_service.embed_chunks(all_chunks, batch_size=200)
   ```

3. **Add a task queue** (Celery + Redis) for production to handle concurrent analyses:
   ```python
   # Instead of background_tasks.add_task(...)
   # Use: analyze_task.delay(project_id, ...)
   ```

4. **Migrate FAISS to Pinecone** for serverless deployments where disk persistence is unavailable.

---

## Cost Estimates

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth/mo | $20/mo Pro |
| Render | 750h/mo (sleeps) | $7/mo Starter |
| Supabase | 500MB DB, 5GB egress | $25/mo Pro |
| OpenAI | Pay per use | ~$0.05–0.50/repo analysis |

Estimated cost per analysis: **$0.05–0.30** depending on repo size (embedding + LLM calls).
