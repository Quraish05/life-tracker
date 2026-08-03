"""add checklist items column to notes

Adds ``items`` (JSONB, default ``[]``) holding a checklist note's rows, each
``{"text": str, "done": bool}``. Non-checklist notes keep an empty list. Paired
with widening ``kind`` to include ``checklist`` (enforced in the app layer, so
no DB constraint change).

Revision ID: f1a3b6d24c80
Revises: e5c2a7d90f31
Create Date: 2026-08-03

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f1a3b6d24c80'
down_revision: str | Sequence[str] | None = 'e5c2a7d90f31'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'notes',
        sa.Column(
            'items',
            postgresql.JSONB(astext_type=sa.Text()),
            server_default='[]',
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('notes', 'items')
