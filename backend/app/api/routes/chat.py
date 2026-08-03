from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.api.ai_quota import QUOTA_EXCEEDED_RESPONSE, enforce_ai_quota, record_ai_usage
from app.api.deps import UNAUTHORIZED_RESPONSE, CurrentUser, DbSession
from app.schemas.chat import ChatRequest
from app.services.chat import chat_configured, stream_chat

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post(
    "",
    summary="Chat with the assistant (streaming, tool-using)",
    responses={**UNAUTHORIZED_RESPONSE, **QUOTA_EXCEEDED_RESPONSE},
)
async def chat(
    payload: ChatRequest, current_user: CurrentUser, db: DbSession
) -> StreamingResponse:
    """Stream a chat turn as Server-Sent Events.

    The assistant can call tools that read and write the user's own data (log a
    meal/exercise, set a reminder, read back a day). Quota is enforced up front and
    exactly one credit is charged per turn — on the success path only, so a failed
    turn never burns a credit (matching the other AI features).
    """
    if not chat_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat requires an Anthropic API key. Set ANTHROPIC_API_KEY in the backend .env.",
        )
    if payload.messages[-1].role != "user":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The last message must be from the user.",
        )
    enforce_ai_quota(current_user)

    async def charge() -> None:
        # One credit per turn — invoked by stream_chat only when the turn succeeds.
        await record_ai_usage(current_user, db)

    async def event_stream():
        async for frame in stream_chat(
            payload.messages,
            user=current_user,
            db=db,
            timezone=payload.timezone,
            on_complete=charge,
        ):
            yield frame

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
