import os
import sys
import subprocess
import socket
import time
import webbrowser
import signal

def check_python_dependencies():
    print("Checking Python backend dependencies...")
    try:
        import fastapi
        import uvicorn
        import pandas
        import openpyxl
        import nltk
        import textblob
        import sklearn
        import joblib
        import matplotlib
        print("Python backend dependencies... [OK]")
    except ImportError as e:
        print(f"Missing dependency '{e.name}'. Running auto-installer: pip install -r requirements.txt...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
            print("Python backend dependencies auto-installed successfully.")
        except Exception as install_err:
            print(f"Failed to auto-install backend dependencies: {install_err}")
            sys.exit(1)

def check_frontend_dependencies():
    print("Checking React frontend dependencies...")
    node_modules_path = os.path.join("frontend", "node_modules")
    if not os.path.exists(node_modules_path):
        print("frontend/node_modules folder is missing. Running self-setup: npm install...")
        try:
            subprocess.check_call("npm install", shell=True, cwd="frontend")
            print("Frontend npm dependencies installed successfully.")
        except Exception as e:
            print(f"Failed to run npm install in frontend: {e}")
            sys.exit(1)
    else:
        print("React frontend dependencies... [OK]")

def compile_ml_model(python_exe):
    print("Auto-compiling/training local machine learning model binary...")
    backend_path = os.path.abspath(".")
    
    # Run a helper python command using the target python executable to compile the model
    # to avoid path import clashes in the runner's own python process.
    compile_cmd = [
        python_exe,
        "-c",
        "from app.services.ml_classifier import SentixMLClassifier; "
        "clf = SentixMLClassifier(); "
        "clf.train_default_model(); "
        "print('Model training/compilation complete.')"
    ]
    try:
        subprocess.check_call(compile_cmd, cwd=backend_path)
        print("ML model compilation... [OK]")
    except Exception as e:
        print(f"Failed to pre-compile the ML model: {e}")
        # Non-fatal: let backend attempt loading
        pass

def wait_for_port(port, host="127.0.0.1", timeout=30):
    print(f"Waiting dynamically for backend to startup on port {port}...")
    start_time = time.time()
    while True:
        try:
            with socket.create_connection((host, port), timeout=1):
                print(f"Backend detected active on port {port}!")
                return True
        except (socket.timeout, ConnectionRefusedError):
            if time.time() - start_time > timeout:
                raise TimeoutError(f"Backend server on port {port} did not startup within {timeout} seconds.")
            time.sleep(0.5)

def main():
    # 1. Dependency checks
    check_python_dependencies()
    check_frontend_dependencies()
    
    # Determine local python path for backend
    backend_dir = os.path.abspath(".")
    venv_dir = os.path.join(backend_dir, ".venv")
    if os.path.exists(venv_dir):
        if sys.platform == "win32":
            python_exe = os.path.join(venv_dir, "Scripts", "python.exe")
        else:
            python_exe = os.path.join(venv_dir, "bin", "python")
    else:
        python_exe = sys.executable

    # 2. Pre-compile ML model
    compile_ml_model(python_exe)

    # 3. Start Backend
    print("Launching FastAPI backend server...")
    backend_proc = subprocess.Popen([python_exe, "app_fastapi.py"], cwd=backend_dir)
    
    # 4. Wait for Port
    try:
        wait_for_port(8000)
    except Exception as e:
        print(e)
        backend_proc.terminate()
        sys.exit(1)

    # 5. Start Frontend
    print("Launching React frontend dev server (Vite)...")
    frontend_proc = subprocess.Popen("npm run dev", shell=True, cwd="frontend")

    # 6. Open Browser
    webbrowser.open("http://localhost:5173/")
    print("\nProject is running!")
    print("Frontend URL: http://localhost:5173/")
    print("Backend URL:  http://127.0.0.1:8000/")
    print("\nPress Ctrl+C in this terminal to terminate all processes and exit.")

    # Graceful shutdown handler
    def shutdown_servers(signum, frame):
        print("\nShutting down servers...")
        try:
            frontend_proc.terminate()
        except Exception:
            pass
        try:
            backend_proc.terminate()
        except Exception:
            pass
        print("Goodbye!")
        sys.exit(0)

    # Register signals for clean exit
    signal.signal(signal.SIGINT, shutdown_servers)
    signal.signal(signal.SIGTERM, shutdown_servers)

    # Keep active
    while True:
        try:
            time.sleep(1)
            # Check if backend crashed
            if backend_proc.poll() is not None:
                print("Backend server stopped unexpectedly.")
                frontend_proc.terminate()
                sys.exit(1)
        except (KeyboardInterrupt, SystemExit):
            shutdown_servers(None, None)

if __name__ == "__main__":
    main()
