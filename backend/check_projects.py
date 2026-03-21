from app.core.database import SessionLocal
from app.models.models import Repository, Project, CodeChunk

session = SessionLocal()

print("=== PROJECTS ===")
projects = session.query(Project).all()
for p in projects:
    print(f"{p.id}: {p.name}")

print("\n=== REPOSITORIES ===")
repos = session.query(Repository).all()
for r in repos:
    chunks = session.query(CodeChunk).filter(CodeChunk.repository_id == r.id).count()
    print(f"{r.id}: {r.name} (chunks: {chunks})")

session.close()
