from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Index, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Output dimension of the local embedding model (all-MiniLM-L6-v2). Kept in sync
# with EMBED_DIMENSIONS in app/services/embeddings.py — a literal here so loading
# models never pulls in sentence-transformers/torch.
_EMBED_DIM = 384


class NoteChunk(Base):
    """A chunk of a note's text plus its embedding — the RAG retrieval index.

    Journal entries are chunked (usually one chunk per entry) and embedded with a
    local sentence-transformers model; the ``embedding`` column powers pgvector
    cosine search, fused with the notes' Postgres full-text index for hybrid
    retrieval (see ``app.services.journal_index`` / ``journal_qa``). Rows are
    *derived data* — rebuilt from the parent note, and cascade-deleted with it.
    """

    __tablename__ = "note_chunks"

    id: Mapped[int] = mapped_column(primary_key=True)
    note_id: Mapped[int] = mapped_column(
        ForeignKey("notes.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # 0-based ordinal of this chunk within its note.
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    chunk_text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(_EMBED_DIM))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        # HNSW index for fast approximate cosine nearest-neighbour search. The `<=>`
        # (cosine distance) operator uses this via the vector_cosine_ops opclass.
        Index(
            "ix_note_chunks_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )
