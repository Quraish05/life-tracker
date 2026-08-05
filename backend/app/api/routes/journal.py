from fastapi import APIRouter

from app.api.ai_errors import ai_errors_as_http
from app.api.ai_quota import QUOTA_EXCEEDED_RESPONSE, enforce_ai_quota, record_ai_usage
from app.api.deps import UNAUTHORIZED_RESPONSE, CurrentUser, DbSession
from app.schemas.journal_qa import AskJournalRequest, AskJournalResponse
from app.services.journal_qa import answer_question

router = APIRouter(prefix="/journal", tags=["journal"])


@router.post(
    "/ask",
    response_model=AskJournalResponse,
    summary="Ask a question about your journal (RAG)",
    responses={**UNAUTHORIZED_RESPONSE, **QUOTA_EXCEEDED_RESPONSE},
)
async def ask_journal(
    payload: AskJournalRequest, current_user: CurrentUser, db: DbSession
) -> AskJournalResponse:
    """Answer a natural-language question grounded in the user's journal entries.

    Hybrid retrieval (semantic + full-text, fused via RRF) finds the relevant
    entries; the model answers only from them and cites the ones it used. Quota is
    enforced up front, but a credit is charged **only when the model actually
    runs** — a no-data answer (empty journal, or nothing relevant) is free.
    """
    enforce_ai_quota(current_user)
    with ai_errors_as_http("Could not answer that right now. Please try again."):
        result = await answer_question(db, current_user, payload.question)
    if result.used_model:
        await record_ai_usage(current_user, db)
    return AskJournalResponse(
        answer=result.answer, citations=result.citations, model=result.model
    )
