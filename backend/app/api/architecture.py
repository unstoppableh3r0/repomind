"""RepoMind - Architecture API"""
import uuid
import logging
import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import AnalysisResult, Repository, Project, CodeChunk
from app.services.architecture_service import generate_architecture

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/architecture/{project_id}")
async def get_architecture(project_id: str, db: AsyncSession = Depends(get_db)):
    try:
        project_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format.")
    
    # Get project and repository
    project_result = await db.execute(
        select(Project).where(Project.id == project_uuid)
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    
    repo_result = await db.execute(
        select(Repository).where(Repository.project_id == project_uuid)
    )
    repo = repo_result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found. Please analyze a repository first.")
    
    # Check if repository has code chunks
    chunks_result = await db.execute(
        select(CodeChunk).where(CodeChunk.repository_id == repo.id).limit(1)
    )
    has_chunks = chunks_result.scalar_one_or_none() is not None
    
    if not has_chunks:
        raise HTTPException(
            status_code=400, 
            detail="Repository has not been analyzed yet. Please run analysis first to generate code chunks."
        )
    
    # Generate architecture from service
    architecture_data = await generate_architecture(repo.id, db)
    
    # Get summary if available
    summary_result = await db.execute(
        select(AnalysisResult).where(
            AnalysisResult.project_id == project_uuid,
            AnalysisResult.result_type == "summary",
        )
    )
    summary_record = summary_result.scalar_one_or_none()
    summary = summary_record.content if summary_record else {}
    
    # Build graph from components and connections for visualization
    graph = _build_graph_from_architecture(architecture_data.get("architecture", {}))
    
    # DEBUG: Log nodes being sent to frontend
    logger.info(f"✓ ARCHITECTURE RESPONSE: {len(graph['nodes'])} nodes, {len(graph['edges'])} edges")
    logger.info(f"  Nodes: {[n['id'] for n in graph['nodes']]}")
    
    return {
        "project_id": project_id,
        "summary": summary,
        "architecture_summary": architecture_data.get("summary", ""),
        "diagram": architecture_data.get("diagram", ""),
        **architecture_data.get("architecture", {}),
        "graph": graph,
    }


def _build_graph_from_architecture(architecture: dict) -> dict:
    """Convert architecture components and connections to graph format for visualization."""
    components = architecture.get("components", [])
    connections = architecture.get("connections", [])
    
    logger.info(f"📊 Building graph from {len(components)} components")
    
    if not components:
        logger.warning("⚠️  No components found - returning empty graph")
        return {"nodes": [], "edges": [], "metrics": {"node_count": 0, "edge_count": 0}}
    
    # Color mapping for component types
    color_map = {
        "frontend": "#60a5fa",
        "backend": "#a78bfa",
        "database": "#34d399",
        "api": "#60a5fa",
        "service": "#a78bfa",
        "external": "#fbbf24",
        "cache": "#ec4899",
        "queue": "#8b5cf6",
    }
    
    # Create nodes with better layout
    nodes = []
    for idx, comp in enumerate(components):
        name = comp.get("name", f"Component{idx}")
        tech = comp.get("tech", "")
        
        # Determine color based on tech or name
        color = color_map.get(name.lower(), "#6b7280")
        for key in color_map:
            if key.lower() in name.lower():
                color = color_map[key]
                break
        
        # Better positioning - spread nodes in a circle
        import math
        angle = (idx / max(len(components), 1)) * 2 * math.pi
        radius = 250
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        
        nodes.append({
            "id": f"node_{idx}",
            "type": "codeNode",
            "position": {"x": x, "y": y},
            "width": 190,
            "height": 60,
            "data": {
                "label": name,
                "nodeType": tech.lower() if tech else "module",
                "filePath": "",
                "symbolCount": 0,
                "color": color,
            },
        })
    
    # Create component ID map
    comp_id_map = {comp.get("name"): f"node_{idx}" for idx, comp in enumerate(components)}
    
    # Create edges
    edges = []
    for conn in connections:
        from_name = conn.get("from")
        to_name = conn.get("to")
        conn_type = conn.get("type", "")
        
        if from_name in comp_id_map and to_name in comp_id_map:
            edges.append({
                "id": f"edge_{from_name}_{to_name}",
                "source": comp_id_map[from_name],
                "target": comp_id_map[to_name],
                "label": conn_type,
                "type": "smoothstep",
            })
    
    logger.info(f"✅ Graph created: {len(nodes)} nodes, {len(edges)} edges")
    for i, node in enumerate(nodes):
        pos = node.get('position', {})
        logger.info(f"   Node {i}: {node['id']} - pos=({pos.get('x', 0):.1f}, {pos.get('y', 0):.1f}) - {node['data']['label']} - type: {node['type']} - size: {node.get('width')}x{node.get('height')}")
    
    return {
        "nodes": nodes,
        "edges": edges,
        "metrics": {
            "node_count": len(nodes),
            "edge_count": len(edges),
        },
    }
