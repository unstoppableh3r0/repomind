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
    # Check the failed project status
    check_status("6692079b4e9c4ea5919bf5d9ebd9cca0")
    
    # Try listing projects to see if others exist
    try:
        response = httpx.get(f"{BASE_URL}/projects")
        print("\nProjects:")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error listing projects: {e}")
