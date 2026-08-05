"""note_chunks pgvector

Enables the pgvector extension and adds ``note_chunks`` — the semantic-retrieval
index for the "Ask my journal" RAG feature. Each row is a chunk of a note's text
plus its 384-dim embedding (local all-MiniLM-L6-v2). An HNSW index over the
vector column powers cosine nearest-neighbour search; rows cascade-delete with
their parent note.

Requires the pgvector extension to be installed on the server (locally:
``brew install pgvector`` or build from source against the running Postgres).

Revision ID: a1cd7157ccfd
Revises: f1a3b6d24c80
Create Date: 2026-08-04 22:08:06.533198

"""
from collections.abc import Sequence

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1cd7157ccfd'
down_revision: str | Sequence[str] | None = 'f1a3b6d24c80'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_EMBED_DIM = 384


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "note_chunks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "note_id",
            sa.Integer(),
            sa.ForeignKey("notes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(_EMBED_DIM), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_note_chunks_note_id", "note_chunks", ["note_id"])
    op.create_index("ix_note_chunks_user_id", "note_chunks", ["user_id"])
    op.create_index(
        "ix_note_chunks_embedding",
        "note_chunks",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_note_chunks_embedding", table_name="note_chunks")
    op.drop_index("ix_note_chunks_user_id", table_name="note_chunks")
    op.drop_index("ix_note_chunks_note_id", table_name="note_chunks")
    op.drop_table("note_chunks")
    # Leave the `vector` extension installed — other objects may rely on it and
    # dropping it is a heavier, riskier operation than this migration should own.
