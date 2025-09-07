"""Add profile enhancements

Revision ID: add_profile_enhancements
Revises: bf747679d312
Create Date: 2025-09-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_profile_enhancements'
down_revision = 'bf747679d312'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to users table for profile enhancement
    op.add_column('users', sa.Column('email', sa.String(), nullable=True))
    op.add_column('users', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('status', sa.String(), nullable=True, server_default='Online'))
    op.add_column('users', sa.Column('last_active', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()))
    op.add_column('users', sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.func.now()))
    
    # Create user_settings table for app preferences
    op.create_table('user_settings',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('push_notifications', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('email_notifications', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('desktop_notifications', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('profile_visibility', sa.String(), nullable=False, server_default='family'),
        sa.Column('show_online_status', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('language', sa.String(), nullable=False, server_default='hu'),
        sa.Column('theme', sa.String(), nullable=False, server_default='light'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now())
    )
    
    # Create user_events table for daily schedule/events
    op.create_table('user_events',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('color', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),  # 'manual', 'google', 'school', etc.
        sa.Column('is_recurring', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now())
    )
    
    # Create user_status_history table for status tracking
    op.create_table('user_status_history',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('changed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('changed_until', sa.DateTime(), nullable=True),
        sa.Column('note', sa.String(), nullable=True)
    )


def downgrade() -> None:
    # Drop tables
    op.drop_table('user_status_history')
    op.drop_table('user_events')
    op.drop_table('user_settings')
    
    # Drop columns from users table
    op.drop_column('users', 'updated_at')
    op.drop_column('users', 'created_at')
    op.drop_column('users', 'last_active')
    op.drop_column('users', 'status')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'phone')
    op.drop_column('users', 'email')
