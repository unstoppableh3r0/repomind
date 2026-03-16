import httpx
import json
import time

BASE_URL = "http://localhost:8000/api/v1"

def trigger_analysis(repo_url):
    payload = {
        "github_url": repo_url,
        "branch": "main"
    }
    try:
        response = httpx.post(f"{BASE_URL}/analyze-repo", json=payload, timeout=30)
        print("Trigger Response:")
        print(json.dumps(response.json(), indent=2))
        return response.json().get("project_id")
    except Exception as e:
        print(f"Error triggering: {e}")
        return None

def poll_status(project_id):
    print(f"\nPolling status for {project_id}...")
    while True:
        try:
            response = httpx.get(f"{BASE_URL}/analyze-repo/{project_id}/status")
            data = response.json()
            status = data.get("status")
            progress = data.get("progress_percent")
            step = data.get("current_step")
            
            print(f"[{status}] {progress}% - {step}")
            
            if status in ("complete", "failed"):
                if status == "failed":
                    print(f"ERROR: {data.get('error_message')}")
                break
                
            time.sleep(5)
        except Exception as e:
            print(f"Polling error: {e}")
            break

if __name__ == "__main__":
    repo = "https://github.com/tiangolo/typer"
    pid = trigger_analysis(repo)
    if pid:
        poll_status(pid)
