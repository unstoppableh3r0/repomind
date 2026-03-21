import sys
sys.path.insert(0, '.')

from app.core.config import settings
from sqlalchemy import create_engine, text

# Connect synchronously to SQLite
engine = create_engine(settings.DATABASE_URL.replace('sqlite+aiosqlite:///', 'sqlite:///'))

with engine.connect() as conn:
    print("=== CHECKING ALL PROJECTS AND CODE CHUNKS ===\n")
    
    result = conn.execute(text("""
        SELECT p.id, p.name, COUNT(cc.id) as chunk_count
        FROM projects p
        LEFT JOIN repositories r ON r.project_id = p.id
        LEFT JOIN code_chunks cc ON cc.repository_id = r.id
        GROUP BY p.id, p.name
        ORDER BY chunk_count DESC
    """))
    
    for row in result:
        proj_id, proj_name, chunks = row
        status = "✓ HAS DATA" if chunks > 0 else "✗ NO DATA"
        print(f"{proj_id}")
        print(f"  Name: {proj_name}")
        print(f"  Chunks: {chunks} {status}")
        print()
