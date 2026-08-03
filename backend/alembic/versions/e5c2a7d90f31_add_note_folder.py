"""add single-select folder column to notes

Adds a nullable ``folder`` slug (e.g. "eating-out") so a note can live in one
bucket. Existing tags stay for multi-label / AI use; the label + colour for each
folder slug live on the frontend. Null = no folder.

Revision ID: e5c2a7d90f31
Revises: d4b1f6a2e8c3
Create Date: 2026-08-03

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e5c2a7d90f31'
down_revision: str | Sequence[str] | None = 'd4b1f6a2e8c3'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('notes', sa.Column('folder', sa.String(length=40), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('notes', 'folder')
