from fastapi import APIRouter

from app.api.routes import (
    auth,
    dishes,
    exercises,
    health,
    health_goals,
    insights,
    meals,
    notes,
    push,
    reminders,
    ws,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(notes.router)
api_router.include_router(reminders.router)
api_router.include_router(push.router)
api_router.include_router(dishes.router)
api_router.include_router(meals.router)
api_router.include_router(exercises.router)
api_router.include_router(health_goals.router)
api_router.include_router(insights.router)
api_router.include_router(ws.router)
