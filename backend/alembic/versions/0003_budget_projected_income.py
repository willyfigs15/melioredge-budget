"""budget projected_income

Revision ID: 0003_projected_income
Revises: 0002_recurring
Create Date: 2026-04-20 00:00:00
"""
from typing import Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_projected_income"
down_revision: Union[str, None] = "0002_recurring"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "budgets",
        sa.Column(
            "projected_income",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("budgets", "projected_income")
