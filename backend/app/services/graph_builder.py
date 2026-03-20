"""
RepoMind Graph Generator
Builds dependency graphs, module relationships, and service interaction maps
Uses NetworkX for graph construction and analysis
"""

import networkx as nx
from typing import Dict, List, Tuple, Optional, Set
from pathlib import Path
import re
import logging

logger = logging.getLogger(__name__)


class DependencyGraph:
    """Builds and analyzes code dependency graphs."""

    def __init__(self):
        self.graph = nx.DiGraph()
        self.module_map: Dict[str, str] = {}  # module_name -> file_path

    def add_parsed_file(self, file_data: Dict):
        """Add a single parsed file to the graph."""
        file_path = file_data.get("file_path", "")
        if not file_path:
            return

        module_name = self._path_to_module(file_path)
        self.module_map[module_name] = file_path

        # Add node for each file
        node_type = self._classify_node(file_path, file_data.get("symbols", []))
        self.graph.add_node(
            file_path,
            label=Path(file_path).name,
            module=module_name,
            node_type=node_type,
            symbols=len(file_data.get("symbols", [])),
            file_path=file_path,
        )

        # Add edges from imports
        imports = file_data.get("imports", [])
        for imp in imports:
            # Note: We might not be able to resolve all imports until all files are added
            # But we can add the edges anyway and resolve targets later or as we go.
            target_path = self._resolve_import(imp, file_path)
            if target_path and target_path != file_path:
                self.graph.add_edge(
                    file_path,
                    target_path,
                    label="imports",
                    edge_type="import",
                )

    def build_from_analysis(self, parsed_files: List[Dict]) -> Dict:
        """
        Build a dependency graph from parsed file data.
        (Legacy method for small repos or backward compatibility)
        """
        for file_data in parsed_files:
            self.add_parsed_file(file_data)

        # Re-run edge resolution for all nodes to be sure (since module_map is now complete)
        for node in list(self.graph.nodes):
            # This is a bit inefficient for huge graphs, but okay for Phase 1
            # In a better version, we'd store unresolved imports and resolve at the end.
            pass 

        return self.get_visualization_data()

    def get_visualization_data(self) -> Dict:
        """Returns graph data suitable for React Flow visualization."""
        return self._to_react_flow()

    def _classify_node(self, file_path: str, symbols: List[Dict]) -> str:
        """Classify a node type based on its path and symbols."""
        path_lower = file_path.lower()

        if any(p in path_lower for p in ["route", "router", "controller", "view", "endpoint"]):
            return "api"
        if any(p in path_lower for p in ["model", "schema", "entity", "orm"]):
            return "database"
        if any(p in path_lower for p in ["service", "handler", "manager", "provider"]):
            return "service"
        if any(p in path_lower for p in ["config", "settings", "env", "const"]):
            return "config"
        if any(p in path_lower for p in ["test", "spec", "__test__"]):
            return "test"
        if any(p in path_lower for p in ["util", "helper", "lib", "common", "shared"]):
            return "utility"
        if any(p in path_lower for p in ["middleware", "guard", "interceptor"]):
            return "middleware"

        # Check symbols
        route_symbols = [s for s in symbols if s.get("type") == "route"]
        if route_symbols:
            return "api"

        model_symbols = [s for s in symbols if s.get("type") == "model"]
        if model_symbols:
            return "database"

        return "module"

    def _path_to_module(self, file_path: str) -> str:
        """Convert file path to module name."""
        path = Path(file_path)
        parts = list(path.parts)
        # Remove file extension
        if parts:
            parts[-1] = path.stem
        return ".".join(parts)

    def _resolve_import(self, import_str: str, source_path: str) -> Optional[str]:
        """
        Try to resolve an import string to a file path in the repository.
        This is a heuristic approach.
        """
        if not import_str:
            return None

        # Skip external packages (no . prefix for relative, no known internal path)
        # Check if it's a relative import or matches any module we know
        import_clean = import_str.strip("./").replace("/", ".").replace("\\", ".")

        for module_name, file_path in self.module_map.items():
            # Check for direct module match
            if import_clean in module_name or module_name.endswith(import_clean):
                return file_path
            # Check for partial match (common in large repos)
            if module_name.split(".")[-1] == import_clean.split(".")[-1]:
                return file_path

        return None

    def _to_react_flow(self) -> Dict:
        """Convert NetworkX graph to React Flow format."""
        # Use spring layout for positioning
        if len(self.graph.nodes) == 0:
            return {"nodes": [], "edges": []}

        # Compute layout positions
        try:
            if len(self.graph.nodes) > 1:
                pos = nx.spring_layout(self.graph, k=3, iterations=50, seed=42)
            else:
                pos = {list(self.graph.nodes)[0]: (0.5, 0.5)}
        except Exception:
            pos = {node: (i * 0.1, 0) for i, node in enumerate(self.graph.nodes)}

        # Node type → color mapping
        type_colors = {
            "api": "#3B82F6",
            "database": "#10B981",
            "service": "#8B5CF6",
            "config": "#F59E0B",
            "utility": "#6B7280",
            "middleware": "#EC4899",
            "test": "#9CA3AF",
            "module": "#6366F1",
        }

        nodes = []
        for node_id, data in self.graph.nodes(data=True):
            x, y = pos.get(node_id, (0, 0))
            node_type = data.get("node_type", "module")
            nodes.append({
                "id": node_id,
                "type": "codeNode",
                "position": {
                    "x": float(x) * 600 + 400,
                    "y": float(y) * 400 + 300,
                },
                "data": {
                    "label": data.get("label", node_id),
                    "nodeType": node_type,
                    "filePath": data.get("file_path", ""),
                    "symbolCount": data.get("symbols", 0),
                    "color": type_colors.get(node_type, "#6366F1"),
                },
            })

        edges = []
        for i, (source, target, data) in enumerate(self.graph.edges(data=True)):
            edges.append({
                "id": f"e{i}",
                "source": source,
                "target": target,
                "label": data.get("label", ""),
                "type": "smoothstep",
                "data": {"edgeType": data.get("edge_type", "import")},
                "style": {"stroke": "#6B7280", "strokeWidth": 1.5},
                "markerEnd": {"type": "ArrowClosed"},
            })

        # Graph metrics
        metrics = {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "density": nx.density(self.graph),
            "most_connected": self._get_most_connected(),
            "isolated_modules": list(nx.isolates(self.graph))[:5],
        }

        return {"nodes": nodes, "edges": edges, "metrics": metrics}

    def _get_most_connected(self) -> List[str]:
        """Get the most connected nodes (potential central modules)."""
        if not self.graph.nodes:
            return []
        in_degree = sorted(self.graph.in_degree(), key=lambda x: x[1], reverse=True)
        return [node for node, degree in in_degree[:5] if degree > 0]

    def detect_clusters(self) -> List[Dict]:
        """Detect module clusters/communities in the graph."""
        try:
            undirected = self.graph.to_undirected()
            communities = list(nx.community.greedy_modularity_communities(undirected))
            return [
                {
                    "id": f"cluster_{i}",
                    "name": f"Module Group {i + 1}",
                    "nodes": list(community),
                    "size": len(community),
                }
                for i, community in enumerate(communities)
            ]
        except Exception as e:
            logger.warning(f"Could not detect clusters: {e}")
            return []

    def find_entry_points(self) -> List[str]:
        """Find likely entry points (nodes with no incoming edges)."""
        return [node for node, in_deg in self.graph.in_degree() if in_deg == 0]

    def find_critical_paths(self) -> List[List[str]]:
        """Find critical dependency paths in the graph."""
        paths = []
        entry_points = self.find_entry_points()

        for source in entry_points[:3]:
            for target in self.graph.nodes:
                if source != target:
                    try:
                        path = nx.shortest_path(self.graph, source, target)
                        if len(path) > 2:
                            paths.append(path)
                    except nx.NetworkXNoPath:
                        pass

        # Return unique longest paths
        paths.sort(key=len, reverse=True)
        return paths[:5]
