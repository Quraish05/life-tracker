"""Full-text search over a user's notes (Postgres FTS).

Matches against the `search_vector` generated column on `notes` (see
`app/models/note.py`) and ranks hits with `ts_rank_cd`. All matching is
Postgres-side — this module just builds the query.
"""

from collections.abc import Sequence

from sqlalchemy import Row, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.note import Note

# ts_headline options: wrap matches for the client, keep snippets short.
_HEADLINE_OPTS = "StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=18, MinWords=5"


async def search_notes(
    db: AsyncSession, user_id: int, query: str, limit: int = 20
) -> Sequence[Row[tuple[Note, float, str]]]:
    """Return the user's notes matching ``query``, best-ranked first.

    Each row is ``(Note, rank, snippet)``. ``websearch_to_tsquery`` gives users
    real search syntax (quoted phrases, ``or``, ``-exclude``) and never raises on
    junk input. An empty/whitespace query matches nothing, so we skip the round
    trip entirely.
    """
    if not query.strip():
        return []

    tsquery = func.websearch_to_tsquery("english", query)
    rank = func.ts_rank_cd(Note.search_vector, tsquery)
    snippet = func.ts_headline("english", Note.body_md, tsquery, _HEADLINE_OPTS)

    stmt = (
        select(Note, rank.label("rank"), snippet.label("snippet"))
        .where(
            Note.user_id == user_id,
            Note.search_vector.op("@@")(tsquery),
        )
        # Rank first; break ties with the most recently touched note.
        .order_by(rank.desc(), Note.updated_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.all()
