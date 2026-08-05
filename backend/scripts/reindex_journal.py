"""Backfill / rebuild the journal RAG index (``note_chunks``).

Embeds every journal entry (optionally for one user) into ``note_chunks`` so the
"Ask my journal" feature can retrieve over them. Idempotent — reindexing replaces
a note's chunks in place — so it's safe to run after the migration, after seeding,
or any time the index drifts.

Run from backend/:
    uv run python -m scripts.reindex_journal            # all users
    uv run python -m scripts.reindex_journal <username>  # one user
"""

import asyncio
import sys

from sqlalchemy import select

from app.db.session import async_session_factory
from app.models.user import User
from app.services.journal_index import reindex_all_journal


async def main(username: str | None) -> None:
    async with async_session_factory() as db:
        user_id: int | None = None
        if username:
            user = await db.scalar(select(User).where(User.username == username))
            if user is None:
                raise SystemExit(f"User {username!r} not found.")
            user_id = user.id

        notes, chunks = await reindex_all_journal(db, user_id=user_id)
        scope = f"user {username!r}" if username else "all users"
        print(f"Reindexed {notes} journal entries → {chunks} chunks ({scope}).")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else None))
