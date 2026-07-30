"""add notes full-text search vector

Revision ID: 7711394bba36
Revises: c4e7e716240d
Create Date: 2026-07-30 13:33:47.481451

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '7711394bba36'
down_revision: str | Sequence[str] | None = 'c4e7e716240d'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# The generated-column expression. Kept in one place so upgrade and the ORM
# model (app/models/note.py) stay in lockstep. title -> weight A, body -> B.
_SEARCH_VECTOR_EXPR = (
    "setweight(to_tsvector('english', coalesce(title, '')), 'A') || "
    "setweight(to_tsvector('english', coalesce(body_md, '')), 'B')"
)


def upgrade() -> None:
    """Upgrade schema."""
    # A STORED generated column: Postgres recomputes it on every insert/update,
    # so there's no trigger and no app code to keep in sync. Existing rows are
    # backfilled automatically when the column is added.
    op.add_column(
        "notes",
        sa.Column(
            "search_vector",
            postgresql.TSVECTOR(),
            sa.Computed(_SEARCH_VECTOR_EXPR, persisted=True),
            nullable=True,
        ),
    )
    # GIN makes @@ full-text matches an index lookup instead of a table scan.
    op.create_index(
        "ix_notes_search_vector",
        "notes",
        ["search_vector"],
        postgresql_using="gin",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_notes_search_vector", table_name="notes")
    op.drop_column("notes", "search_vector")
