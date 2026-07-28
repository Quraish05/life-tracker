# Import models here so they are registered on Base.metadata.
from app.models.daily_summary import DailySummaryRecord
from app.models.dish import Dish
from app.models.exercise_log import ExerciseLog
from app.models.health_goal import HealthGoal
from app.models.meal_log import MealLog
from app.models.note import Note
from app.models.push_subscription import PushSubscription
from app.models.reminder import Reminder
from app.models.user import User

__all__ = [
    "DailySummaryRecord",
    "Dish",
    "ExerciseLog",
    "HealthGoal",
    "MealLog",
    "Note",
    "PushSubscription",
    "Reminder",
    "User",
]
