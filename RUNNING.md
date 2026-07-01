# Running Sentix - Product Emotion Intelligence

This guide provides instructions on how to set up, run, and maintain the Frontend and Backend of the Sentix application directly from the root workspace directory.

---

## Prerequisites

Before starting, ensure you have the following installed on your system:
1. **Python** (version 3.10 or higher recommended)
2. **Node.js & npm** (LTS version recommended)
3. **uv** (Fast Python package manager) - *Optional, but highly recommended for speedy setup*

---

## ⚡ Quick Start (Unified Runner Script)

The easiest way to run the entire stack (both frontend and backend, including auto-dependency checks and model training) is to use the unified runner script at the root:

```bash
# Using the workspace virtual environment
.\.venv\Scripts\python.exe run_project.py
```

This script will automatically:
1. Check and install missing python dependencies from `requirements.txt`.
2. Check and install missing frontend npm dependencies in `frontend/`.
3. Auto-compile/train the local TF-IDF machine learning model binary if needed.
4. Launch the FastAPI backend server on port `8000`.
5. Launch the React dev server (Vite) on port `5173`.
6. Open your default web browser to the application page (`http://localhost:5173/`).

---

## 1. Backend Setup & Running (Manual)

The backend is built with FastAPI and runs on port `8000` directly from the root workspace directory.

### Option A: Using `uv` (Recommended)
1. Open your terminal at the root workspace directory.
2. Create/Recreate a clean virtual environment:
   ```bash
   uv venv --python 3.10 --clear
   ```
3. Install dependencies:
   ```bash
   uv pip install -r requirements.txt
   ```
4. Run the FastAPI development server:
   ```bash
   .\.venv\Scripts\python app_fastapi.py
   ```

### Option B: Using Standard Python `venv`
1. Open your terminal at the root workspace directory.
2. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```
3. Activate the virtual environment:
   * **Windows (PowerShell):** `.\.venv\Scripts\Activate.ps1`
   * **Windows (CMD):** `.\.venv\Scripts\activate.bat`
   * **Linux/macOS:** `source .venv/bin/activate`
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the FastAPI server:
   ```bash
   python app_fastapi.py
   ```

You can verify that the backend is running by visiting: [http://127.0.0.1:8000/healthz](http://127.0.0.1:8000/healthz)

---

## 2. Frontend Setup & Running (Manual)

The frontend is built using React, TypeScript, and Vite. It runs on port `5173`.

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

The application will be accessible at: [http://localhost:5173/](http://localhost:5173/)

---

## 3. Keeping the App Running in the Background

To keep the application running persistently (without keeping terminal windows open) or in production, you can use one of the following methods:

### Method 1: Using PM2 (Recommended for Node & Python)
PM2 is a production process manager that can easily manage and keep both your Node.js (frontend) and Python (backend) processes alive.

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. **Start Backend with PM2:**
   From the root workspace folder, run:
   ```bash
   pm2 start ".\.venv\Scripts\python.exe app_fastapi.py" --name "sentix-backend"
   ```

3. **Start Frontend with PM2:**
   From the `frontend` folder, build the production code and preview it, or start dev server:
   * **For Production Build (Recommended):**
     ```bash
     npm run build
     pm2 start "npm run preview" --name "sentix-frontend"
     ```
   * **For Development Mode:**
     ```bash
     pm2 start "npm run dev" --name "sentix-frontend"
     ```

4. **Monitor and Manage Processes:**
   * View all running processes: `pm2 status`
   * View logs: `pm2 logs`
   * Restart a process: `pm2 restart <name>`
   * Stop a process: `pm2 stop <name>`
   * Save the process list to restore on reboot: `pm2 save`

### Method 2: Running as a Windows Background Task (NSSM)
On Windows, you can install the backend and frontend as Windows Services using **NSSM (Non-Sucking Service Manager)**:
1. Download NSSM.
2. Install the service:
   ```bash
   nssm install SentixBackend
   ```
3. Set the Path to `python.exe` and Arguments to `app_fastapi.py` with the startup directory set to the root workspace folder.
