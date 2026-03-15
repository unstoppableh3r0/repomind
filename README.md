# RepoMind 🧠

> **AI-powered developer onboarding platform** — understand any GitHub codebase in minutes, not weeks.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai)](https://openai.com)

---

## What is RepoMind?

RepoMind solves the #1 pain point for new developers joining a team: **understanding a large, complex codebase quickly**.

You paste a GitHub URL. RepoMind:

1. **Clones** the repository
2. **Analyzes** the code with AST parsing and static analysis
3. **Generates** an interactive architecture diagram (dependency graph)
4. **Detects** developer workflows (auth flows, payment flows, etc.)
5. **Embeds** all code into a vector database
6. **Lets you chat** with the codebase in natural language

---

## Features

| Feature | Description |
|---------|-------------|
| 🔍 **Repository Analysis** | Language detection, framework detection, file structure mapping |
| 🏗️ **Architecture Diagrams** | Interactive React Flow graphs of module dependencies |
| ⚡ **Workflow Detection** | Reverse-engineers auth, payment, registration flows from code |
| 💬 **Chat with Codebase** | RAG-powered Q&A grounded in actual source code |
| 📚 **Auto Documentation** | Onboarding guide, architecture overview, setup instructions |
| 🔧 **Function Explainer** | Click any file/function to get an AI explanation |

---

## Tech Stack

**Frontend**
- Next.js 14 (App Router)
- React + TypeScript
- TailwindCSS + ShadCN UI
- React Flow (dependency graphs)
- Zustand (state management)

**Backend**
- FastAPI + Uvicorn (async)
- SQLAlchemy 2.0 (async ORM)
- PostgreSQL (project/analysis data)
- FAISS (vector similarity search)
- NetworkX (dependency graph analysis)

**AI Layer**
- OpenAI GPT-4o (analysis, chat)
- OpenAI text-embedding-3-small (code embeddings)
- AST parsing (Python)
- Regex-based parsing (JS/TS)

**Infrastructure**
- Vercel (frontend)
- Render / Railway (backend)
- Supabase (PostgreSQL)

---

## Project Structure

```
repomind/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── main.py             # FastAPI app entry point
│   │   ├── api/                # Route handlers
│   │   │   ├── analyze.py      # POST /analyze-repo
│   │   │   ├── chat.py         # POST /chat
│   │   │   ├── structure.py    # GET /repo-structure
│   │   │   ├── architecture.py # GET /architecture
│   │   │   ├── workflows.py    # GET /workflows
│   │   │   └── docs.py         # GET /docs, POST /explain
│   │   ├── core/
│   │   │   ├── config.py       # Settings (pydantic-settings)
│   │   │   └── database.py     # Async SQLAlchemy engine
│   │   ├── models/
│   │   │   └── models.py       # SQLAlchemy ORM models
│   │   ├── schemas/
│   │   │   └── schemas.py      # Pydantic request/response schemas
│   │   └── services/
│   │       ├── repo_analyzer.py        # Git clone + directory scan
│   │       ├── code_parser.py          # AST + regex code parsing
│   │       ├── graph_builder.py        # NetworkX dependency graph
│   │       ├── embedding_service.py    # FAISS embedding + search
│   │       ├── ai_service.py           # OpenAI LLM prompts
│   │       └── analysis_orchestrator.py # Full pipeline coordinator
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                   # Next.js React frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                      # Landing page
│   │   │   ├── layout.tsx                    # Root layout
│   │   │   └── dashboard/[projectId]/
│   │   │       ├── layout.tsx                # Sidebar layout
│   │   │       ├── page.tsx                  # Overview + status
│   │   │       ├── visualize/page.tsx        # React Flow graph
│   │   │       ├── chat/page.tsx             # Chat interface
│   │   │       ├── workflows/page.tsx        # Workflow cards
│   │   │       └── docs/page.tsx             # Documentation
│   │   └── lib/
│   │       ├── api.ts          # Typed API client (axios)
│   │       ├── store.ts        # Zustand global state
│   │       └── utils.ts        # Helper functions
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── .env.example
│
├── docs/
│   └── DEPLOYMENT.md           # Full deployment guide
├── docker-compose.yml          # Local development stack
└── README.md
```

---

## Quick Start

```bash
# 1. Clone this repository
git clone https://github.com/your-org/repomind
cd repomind

# 2. Start everything with Docker
export OPENAI_API_KEY=sk-your-key-here
docker-compose up --build

# 3. Open http://localhost:3000
# 4. Paste a GitHub URL and click Analyze
```

For manual setup, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/analyze-repo` | POST | Start repository analysis |
| `/api/v1/analyze-repo/{id}/status` | GET | Poll analysis progress |
| `/api/v1/repo-structure/{id}` | GET | File tree + language stats |
| `/api/v1/architecture/{id}` | GET | Dependency graph + explanation |
| `/api/v1/workflows/{id}` | GET | Detected developer workflows |
| `/api/v1/docs/{id}` | GET | Generated documentation |
| `/api/v1/chat` | POST | RAG-powered chat with codebase |
| `/api/v1/explain` | POST | Explain a specific file/function |
| `/api/v1/projects` | GET | List all analyzed projects |

Interactive API docs: `http://localhost:8000/docs`

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) file.
