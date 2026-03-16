# Team Synchronization & Setup Guide 🚀

To ensure everyone on the RepoMind team has a unified working environment and to avoid common errors when pulling code, please follow these steps.

## 📋 Prerequisites
- **Git**: Ensure Git is installed and added to your PATH.
- **Python 3.10+**: Recommended version.
- **Node.js 18+**: For the frontend.

---

## 🔧 Component Setup

### 1. Backend (FastAPI)
1. Navigate to the `backend` directory: `cd backend`
2. Create and activate a virtual environment:
   - Windows: `python -m venv venv; .\venv\Scripts\activate`
   - Mac/Linux: `python -m venv venv; source venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt`
4. **Environment Setup**: 
   - Copy `.env.example` to `.env`.
   - Add your `OPENAI_API_KEY`.
   - The default `DATABASE_URL` is set to SQLite (`repomind.db`) for easy local development.
5. Run migrations: `alembic upgrade head`
6. Start the server: `python -m uvicorn app.main:app --reload`

### 2. Frontend (Next.js)
1. Navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`

---

## 🛠️ Common Fixes & Efficiency

### ❗ Windows Subprocess Error (`NotImplementedError`)
If you encounter this error during analysis, it's because you're using an older version of the code that relied on a specific Windows event loop policy. 
- **Fix**: Pull the latest code. I've switched the cloner to a **thread-based model** (`asyncio.to_thread`) which works reliably across all Windows environments.

### 🗄️ Database Consistency
- We use **SQLite** locally by default.
- The `repomind.db` file is gitignored to avoid merge conflicts.
- If you face database errors after pulling, run: `alembic upgrade head`

### 🔑 Environment Synchronization
- If new features are added, check the latest `backend/.env.example`.
- Ensure your local `.env` contains all required keys.

---

## 📂 Project Structure At a Glance
- `backend/`: FastAPI services, AI logic (OpenAI/FAISS), and AST parsing.
- `frontend/`: Next.js dashboard, React Flow visualizations, and Zustand store.
- `docs/`: Deployment guides and technical deep-dives.
