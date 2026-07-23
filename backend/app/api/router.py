from fastapi import APIRouter

from app.api.routes import auth, health, notes, reminders

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(notes.router)
api_router.include_router(reminders.router)
