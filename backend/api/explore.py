from uuid import UUID
from fastapi import APIRouter, Depends, Response, HTTPException
from backend.dependencies import get_current_user
from backend.services.explore_service import ExploreService

router = APIRouter(
    prefix="/api/explore",
    tags=["explore"],
)

@router.get("/overview")
async def get_overview(
    response: Response,
    current_user: UUID = Depends(get_current_user)
):
    response.headers["Cache-Control"] = "public, max-age=60"
    service = ExploreService()
    try:
        data = await service.get_overview(current_user)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects")
async def get_projects(
    response: Response,
    current_user: UUID = Depends(get_current_user)
):
    response.headers["Cache-Control"] = "public, max-age=300"
    service = ExploreService()
    try:
        data = await service.get_projects(current_user)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/domains")
async def get_domains(
    response: Response,
    current_user: UUID = Depends(get_current_user)
):
    response.headers["Cache-Control"] = "public, max-age=3600"
    service = ExploreService()
    try:
        data = await service.get_domains(current_user)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/workstreams")
async def get_workstreams(
    response: Response,
    current_user: UUID = Depends(get_current_user)
):
    response.headers["Cache-Control"] = "public, max-age=60"
    service = ExploreService()
    try:
        data = await service.get_workstreams(current_user)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

