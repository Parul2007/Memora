"""remove goals

Revision ID: remove_goals
Revises: 
Create Date: 2026-06-11 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'remove_goals'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Drop goals table
    op.drop_table('goals')

    # 2. Remove active_goals_count column from users (if it existed)
    # Note: Checked init.sql and it wasn't there, but safely attempting to drop if it exists
    # op.drop_column('users', 'active_goals_count')

    # 3. Remove GOAL_UPDATED from EventType enum (if it existed as a postgres enum)
    # Note: EventType was a Python Enum, not a Postgres enum, so no DB drop needed here.
    pass

def downgrade() -> None:
    # 1. Recreate goals table
    op.create_table('goals',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='active', nullable=False),
        sa.Column('priority', sa.Integer(), server_default='1', nullable=False),
        sa.Column('target_date', sa.Date(), nullable=True),
        sa.Column('progress_pct', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('milestones', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=False),
        sa.Column('habits', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_goals_user', 'goals', ['user_id'], unique=False)
    op.create_index('idx_goals_status', 'goals', ['status'], unique=False)
    
    # Re-add triggers for goals
    op.execute("""
        CREATE TRIGGER trg_goals_updated_at
        BEFORE UPDATE ON goals
        FOR EACH ROW
        EXECUTE FUNCTION updated_at_trigger();
    """)

    # 2. Add back active_goals_count column (if it existed)
    # op.add_column('users', sa.Column('active_goals_count', sa.Integer(), server_default='0', nullable=False))
