from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.sql import func


from backend.app.database.connection import Base


class PullRequestEvent(Base):

    __tablename__ = "pull_request_events"

    id = Column(Integer, primary_key=True, index=True)

    repository = Column(String(255), nullable=False)
    pr_number = Column(Integer, nullable=False)
    pr_title = Column(Text, nullable=True)
    author = Column(String(255), nullable=True)
    merged_by = Column(String(255), nullable=True)
    merged = Column(Boolean,default=False, nullable=False)
    merged_at = Column(DateTime(timezone=True), nullable=True)
    delivery_id = Column(String(255),unique=True, nullable=False)


    created_at = Column(
        DateTime(timezone=True),
        server_default= func.now(),
        nullable=False
    )
    