import sys
import subprocess

# Self-installer wrapper for requests library
try:
    import requests
except ImportError:
    print("Testing dependency 'requests' is missing. Running self-setup: pip install requests...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
        import requests
    except Exception as e:
        print(f"Failed to auto-install 'requests' library: {e}")
        sys.exit(1)

import time

def run_integration_tests():
    base_url = "http://127.0.0.1:8000"
    print("=== RUNNING SENTIX INTEGRATION VERIFICATION ===")
    
    # 1. Test Healthz
    try:
        res = requests.get(f"{base_url}/healthz")
        if res.status_code == 200:
            print("healthz endpoint ... [PASS]")
        else:
            print(f"healthz endpoint ... [FAIL] (status {res.status_code})")
            sys.exit(1)
    except Exception as e:
        print(f"healthz endpoint ... [FAIL] (Backend is not running at {base_url}: {e})")
        sys.exit(1)
        
    # 2. Test Single Analysis
    payload = {
        "text": "This memory card works perfectly. Highly recommend it!",
        "metadata": {"source": "integration_test"}
    }
    try:
        res = requests.post(f"{base_url}/api/analyze/single", json=payload)
        if res.status_code == 200:
            data = res.json()
            sentiment = data.get("sentiment", 0.0)
            primary_emotion = data.get("primaryEmotion", "")
            print(f"single analysis API ... [PASS] (sentiment={sentiment}, primary={primary_emotion})")
        else:
            print(f"single analysis API ... [FAIL] (status {res.status_code}: {res.text})")
            sys.exit(1)
    except Exception as e:
        print(f"single analysis API ... [FAIL] ({e})")
        sys.exit(1)

    print("==============================================")
    print("ALL BACKEND INTEGRATION CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_integration_tests()
