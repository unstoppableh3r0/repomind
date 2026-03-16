import httpx
import json

BASE_URL = "http://localhost:8000/api/v1"

def check_status(project_id):
    try:
        response = httpx.get(f"{BASE_URL}/analyze-repo/{project_id}/status")
        print(f"Status for {project_id}:")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Use the project_id from the last run
    import sys
    if len(sys.argv) > 1:
        pid = sys.argv[1]
    else:
        pid = "e77aab0a-bf45-49d4-9dcd-c85202b0c204" # From previous output
    check_status(pid)
