
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, UniqueConstraint
from sqlalchemy.sql import func

from backend.app.database.connection import Base


class PullRequest(Base):
    __tablename__ = "pull_requests"

    __table_args__ = (
        UniqueConstraint(
            "repository",
            "pr_number",
            name="uq_repository_pr_number"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    repository = Column(String(255), nullable=False)
    pr_number = Column(Integer, nullable=False)

    pr_title = Column(Text, nullable=True)
    author = Column(String(255), nullable=True)

    state = Column(String(30), nullable=False, default="open")
    merged = Column(Boolean, nullable=False, default=False)

    merged_by = Column(String(255), nullable=True)
    html_url = Column(Text, nullable=True)

    head_branch = Column(String(255), nullable=True)
    base_branch = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    merged_at = Column(DateTime(timezone=True), nullable=True)

    last_synced_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
