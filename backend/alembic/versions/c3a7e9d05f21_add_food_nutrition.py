"""add per-serving nutrition to food_items

Four nullable integer columns — calories (kcal) and protein/carbs/fat (grams) —
holding a food's per-serving nutrition. Nullable because a food starts without
them; they're filled by the AI estimator or by hand.

Revision ID: c3a7e9d05f21
Revises: b2e4c8f1a37d
Create Date: 2026-07-31

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c3a7e9d05f21'
down_revision: str | Sequence[str] | None = 'b2e4c8f1a37d'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_COLUMNS = ('calories', 'protein_g', 'carbs_g', 'fat_g')


def upgrade() -> None:
    """Upgrade schema."""
    for column in _COLUMNS:
        op.add_column('food_items', sa.Column(column, sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    for column in reversed(_COLUMNS):
        op.drop_column('food_items', column)
