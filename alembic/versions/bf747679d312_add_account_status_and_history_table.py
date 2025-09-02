"""Add account status and history table

Revision ID: bf747679d312
Revises: 8c10371bf843
Create Date: 2024-05-21 16:30:48.593539

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'bf747679d312'
down_revision: Union[str, None] = '8c10371bf843'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === KÉZI JAVÍTÁS KEZDETE ===

    # 1. Lépés: Először hozzuk létre az ENUM típust az adatbázisban.
    account_status_enum = postgresql.ENUM('active', 'archived', name='account_status_enum')
    account_status_enum.create(op.get_bind())

    # 2. Lépés: Most már hozzáadhatjuk az oszlopot, ami ezt a típust használja.
    #    Hozzáadtam egy alapértelmezett értéket is a meglévő sorok miatt.
    op.add_column('accounts', sa.Column('status', account_status_enum, nullable=False, server_default='active'))
    
    # 3. Lépés: Az új tábla létrehozása változatlan.
    op.create_table('account_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('family_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ),
        sa.ForeignKeyConstraint(['family_id'], ['families.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_account_history_id'), 'account_history', ['id'], unique=False)
    
    # === KÉZI JAVÍTÁS VÉGE ===


def downgrade() -> None:
    # === Itt is fontos a helyes sorrend a visszavonáshoz ===
    op.drop_index(op.f('ix_account_history_id'), table_name='account_history')
    op.drop_table('account_history')
    op.drop_column('accounts', 'status')
    
    # Először az oszlopot töröljük, ami használja, és csak utána a típust.
    account_status_enum = postgresql.ENUM('active', 'archived', name='account_status_enum')
    account_status_enum.drop(op.get_bind())
    # ### end Alembic commands ###