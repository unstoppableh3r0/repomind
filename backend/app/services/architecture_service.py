"""
RepoMind Architecture Diagram Generator
Generates architecture diagrams from repository code analysis
Uses code pattern analysis WITHOUT LLM dependency (local analysis only)
"""

import json
import logging
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import Repository, CodeChunk

logger = logging.getLogger(__name__)


# ─── Component Type Mapping ────────────────────────────────────────────────────────

TECH_INDICATORS = {
    "fastapi": "FastAPI",
    "flask": "Flask",
    "django": "Django",
    "react": "React",
    "next": "Next.js",
    "vue": "Vue.js",
    "angular": "Angular",
    "svelte": "Svelte",
    "postgres": "PostgreSQL",
    "mysql": "MySQL",
    "sqlite": "SQLite",
    "sqlalchemy": "SQLAlchemy ORM",
    "pydantic": "Pydantic",
    "graphql": "GraphQL",
    "prisma": "Prisma",
    "redis": "Redis",
    "celery": "Celery",
    "rabbitmq": "RabbitMQ",
    "kafka": "Kafka",
}


# ─── Main Architecture Generation ────────────────────────────────────────────────

async def generate_architecture(
    repo_id: str,
    session: AsyncSession,
) -> Dict:
    """
    Generate architecture diagram using LOCAL code analysis (NO LLM).

    Args:
        repo_id: Repository ID (UUID)
        session: Async database session

    Returns:
        Dictionary with keys:
            - architecture: JSON object with components, connections, style
            - diagram: Mermaid diagram string
            - summary: Text summary of architecture
    """
    try:
        # Fetch repository and code chunks
        repository = await session.execute(
            select(Repository).where(Repository.id == repo_id)
        )
        repo = repository.scalar_one_or_none()

        if not repo:
            raise ValueError(f"Repository not found: {repo_id}")

        # Fetch code chunks (symbols and files)
        chunks_result = await session.execute(
            select(CodeChunk).where(CodeChunk.repository_id == repo_id).limit(500)
        )
        chunks = chunks_result.scalars().all()

        if not chunks:
            logger.warning(f"No code chunks found for repo {repo_id}")
            return _create_default_response()

        # Local analysis - extract architecture from code patterns
        architecture_json = _analyze_architecture_locally(chunks, repo)

        # Generate Mermaid diagram
        diagram = _generate_mermaid(architecture_json)

        # Extract summary
        summary = architecture_json.get("summary", "")

        return {
            "architecture": architecture_json,
            "diagram": diagram,
            "summary": summary,
        }

    except Exception as e:
        logger.error(f"Error generating architecture for repo {repo_id}: {e}")
        return _create_default_response()


# ─── Local Architecture Analysis (NO LLM) ────────────────────────────────────────

def _analyze_architecture_locally(chunks: List[CodeChunk], repo) -> Dict:
    """
    Analyze code structure and infer detailed architecture patterns WITHOUT LLM.
    
    Examines code chunks to detect:
    - API endpoints and routes
    - Data models and database layer
    - Business logic services
    - Authentication flows
    - File upload/processing pipelines
    - External integrations
    - Job queues and async processing
    """
    
    # Group chunks by type
    by_type = defaultdict(list)
    by_file = defaultdict(list)
    file_contents = {}
    
    for chunk in chunks:
        by_type[chunk.chunk_type or "unknown"].append(chunk)
        by_file[chunk.file_path].append(chunk)
        file_contents[chunk.file_path] = chunk.content or ""
    
    # Detect components based on code patterns
    components = []
    connections = []
    tech_stack = set()
    
    # ─── Analyze API Layer ────────────────────────────────────────────
    has_routes = len(by_type.get("route", [])) > 0
    has_services = len(by_type.get("service", [])) > 0
    backend_tech = _detect_backend_tech(file_contents)
    
    if has_routes or has_services or backend_tech:
        components.append({
            "name": "API Server",
            "tech": backend_tech or "FastAPI/Flask",
            "description": f"REST API with {len(by_type.get('route', []))} routes"
        })
        tech_stack.add(backend_tech or "Backend")
    
    # ─── Analyze Business Logic Layer ────────────────────────────────────────────
    if has_services or len(by_type.get("service", [])) > 0:
        components.append({
            "name": "Business Logic",
            "tech": "Service Layer",
            "description": f"{len(by_type.get('service', []))} complex business services"
        })
        tech_stack.add("Services")
        
        # Connect API to services
        if "API Server" in [c["name"] for c in components]:
            connections.append({
                "from": "API Server",
                "to": "Business Logic",
                "type": "Calls"
            })
    
    # ─── Analyze Data Layer ────────────────────────────────────────────
    has_models = len(by_type.get("model", [])) > 0
    db_tech = _detect_database_tech(file_contents)
    
    if has_models or db_tech:
        components.append({
            "name": "Database",
            "tech": db_tech or "SQLAlchemy ORM",
            "description": f"Data persistence with {len(by_type.get('model', []))} models"
        })
        tech_stack.add(db_tech or "Database")
        
        # Connect to database
        if "API Server" in [c["name"] for c in components]:
            connections.append({
                "from": "API Server",
                "to": "Database",
                "type": "SQL Queries"
            })
        if "Business Logic" in [c["name"] for c in components]:
            connections.append({
                "from": "Business Logic",
                "to": "Database",
                "type": "ORM Queries"
            })
    
    # ─── Analyze Frontend ────────────────────────────────────────────
    frontend_tech = _detect_frontend_tech(file_contents)
    if frontend_tech:
        components.append({
            "name": "Web Frontend",
            "tech": frontend_tech,
            "description": "SPA user interface and client app"
        })
        tech_stack.add(frontend_tech)
        
        if "API Server" in [c["name"] for c in components]:
            connections.append({
                "from": "Web Frontend",
                "to": "API Server",
                "type": "HTTP/REST"
            })
    
    # ─── Analyze Authentication ────────────────────────────────
    all_content = " ".join(file_contents.values()).lower()
    has_auth = "auth" in all_content or "jwt" in all_content or "oauth" in all_content or "password" in all_content
    
    if has_auth:
        auth_tech = "JWT" if "jwt" in all_content else "OAuth" if "oauth" in all_content else "Session Auth"
        components.append({
            "name": "Auth Layer",
            "tech": auth_tech,
            "description": "User authentication & authorization"
        })
        
        if "API Server" in [c["name"] for c in components]:
            connections.append({
                "from": "API Server",
                "to": "Auth Layer",
                "type": "Validates"
            })
    
    # ─── Analyze File Upload / Media Processing ────────────────────────────────
    has_uploads = "upload" in all_content or "file" in all_content or "multipart" in all_content or "aiofiles" in all_content
    has_image_proc = "pillow" in all_content or "opencv" in all_content or "imagemagick" in all_content
    
    if has_uploads or has_image_proc:
        media_tech = "Pillow" if "pillow" in all_content else "OpenCV" if "opencv" in all_content else "Image Processing"
        components.append({
            "name": "File Upload Handler",
            "tech": media_tech,
            "description": "Handle uploads, validation & processing"
        })
        
        if "API Server" in [c["name"] for c in components]:
            connections.append({
                "from": "API Server",
                "to": "File Upload Handler",
                "type": "Processes uploads"
            })
    
    # ─── Analyze External Services & Integrations ────────────────────────────────
    external_services = _detect_external_services(file_contents)
    
    # Group by category for better organization
    social_services = [s for s in external_services if any(x in s["name"].lower() for x in ["instagram", "facebook", "twitter", "tiktok", "linkedin", "youtube"])]
    job_services = [s for s in external_services if any(x in s["name"].lower() for x in ["queue", "celery", "kafka", "rabbitmq", "job"])]
    storage_services = [s for s in external_services if any(x in s["name"].lower() for x in ["s3", "storage", "cloud"])]
    ai_services = [s for s in external_services if any(x in s["name"].lower() for x in ["ai", "openai", "claude", "ml"])]
    other_services = [s for s in external_services if s not in social_services + job_services + storage_services + ai_services]
    
    # Add Social Media Integration Layer if exists
    if social_services:
        components.append({
            "name": "Social Media Layer",
            "tech": " + ".join([s["tech"] for s in social_services[:3]]) + ("..." if len(social_services) > 3 else ""),
            "description": f"Post to {len(social_services)} social platforms"
        })
        
        if "File Upload Handler" in [c["name"] for c in components]:
            connections.append({
                "from": "File Upload Handler",
                "to": "Social Media Layer",
                "type": "Post content"
            })
        elif "Business Logic" in [c["name"] for c in components]:
            connections.append({
                "from": "Business Logic",
                "to": "Social Media Layer",
                "type": "Post content"
            })
    
    # Add Job Queue if exists
    if job_services:
        components.append({
            "name": "Background Jobs",
            "tech": job_services[0]["tech"] if job_services else "Job Queue",
            "description": f"Async processing: {job_services[0]['description'] if job_services else 'background tasks'}"
        })
        
        if "Social Media Layer" in [c["name"] for c in components]:
            connections.append({
                "from": "Social Media Layer",
                "to": "Background Jobs",
                "type": "Enqueue"
            })
        elif "File Upload Handler" in [c["name"] for c in components]:
            connections.append({
                "from": "File Upload Handler",
                "to": "Background Jobs",
                "type": "Queue tasks"
            })
        elif "Business Logic" in [c["name"] for c in components]:
            connections.append({
                "from": "Business Logic",
                "to": "Background Jobs",
                "type": "Offload work"
            })
    
    # Add Storage if exists
    if storage_services:
        components.append({
            "name": "Cloud Storage",
            "tech": storage_services[0]["tech"],
            "description": storage_services[0]["description"]
        })
        
        if "File Upload Handler" in [c["name"] for c in components]:
            connections.append({
                "from": "File Upload Handler",
                "to": "Cloud Storage",
                "type": "Upload to"
            })
    
    # Add AI/ML if exists
    if ai_services:
        components.append({
            "name": "AI Services",
            "tech": ai_services[0]["tech"],
            "description": ai_services[0]["description"]
        })
    
    # Add other important services
    for service in other_services[:5]:  # Limit to prevent clutter
        components.append({
            "name": service["name"],
            "tech": service["tech"],
            "description": service["description"]
        })
        
        # Connect to appropriate component
        if "cach" in service["name"].lower() or "redis" in service["tech"].lower():
            if "API Server" in [c["name"] for c in components]:
                connections.append({
                    "from": "API Server",
                    "to": service["name"],
                    "type": "Cache"
                })
        elif "monitor" in service["name"].lower() or "log" in service["name"].lower() or "error" in service["name"].lower():
            if "API Server" in [c["name"] for c in components]:
                connections.append({
                    "from": "API Server",
                    "to": service["name"],
                    "type": "Reports to"
                })
        elif "mail" in service["name"].lower() or "email" in service["name"].lower() or "sms" in service["name"].lower():
            if "Business Logic" in [c["name"] for c in components]:
                connections.append({
                    "from": "Business Logic",
                    "to": service["name"],
                    "type": "Sends"
                })
    
    # Determine architecture style
    architecture_style = _determine_architecture_style(components, by_type)
    
    # Build comprehensive summary
    route_count = len(by_type.get("route", []))
    model_count = len(by_type.get("model", []))
    service_count = len(by_type.get("service", []))
    ext_service_count = len(external_services)
    
    summary = f"Architecture: {len(components)} layers | {route_count} API routes | {model_count} data models | {service_count} services | {ext_service_count} external integrations"
    
    return {
        "components": components,
        "connections": connections,
        "architecture_style": architecture_style,
        "summary": summary,
    }


def _detect_backend_tech(file_contents: Dict[str, str]) -> str:
    """Detect backend framework from code patterns."""
    all_content = " ".join(file_contents.values()).lower()
    
    if "fastapi" in all_content or "from fastapi" in all_content:
        return "FastAPI"
    if "flask" in all_content or "from flask" in all_content:
        return "Flask"
    if "django" in all_content:
        return "Django"
    if "express" in all_content:
        return "Express.js"
    if "spring" in all_content:
        return "Spring Boot"
    
    return None


def _detect_database_tech(file_contents: Dict[str, str]) -> str:
    """Detect database technology from code patterns."""
    all_content = " ".join(file_contents.values()).lower()
    
    if "sqlalchemy" in all_content:
        return "SQLAlchemy ORM"
    if "postgresql" in all_content or "psycopg" in all_content:
        return "PostgreSQL"
    if "mysql" in all_content:
        return "MySQL"
    if "sqlite" in all_content:
        return "SQLite"
    if "mongodb" in all_content or "pymongo" in all_content:
        return "MongoDB"
    if "prisma" in all_content:
        return "Prisma"
    
    return "SQL Database"


def _detect_frontend_tech(file_contents: Dict[str, str]) -> Optional[str]:
    """Detect frontend framework from code patterns."""
    all_content = " ".join(file_contents.values()).lower()
    
    if "react" in all_content or "from react" in all_content or "import react" in all_content:
        return "React"
    if "next" in all_content or "next.js" in all_content:
        return "Next.js"
    if "vue" in all_content or "vuejs" in all_content:
        return "Vue.js"
    if "angular" in all_content:
        return "Angular"
    if "svelte" in all_content:
        return "Svelte"
    
    return None


def _detect_external_services(file_contents: Dict[str, str]) -> List[Dict]:
    """Detect external services, APIs, and tech stack from code patterns."""
    services = []
    all_content = " ".join(file_contents.values()).lower()
    all_content_raw = " ".join(file_contents.values())  # Keep original case for imports
    
    # ─── Caching & Session Management ────────────────────────────────
    if "redis" in all_content:
        services.append({
            "name": "Redis Cache",
            "tech": "Redis",
            "description": "In-memory caching & session storage"
        })
    
    if "memcached" in all_content:
        services.append({
            "name": "Memcached",
            "tech": "Memcached",
            "description": "Distributed memory caching"
        })
    
    # ─── Job Queue & Async Processing ────────────────────────────────
    if "celery" in all_content:
        services.append({
            "name": "Task Queue",
            "tech": "Celery + RabbitMQ/Redis",
            "description": "Asynchronous background job processing"
        })
    
    if "rq" in all_content or "redis_queue" in all_content:
        services.append({
            "name": "Job Queue",
            "tech": "RQ (Redis Queue)",
            "description": "Lightweight async task queue"
        })
    
    if "kafka" in all_content or "confluent" in all_content:
        services.append({
            "name": "Message Broker",
            "tech": "Apache Kafka",
            "description": "Event streaming and message queue"
        })
    
    if "rabbitmq" in all_content or "kombu" in all_content:
        services.append({
            "name": "Message Queue",
            "tech": "RabbitMQ",
            "description": "Message broker for async processing"
        })
    
    # ─── File Upload & Image Processing ────────────────────────────────
    if "pillow" in all_content or "pil" in all_content or "from pil" in all_content_raw or "import pil" in all_content_raw:
        services.append({
            "name": "Image Processing",
            "tech": "Pillow (PIL)",
            "description": "Image manipulation & thumbnail generation"
        })
    
    if "opencv" in all_content or "cv2" in all_content:
        services.append({
            "name": "Computer Vision",
            "tech": "OpenCV",
            "description": "Advanced image/video processing"
        })
    
    if "imagemagick" in all_content or "magick" in all_content:
        services.append({
            "name": "Image Transformation",
            "tech": "ImageMagick",
            "description": "Image format conversion & optimization"
        })
    
    if "ffmpeg" in all_content or "moviepy" in all_content:
        services.append({
            "name": "Media Processing",
            "tech": "FFmpeg/MoviePy",
            "description": "Video encoding & media conversion"
        })
    
    if "aiofiles" in all_content or "upload" in all_content or "multipart" in all_content:
        services.append({
            "name": "File Upload Handler",
            "tech": "Async File I/O",
            "description": "Handle file uploads and storage"
        })
    
    if "boto3" in all_content or "s3" in all_content:
        services.append({
            "name": "Cloud Storage",
            "tech": "AWS S3",
            "description": "Cloud-based file storage & CDN"
        })
    
    # ─── Social Media & Social Integrations ────────────────────────────────
    if "instagram" in all_content or "instagram_graph" in all_content:
        services.append({
            "name": "Instagram API",
            "tech": "Instagram Graph API",
            "description": "Post & manage Instagram content"
        })
    
    if "facebook" in all_content or "fbsdk" in all_content:
        services.append({
            "name": "Facebook API",
            "tech": "Facebook SDK",
            "description": "Post to Facebook & manage pages"
        })
    
    if "tweepy" in all_content or "twitter" in all_content or "x_api" in all_content:
        services.append({
            "name": "Twitter/X API",
            "tech": "Tweepy/Twitter API v2",
            "description": "Post tweets and manage Twitter account"
        })
    
    if "tiktok" in all_content or "tiktok_sdk" in all_content:
        services.append({
            "name": "TikTok API",
            "tech": "TikTok SDK",
            "description": "Upload & schedule TikTok videos"
        })
    
    if "linkedin" in all_content or "linkedin_api" in all_content:
        services.append({
            "name": "LinkedIn API",
            "tech": "LinkedIn SDK",
            "description": "Post to LinkedIn & manage content"
        })
    
    if "youtube" in all_content or "google.play" in all_content or "google_auth" in all_content:
        services.append({
            "name": "YouTube API",
            "tech": "YouTube Data API",
            "description": "Upload videos & manage channel"
        })
    
    # ─── Authentication & Authorization ────────────────────────────────
    if "jwt" in all_content or "pyjwt" in all_content:
        services.append({
            "name": "Authentication",
            "tech": "JWT Tokens",
            "description": "Secure token-based authentication"
        })
    
    if "oauth" in all_content or "oauthlib" in all_content:
        services.append({
            "name": "OAuth Provider",
            "tech": "OAuth 2.0",
            "description": "Social login & third-party auth"
        })
    
    if "passlib" in all_content or "bcrypt" in all_content:
        services.append({
            "name": "Password Security",
            "tech": "Passlib + Bcrypt",
            "description": "Secure password hashing & validation"
        })
    
    # ─── Email & Notifications ────────────────────────────────
    if "sendgrid" in all_content or "mailgun" in all_content or "ses" in all_content:
        services.append({
            "name": "Email Service",
            "tech": "SendGrid/Mailgun/SES",
            "description": "Transactional email delivery"
        })
    
    if "twilio" in all_content:
        services.append({
            "name": "SMS/Push Service",
            "tech": "Twilio",
            "description": "SMS & push notifications"
        })
    
    if "firebase" in all_content:
        services.append({
            "name": "Push Notifications",
            "tech": "Firebase Cloud Messaging",
            "description": "Real-time notifications"
        })
    
    # ─── Analytics & Monitoring ────────────────────────────────
    if "sentry" in all_content:
        services.append({
            "name": "Error Monitoring",
            "tech": "Sentry",
            "description": "Real-time error tracking & alerting"
        })
    
    if "prometheus" in all_content or "datadog" in all_content or "newrelic" in all_content:
        services.append({
            "name": "Monitoring",
            "tech": "Prometheus/Datadog/NewRelic",
            "description": "Performance monitoring & metrics"
        })
    
    if "elastic" in all_content or "kibana" in all_content or "logstash" in all_content:
        services.append({
            "name": "Log Aggregation",
            "tech": "ELK Stack",
            "description": "Centralized logging & analysis"
        })
    
    # ─── AI & LLM Services ────────────────────────────────
    if "openai" in all_content or "gpt" in all_content or "chatgpt" in all_content:
        services.append({
            "name": "AI Service",
            "tech": "OpenAI API (GPT)",
            "description": "LLM-powered features & AI capabilities"
        })
    
    if "anthropic" in all_content or "claude" in all_content:
        services.append({
            "name": "AI Assistant",
            "tech": "Anthropic Claude API",
            "description": "Claude LLM integration"
        })
    
    if "huggingface" in all_content or "transformers" in all_content:
        services.append({
            "name": "ML Framework",
            "tech": "Hugging Face Transformers",
            "description": "Pre-trained ML models & NLP"
        })
    
    # ─── Payment Processing ────────────────────────────────
    if "stripe" in all_content:
        services.append({
            "name": "Payment Gateway",
            "tech": "Stripe",
            "description": "Payment processing & billing"
        })
    
    if "paypal" in all_content:
        services.append({
            "name": "Payment Gateway",
            "tech": "PayPal SDK",
            "description": "PayPal payment integration"
        })
    
    if "razorpay" in all_content:
        services.append({
            "name": "Payment Gateway",
            "tech": "Razorpay",
            "description": "Indian payment processing"
        })
    
    # ─── Database/ORM Specifics ────────────────────────────────
    if "alembic" in all_content:
        services.append({
            "name": "Database Migrations",
            "tech": "Alembic",
            "description": "Version control for database schema"
        })
    
    if "sqlalchemy" in all_content or "asyncpg" in all_content:
        services.append({
            "name": "Async Database",
            "tech": "SQLAlchemy Async",
            "description": "Async ORM for non-blocking queries"
        })
    
    # ─── Webhooks & Real-time ────────────────────────────────
    if "webhook" in all_content or "ngrok" in all_content:
        services.append({
            "name": "Webhook Handler",
            "tech": "Custom Webhooks",
            "description": "Real-time event handling from external systems"
        })
    
    if "socketio" in all_content or "websocket" in all_content:
        services.append({
            "name": "Real-time Communication",
            "tech": "WebSocket/Socket.IO",
            "description": "Real-time bidirectional communication"
        })
    
    # ─── Scheduling & Cron ────────────────────────────────
    if "schedule" in all_content or "apscheduler" in all_content or "croniter" in all_content:
        services.append({
            "name": "Task Scheduler",
            "tech": "APScheduler/Schedule",
            "description": "Scheduled background tasks & cron jobs"
        })
    
    # ─── Version Control & Deployment ────────────────────────────────
    if "gitpython" in all_content or "pygit2" in all_content:
        services.append({
            "name": "Git Integration",
            "tech": "GitPython",
            "description": "Programmatic Git operations & repo cloning"
        })
    
    if "docker" in all_content or "podman" in all_content:
        services.append({
            "name": "Containerization",
            "tech": "Docker",
            "description": "Container orchestration & deployment"
        })
    
    # ─── Generic External Integrations ────────────────────────────────
    if "github" in all_content and "git" not in services:
        services.append({
            "name": "GitHub Integration",
            "tech": "GitHub API",
            "description": "Repository & workflow automation"
        })
    
    if "aws" in all_content or "azure" in all_content or "gcp" in all_content:
        services.append({
            "name": "Cloud Platform",
            "tech": "AWS/Azure/GCP",
            "description": "Cloud infrastructure & services"
        })
    
    return services


def _determine_architecture_style(components: List[Dict], by_type: Dict) -> str:
    """Infer architecture pattern from components."""
    comp_names = [c["name"] for c in components]
    
    if len(components) <= 2:
        return "Monolith"
    elif len(components) >= 4:
        return "Microservices"
    else:
        return "Layered Architecture" if "Database" in comp_names else "Client-Server"


# ─── Mermaid Diagram Generation ────────────────────────────────────────────────

def _generate_mermaid(architecture: Dict) -> str:
    """
    Convert architecture JSON to Mermaid diagram format.

    Returns a Mermaid flowchart showing components and their connections.
    """
    try:
        components = architecture.get("components", [])
        connections = architecture.get("connections", [])

        if not components:
            return "graph TD\n    A[\"System\"]"

        # Start mermaid graph
        lines = ["graph TD"]

        # Add component nodes
        component_map = {}
        for i, comp in enumerate(components):
            node_id = f"C{i}"
            component_map[comp.get("name", f"Component{i}")] = node_id

            name = comp.get("name", "Unknown")
            tech = comp.get("tech", "")
            label = f"{name}" + (f"<br/>({tech})" if tech and tech != "Unknown" else "")

            # Escape special characters for Mermaid
            label = label.replace('"', '\\"')
            lines.append(f'    {node_id}["{label}"]')

        # Add connections (edges)
        if connections:
            for conn in connections:
                from_name = conn.get("from", "")
                to_name = conn.get("to", "")
                conn_type = conn.get("type", "")

                from_id = component_map.get(from_name)
                to_id = component_map.get(to_name)

                if from_id and to_id:
                    label = conn_type if conn_type and conn_type != "Unknown" else ""
                    if label:
                        label = label.replace('"', '\\"')
                        lines.append(f'    {from_id} -->|"{label}"| {to_id}')
                    else:
                        lines.append(f'    {from_id} --> {to_id}')

        return "\n".join(lines)

    except Exception as e:
        logger.error(f"Error generating Mermaid diagram: {e}")
        return "graph TD\n    A[\"System\"]"


# ─── Default Response ────────────────────────────────────────────────────────────

def _create_default_response() -> Dict:
    """Create a default response when architecture analysis has limited data."""
    default_architecture = {
        "components": [
            {"name": "Application", "tech": "Unknown", "description": "Main application"},
        ],
        "connections": [],
        "architecture_style": "Unknown",
        "summary": "Limited code structure detected. Analysis with more code symbols will provide better architecture visibility.",
    }
    
    mermaid = "graph TD\n    A[\"Application\"]"
    
    return {
        "architecture": default_architecture,
        "diagram": mermaid,
        "summary": default_architecture["summary"],
    }


# ─── Utility: Get Architecture Summary ────────────────────────────────────────────

async def get_architecture_summary(
    repo_id: str,
    session: AsyncSession,
) -> Optional[Dict]:
    """
    Get just the architecture summary for a repository.

    Args:
        repo_id: Repository ID (UUID)
        session: Async database session

    Returns:
        Dictionary with architecture info or None if repo not found
    """
    try:
        result = await generate_architecture(repo_id, session)
        return result.get("architecture")
    except Exception as e:
        logger.error(f"Error fetching architecture summary: {e}")
        return None
