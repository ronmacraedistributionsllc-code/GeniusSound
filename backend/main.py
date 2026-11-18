from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import Optional, List

app = FastAPI(
    title="Genius Sound API",
    description="AI Music Video Studio Backend API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://geniussound.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    created_at: str

class AudioUploadResponse(BaseModel):
    id: str
    filename: str
    size_bytes: int
    duration_sec: Optional[float] = None

class SceneCreate(BaseModel):
    title: str
    description: str
    section_label: Optional[str] = None
    start_sec: float
    duration_sec: float

class SceneResponse(BaseModel):
    id: str
    title: str
    description: str
    status: str
    progress: int


@app.get("/")
async def root():
    return {
        "message": "Genius Sound API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# API Routes
@app.get("/api/projects", response_model=List[ProjectResponse])
async def list_projects():
    """List all projects for the current user"""
    return []


@app.post("/api/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate):
    """Create a new project"""
    return {
        "id": "proj_123",
        "title": project.title,
        "description": project.description,
        "status": "DRAFT",
        "created_at": "2024-01-01T00:00:00Z"
    }


@app.get("/api/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """Get project details"""
    return {
        "id": project_id,
        "title": "Summer Vibes",
        "description": "A feel-good summer anthem with upbeat electronic production.",
        "status": "GENERATING",
        "created_at": "2024-01-15T00:00:00Z"
    }


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    return {"message": "Project deleted successfully"}


@app.post("/api/projects/{project_id}/upload", response_model=AudioUploadResponse)
async def upload_audio(
    project_id: str,
    file: UploadFile = File(...)
):
    """Upload audio file to a project"""
    # Validate file type
    if not file.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="File must be an audio file")
    
    # Validate file size (50MB limit)
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 50MB")
    
    return {
        "id": f"audio_{project_id}",
        "filename": file.filename,
        "size_bytes": len(content),
        "duration_sec": 225.0  # Simulated duration
    }


@app.get("/api/projects/{project_id}/scenes", response_model=List[SceneResponse])
async def list_scenes(project_id: str):
    """List scenes for a project"""
    return []


@app.post("/api/projects/{project_id}/scenes", response_model=SceneResponse)
async def create_scene(project_id: str, scene: SceneCreate):
    """Create a new scene"""
    return {
        "id": f"scene_{project_id}_1",
        "title": scene.title,
        "description": scene.description,
        "status": "DRAFT",
        "progress": 0
    }


@app.get("/api/projects/{project_id}/generate")
async def generate_video(project_id: str):
    """Start video generation for a project"""
    return {"message": "Generation started", "project_id": project_id}


@app.get("/api/projects/{project_id}/generate/status")
async def get_generation_status(project_id: str):
    """Get generation status for a project"""
    return {
        "project_id": project_id,
        "status": "QUEUED",
        "progress": 0
    }


@app.get("/api/projects/{project_id}/export")
async def export_video(project_id: str):
    """Export final video"""
    return {
        "status": "ready",
        "video_url": f"/api/projects/{project_id}/download"
    }


@app.get("/api/projects/{project_id}/export/download")
async def download_video(project_id: str):
    """Download generated video"""
    return {"message": "Download ready"}
