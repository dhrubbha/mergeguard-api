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


class PullRequestRecordResponse(BaseModel):
    id: int
    repository: str
    pr_number: int
    pr_title: str | None = None
    author: str | None = None

    state: str
    merged: bool

    merged_by: str | None = None
    html_url: str | None = None

    head_branch: str | None = None
    base_branch: str | None = None

    created_at: datetime | None = None
    updated_at: datetime | None = None
    closed_at: datetime | None = None
    merged_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PullRequestListResponse(BaseModel):
    total_records: int
    page: int
    limit: int
    pull_requests: list[PullRequestRecordResponse]
