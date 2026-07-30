"""rename dishes to food_items (and meal_logs.dish_* to food_*)

Renames the ``dishes`` table to ``food_items`` and the ``meal_logs`` snapshot
columns ``dish_id``/``dish_name`` to ``food_id``/``food_name``, matching the
Dishes→Food module rename. Pure renames — no data is moved or lost, and the
foreign key is preserved (renamed for clarity).

Revision ID: a1f0d5e2c7b9
Revises: 7711394bba36
Create Date: 2026-07-30

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1f0d5e2c7b9'
down_revision: str | Sequence[str] | None = '7711394bba36'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.rename_table('dishes', 'food_items')
    op.execute('ALTER INDEX ix_dishes_user_id RENAME TO ix_food_items_user_id')

    op.alter_column('meal_logs', 'dish_id', new_column_name='food_id')
    op.alter_column('meal_logs', 'dish_name', new_column_name='food_name')
    op.execute(
        'ALTER TABLE meal_logs '
        'RENAME CONSTRAINT meal_logs_dish_id_fkey TO meal_logs_food_id_fkey'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        'ALTER TABLE meal_logs '
        'RENAME CONSTRAINT meal_logs_food_id_fkey TO meal_logs_dish_id_fkey'
    )
    op.alter_column('meal_logs', 'food_name', new_column_name='dish_name')
    op.alter_column('meal_logs', 'food_id', new_column_name='dish_id')

    op.execute('ALTER INDEX ix_food_items_user_id RENAME TO ix_dishes_user_id')
    op.rename_table('food_items', 'dishes')
