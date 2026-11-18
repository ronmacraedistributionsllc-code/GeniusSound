from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import os

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    created_at: str


# In-memory storage (will be replaced with database)
projects_db = {}


@router.get("", response_model=List[ProjectResponse])
async def list_projects():
    """List all projects"""
    return []


@router.post("", response_model=ProjectResponse)
async def create_project(project: ProjectCreate):
    """Create a new project"""
    import uuid
    from datetime import datetime
    
    project_id = f"proj_{uuid.uuid4().hex[:8]}"
    
    projects_db[project_id] = {
        "id": project_id,
        "title": project.title,
        "description": project.description,
        "status": "DRAFT",
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    
    return projects_db[project_id]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """Get project details"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return projects_db[project_id]


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project: ProjectUpdate):
    """Update a project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project.dict(exclude_unset=True)
    projects_db[project_id].update(update_data)
    
    return projects_db[project_id]


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    del projects_db[project_id]
    
    return {"message": "Project deleted successfully"}


@router.post("/{project_id}/upload")
async def upload_audio(project_id: str, file: UploadFile = File(...)):
    """Upload audio file to a project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Validate file type
    if not file.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="File must be an audio file")
    
    # Validate file size
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 50MB")
    
    return {
        "id": f"audio_{project_id}",
        "filename": file.filename,
        "size_bytes": len(content),
        "duration_sec": 225.0
    }


@router.post("/{project_id}/analyze")
async def analyze_audio(project_id: str):
    """Analyze audio file for a project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {
        "message": "Analysis started",
        "project_id": project_id,
        "status": "ANALYZING"
    }


@router.get("/{project_id}/scenes")
async def list_scenes(project_id: str):
    """List scenes for a project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return []


@router.post("/{project_id}/generate")
async def generate_video(project_id: str):
    """Start video generation for a project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {
        "message": "Generation started",
        "project_id": project_id,
        "status": "QUEUED"
    }
