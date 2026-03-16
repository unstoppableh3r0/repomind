# RepoMind 🧠

AI-powered developer onboarding platform.

## 🚀 Getting Started (Team Synchronization)

To ensure everyone has a unified working environment and to avoid common errors when pulling code, please follow these steps:

### 1. Prerequisites
- **Git**: Ensure Git is installed and added to your PATH.
- **Python 3.10+**: Recommended version.
- **Node.js 18+**: For the frontend.

### 2. Backend Setup
1. Navigate to the `backend` directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate it:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. **Environment Setup**: 
   - Copy `.env.example` to `.env`.
   - Add your `OPENAI_API_KEY`.
   - The default `DATABASE_URL` is set to SQLite for easy local development.
6. Run migrations: `alembic upgrade head`
7. Start the server: `python -m uvicorn app.main:app --reload`

### 3. Frontend Setup
1. Navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`

---

## What is RepoMind?

RepoMind solves the #1 pain point for new developers joining a team: **understanding a large, complex codebase quickly**.


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

## 🛠️ Common Fixes & Efficiency

- **Windows Subprocess Error**: If you encounter `NotImplementedError` during analysis, ensure you have pulled the latest code. I've switched the cloner to a thread-based model that works reliably on Windows.
- **Database Consistency**: We use SQLite locally (`repomind.db`). This file is gitignored. If you face schema issues, run `alembic upgrade head`.
- **Environment Inconsistencies**: Always check that your `.env` matches the latest `.env.example`.

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
- SQLite (local) / PostgreSQL (production)
- FAISS (vector similarity search)
- NetworkX (dependency graph analysis)

---

## Project Structure

```
repomind/
├── backend/                    # FastAPI Python backend
├── frontend/                   # Next.js React frontend
├── docs/                       # Documentation
└── README.md
```

Detailed structure can be found in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request
