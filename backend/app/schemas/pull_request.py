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


class ActivityPoint(BaseModel):
    day: str
    opened: int
    merged: int


class DashboardStatsResponse(BaseModel):
    total_pull_requests: int
    open_pull_requests: int
    merged_pull_requests: int
    pending_reviews: int
    closed_pull_requests: int
    total_events: int
    activity_data: list[ActivityPoint]
    system_status: dict
    changes: dict[str, str] = {}


class WebhookEventItem(BaseModel):
    id: int
    repository: str
    pr_number: int
    pr_title: str | None = None
    author: str | None = None
    merged_by: str | None = None
    merged: bool
    merged_at: datetime | None = None
    delivery_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WebhookEventListResponse(BaseModel):
    total_records: int
    page: int
    limit: int
    events: list[WebhookEventItem]


class CollaboratorResponse(BaseModel):
    username: str
    avatar_url: str | None = None
    total_prs: int
    merged_prs: int
    repositories: list[str]
    role: str


class RepositoryResponse(BaseModel):
    name: str
    open_prs: int
    merged_prs: int
    total_prs: int
    last_activity: datetime | None = None


class TestWebhookRequest(BaseModel):
    action: str = "opened"
    repository: str = "demo/MergeGuardNotify"
    pr_number: int = 102
    pr_title: str = "Feature: Enhanced Webhook Security"
    author: str = "developer"
    merged: bool = False
    merged_by: str | None = None
    head_branch: str = "feature/security"
    base_branch: str = "main"


class AddRepositoryRequest(BaseModel):
    repository: str

