"""editable free-text note on daily_summaries; structured fields now nullable

Adds ``note`` (the user's editable day summary — typed or AI-drafted) and relaxes
the AI-snapshot columns to nullable, so a hand-typed note-only summary is valid.
``target_calories`` was already nullable.

Revision ID: d4b1f6a2e8c3
Revises: c3a7e9d05f21
Create Date: 2026-08-03

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd4b1f6a2e8c3'
down_revision: str | Sequence[str] | None = 'c3a7e9d05f21'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Columns relaxed to nullable, with the type Alembic needs to alter them.
_NULLABLE = (
    ('calories_in', sa.Integer()),
    ('calories_out', sa.Integer()),
    ('assessment', sa.String(length=16)),
    ('headline', sa.String(length=200)),
    ('tip', sa.String(length=200)),
    ('model', sa.String(length=64)),
)


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('daily_summaries', sa.Column('note', sa.Text(), nullable=True))
    for name, type_ in _NULLABLE:
        op.alter_column('daily_summaries', name, existing_type=type_, nullable=True)


def downgrade() -> None:
    """Downgrade schema.

    Restores NOT NULL on the structured columns — only safe if no note-only rows
    exist (they'd have NULLs); backfill or delete those first if downgrading.
    """
    for name, type_ in reversed(_NULLABLE):
        op.alter_column('daily_summaries', name, existing_type=type_, nullable=False)
    op.drop_column('daily_summaries', 'note')
