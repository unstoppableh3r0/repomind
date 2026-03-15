"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON
import uuid

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table('users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('name', sa.String(255)),
        sa.Column('avatar_url', sa.String(500)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
    )

    # projects
    op.create_table('projects',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('github_url', sa.String(500), nullable=False),
        sa.Column('status', sa.String(50), default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
    )

    # repositories
    op.create_table('repositories',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), unique=True),
        sa.Column('github_url', sa.String(500), nullable=False),
        sa.Column('owner', sa.String(255)),
        sa.Column('repo_name', sa.String(255)),
        sa.Column('branch', sa.String(100), default='main'),
        sa.Column('commit_hash', sa.String(50)),
        sa.Column('local_path', sa.String(500)),
        sa.Column('languages', JSON, default=list),
        sa.Column('frameworks', JSON, default=list),
        sa.Column('total_files', sa.Integer, default=0),
        sa.Column('total_lines', sa.Integer, default=0),
        sa.Column('size_mb', sa.Float, default=0.0),
        sa.Column('folder_structure', JSON, default=dict),
        sa.Column('cloned_at', sa.DateTime(timezone=True)),
    )

    # code_chunks
    op.create_table('code_chunks',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('repository_id', UUID(as_uuid=True), sa.ForeignKey('repositories.id', ondelete='CASCADE')),
        sa.Column('file_path', sa.String(1000), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('chunk_index', sa.Integer, default=0),
        sa.Column('language', sa.String(50)),
        sa.Column('chunk_type', sa.String(50)),
        sa.Column('symbol_name', sa.String(255)),
        sa.Column('start_line', sa.Integer),
        sa.Column('end_line', sa.Integer),
        sa.Column('embedding_id', sa.String(100)),
    )
    op.create_index('ix_code_chunks_repository_id', 'code_chunks', ['repository_id'])

    # analysis_results
    op.create_table('analysis_results',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE')),
        sa.Column('result_type', sa.String(50)),
        sa.Column('content', JSON, nullable=False),
        sa.Column('raw_data', JSON),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_analysis_results_project_id', 'analysis_results', ['project_id'])

    # chat_messages
    op.create_table('chat_messages',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE')),
        sa.Column('session_id', sa.String(100)),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('sources', JSON, default=list),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_chat_messages_project_id', 'chat_messages', ['project_id'])
    op.create_index('ix_chat_messages_session_id', 'chat_messages', ['session_id'])


def downgrade() -> None:
    op.drop_table('chat_messages')
    op.drop_table('analysis_results')
    op.drop_table('code_chunks')
    op.drop_table('repositories')
    op.drop_table('projects')
    op.drop_table('users')
