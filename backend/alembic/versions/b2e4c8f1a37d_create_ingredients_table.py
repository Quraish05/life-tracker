"""create ingredients table

Pantry ingredients: a per-user library of reusable {name, default_amount}
entries, sprinkled onto food items. No nutrition (estimated at the food level).

Revision ID: b2e4c8f1a37d
Revises: a1f0d5e2c7b9
Create Date: 2026-07-31

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b2e4c8f1a37d'
down_revision: str | Sequence[str] | None = 'a1f0d5e2c7b9'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'ingredients',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('default_amount', sa.String(length=40), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_ingredients_user_id'), 'ingredients', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_ingredients_user_id'), table_name='ingredients')
    op.drop_table('ingredients')
