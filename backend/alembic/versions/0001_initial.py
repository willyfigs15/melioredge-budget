"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-19 00:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(), index=True, server_default=""),
        sa.Column("name", sa.String(), server_default=""),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "budgets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), server_default=""),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "year", "month", name="uq_budget_user_year_month"),
    )

    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("budget_id", sa.Integer(), sa.ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("limit_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("color", sa.String(), server_default="#22c55e"),
        sa.Column("icon", sa.String(), server_default="Wallet"),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "imports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("rows_total", sa.Integer(), server_default="0"),
        sa.Column("rows_imported", sa.Integer(), server_default="0"),
        sa.Column("rows_skipped", sa.Integer(), server_default="0"),
        sa.Column("status", sa.String(), server_default="pending"),
        sa.Column("error", sa.Text(), server_default=""),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("import_id", sa.Integer(), sa.ForeignKey("imports.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("description", sa.String(), server_default=""),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("source", sa.String(), server_default="manual"),
        sa.Column("external_id", sa.String(), server_default=""),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_txn_user_date", "transactions", ["user_id", "date"])


def downgrade() -> None:
    op.drop_index("ix_txn_user_date", table_name="transactions")
    op.drop_table("transactions")
    op.drop_table("imports")
    op.drop_table("categories")
    op.drop_table("budgets")
    op.drop_table("users")
