from datetime import datetime
from pydantic import BaseModel, ConfigDict

class PullRequestResponse(BaseModel):
    id: int
    repository: str
    pr_number: int
    pr_title: str | None = None
    author: str | None = None
    merged_by: str | None = None
    merged: bool
    merged_at: datetime | None = None

    model_config=ConfigDict(from_attributes = True)


class MergeHistoryResponse(BaseModel):
    total_records : int
    page: int
    limit: int
    merge_history: list[PullRequestResponse]
