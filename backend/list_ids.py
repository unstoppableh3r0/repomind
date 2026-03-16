import httpx
import json

BASE_URL = "http://localhost:8000/api/v1"

def list_ids():
    try:
        response = httpx.get(f"{BASE_URL}/projects")
        projects = response.json().get("projects", [])
        for p in projects:
            print(f"ID: {p['id']}, Name: {p['name']}, Status: {p['status']}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_ids()
