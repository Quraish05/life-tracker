from fastapi import APIRouter

from app.api.routes import (
    auth,
    chat,
    exercises,
    food,
    health,
    health_goals,
    ingredients,
    insights,
    journal,
    meals,
    notes,
    push,
    reminders,
    ws,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(chat.router)
api_router.include_router(notes.router)
api_router.include_router(reminders.router)
api_router.include_router(push.router)
api_router.include_router(food.router)
api_router.include_router(ingredients.router)
api_router.include_router(meals.router)
api_router.include_router(exercises.router)
api_router.include_router(health_goals.router)
api_router.include_router(insights.router)
api_router.include_router(journal.router)
api_router.include_router(ws.router)
