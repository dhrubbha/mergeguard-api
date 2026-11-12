
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend.app.models.pull_request_record import PullRequest


def parse_github_datetime(value):
    """Convert GitHub's ISO datetime string into a Python datetime."""

    if not value:
        return None

    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def sync_pull_request(
    db: Session,
    repository: str,
    pr_number: int,
    payload: dict
):
    """
    Create or update the latest database record for a GitHub PR.

    A PR is identified by its repository and PR number.
    """

    pr_data = payload.get("pull_request") or {}

    # Find whether this PR already exists.
    pr_record = (
        db.query(PullRequest)
        .filter(
            PullRequest.repository == repository,
            PullRequest.pr_number == pr_number
        )
        .first()
    )

    # Extract the latest information from GitHub.
    merged = pr_data.get("merged", False)

    state = pr_data.get("state", "open")

    # Find source and target branches.
    head = pr_data.get("head") or {}
    base = pr_data.get("base") or {}

    # Create a new record if this PR has never been seen.
    if pr_record is None:
        pr_record = PullRequest(
            repository=repository,
            pr_number=pr_number
        )
        db.add(pr_record)

    # Update the latest PR information.
    pr_record.pr_title = pr_data.get("title")

    pr_record.author = (
        (pr_data.get("user") or {}).get("login")
    )

    pr_record.state = state
    pr_record.merged = merged

    pr_record.merged_by = (
        (pr_data.get("merged_by") or {}).get("login")
    )

    pr_record.html_url = pr_data.get("html_url")

    pr_record.head_branch = head.get("ref")
    pr_record.base_branch = base.get("ref")

    pr_record.created_at = parse_github_datetime(
        pr_data.get("created_at")
    )

    pr_record.updated_at = parse_github_datetime(
        pr_data.get("updated_at")
    )

    pr_record.closed_at = parse_github_datetime(
        pr_data.get("closed_at")
    )

    pr_record.merged_at = parse_github_datetime(
        pr_data.get("merged_at")
    )

    pr_record.last_synced_at = datetime.now(timezone.utc)

    return pr_record
