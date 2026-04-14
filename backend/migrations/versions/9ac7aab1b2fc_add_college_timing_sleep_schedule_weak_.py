"""add college_timing sleep_schedule weak_subjects

Revision ID: 9ac7aab1b2fc
Revises: 1c8e94757025
Create Date: 2026-04-14 14:44:06.190924

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9ac7aab1b2fc'
down_revision = '1c8e94757025'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user_profiles', sa.Column('college_timing', sa.String(length=150), nullable=True))
    op.add_column('user_profiles', sa.Column('sleep_schedule', sa.String(length=150), nullable=True))
    op.add_column('user_profiles', sa.Column('weak_subjects', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('user_profiles', 'weak_subjects')
    op.drop_column('user_profiles', 'sleep_schedule')
    op.drop_column('user_profiles', 'college_timing')
