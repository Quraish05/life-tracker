"""make users.hashed_password nullable (for Google SSO accounts)

Revision ID: a1f7c3e29b04
Revises: b8d1e4f6a923
Create Date: 2026-08-07 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1f7c3e29b04'
down_revision: str | Sequence[str] | None = 'b8d1e4f6a923'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Allow NULL passwords so SSO (Google) users need no password."""
    op.alter_column(
        'users',
        'hashed_password',
        existing_type=sa.String(length=255),
        nullable=True,
    )


def downgrade() -> None:
    """Re-require a password. Any SSO-only rows (NULL) must be backfilled first."""
    op.alter_column(
        'users',
        'hashed_password',
        existing_type=sa.String(length=255),
        nullable=False,
    )
