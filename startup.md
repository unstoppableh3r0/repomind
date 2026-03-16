# Startup Guide for RepoMind

This guide will help you get RepoMind up and running on your local machine.

## Prerequisites

- **Python 3.10+** (for the backend)
- **Node.js 18+** and **npm** (for the frontend)
- **OpenAI API Key** (you have already added this to your `.env` file)

---

## 1. Backend Setup

The backend is built with FastAPI.

1.  **Navigate to the backend directory:**
    ```bash
    cd repomind/backend
    ```

2.  **Create and activate a virtual environment (optional but recommended):**
    ```bash
    python -m venv .venv
    # On Windows:
    .venv\Scripts\activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Environment Variables:**
    Ensure your `.env` file is configured. You've already added your `OPENAI_API_KEY`.
    > [!NOTE]
    > By default, the application uses a local SQLite database (`repomind.db`).

5.  **Run the Backend Server:**
    ```bash
    uvicorn app.main:app --reload
    ```
    The backend will be available at `http://localhost:8000`.

---

## 2. Frontend Setup

The frontend is built with Next.js.

1.  **Navigate to the frontend directory:**
    ```bash
    cd repomind/frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Ensure you have a `.env.local` file (you can copy `.env.example`).
    ```bash
    cp .env.example .env.local
    ```
    Make sure `NEXT_PUBLIC_API_URL` is set to `http://localhost:8000`.

4.  **Run the Frontend Development Server:**
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:3000`.

---

## 3. Using RepoMind

Once both servers are running:
1.  Open your browser and go to `http://localhost:3000`.
2.  You can now start analyzing repositories by providing their GitHub URLs.
