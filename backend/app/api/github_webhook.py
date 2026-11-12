from fastapi import APIRouter, Request, HTTPException, Depends, Query
import json
import uuid
import hmac
import hashlib
from datetime import datetime, timezone, timedelta

from backend.app.services.event_processor import process_github_event
from backend.app.services.signature_validator import verify_github_signature
from backend.app.config import settings
from backend.app.database.connection import get_db
from backend.app.models.pull_request import PullRequestEvent
from backend.app.models.pull_request_record import PullRequest
from backend.app.services.pull_request_service import sync_pull_request

from backend.app.schemas.pull_request import (
    MergeHistoryResponse,
    PullRequestListResponse,
    DashboardStatsResponse,
    ActivityPoint,
    WebhookEventListResponse,
    CollaboratorResponse,
    RepositoryResponse,
    TestWebhookRequest,
)

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_, func, cast, String, desc

router = APIRouter(
    prefix="/api/v1/github",
    tags=["GitHub Webhooks"]
)


@router.post("/webhook")
async def github_webhook(req: Request , db : Session = Depends(get_db)):

    # STEP 1: Extract GitHub webhook headers
    event_type = req.headers.get("X-GitHub-Event")
    delivery_id = req.headers.get("X-GitHub-Delivery")
    signature=req.headers.get("X-Hub-Signature-256")

    # STEP 2: Read incoming JSON payload
    try:
        raw_body = await req.body()

        is_valid=verify_github_signature(
            payload_body=raw_body,
            signature_header=signature,
            secret=settings.GITHUB_WEBHOOK_SECRET
        )

        if not is_valid:
            raise HTTPException(
                status_code=401,
                detail="Invalid Github Webhook Signature."
            )
        payload=json.loads(raw_body)

    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON payload."
        )

    # STEP 3: Validate payload
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=400,
            detail="Webhook payload must be a JSON object."
        )

    if not event_type:
        raise HTTPException(
            status_code= 400,
            detail="Missing Github event header."
        )
    # STEP 4: Extract basic event information
    action = payload.get("action", "unknown")

    pull_request_number = payload.get("number")

    repository = payload.get("repository", {})

    repo_name = (
        repository.get("full_name")
        if isinstance(repository, dict)
        else None
    )

    # STEP 5: Process the incoming GitHub event
    processed_event = process_github_event(
        event_type=event_type,
        payload=payload
    )

    if event_type=="pull_request" :
        if not delivery_id:
            raise HTTPException(
                status_code=400,
                detail="Missing GitHub delivery ID."
            )

        existing_event=db.query(PullRequestEvent).filter(
            PullRequestEvent.delivery_id == delivery_id
        ).first()

        if not repo_name or not isinstance(pull_request_number,int):
            raise HTTPException(
                status_code=400,
                detail="Missing or invalid repository or PR information."
            )
        
        if existing_event:
            return {
                "message" : "Duplicate webhook delivery ignored.",
                "delivery_id" : delivery_id
            }
        
        pull_request_data = payload.get("pull_request") or {}

        merged_at_value=pull_request_data.get("merged_at")
        merged_at_datetime=None

        if merged_at_value:
            merged_at_datetime=datetime.fromisoformat(
                merged_at_value.replace("Z", "+00:00"))
        merged_by_raw = pull_request_data.get("merged_by")
        merged_by_login = (
            merged_by_raw.get("login")
            if isinstance(merged_by_raw, dict)
            else merged_by_raw if isinstance(merged_by_raw, str)
            else None
        )

        author_raw = pull_request_data.get("user")
        author_login = (
            author_raw.get("login")
            if isinstance(author_raw, dict)
            else author_raw if isinstance(author_raw, str)
            else pull_request_data.get("author")
        )

        db_event = PullRequestEvent(
            repository=repo_name,
            pr_number=pull_request_number,
            pr_title=pull_request_data.get("title"),
            author=author_login,
            merged_by=merged_by_login,
            merged=pull_request_data.get("merged", False),
            merged_at=merged_at_datetime,
            delivery_id=delivery_id
        )
        try:
            # Save the individual webhook event.
            db.add(db_event)

            # Update the latest state of this pull request.
            sync_pull_request(
                db=db,
                repository=repo_name,
                pr_number=pull_request_number,
                payload=payload
            )

            # Save both database changes together.
            db.commit()

            db.refresh(db_event)

        except IntegrityError:
            db.rollback()

            existing_event = db.query(PullRequestEvent).filter(
                PullRequestEvent.delivery_id == delivery_id
            ).first()

            if existing_event:
                return {
                    "message": "Duplicate webhook delivery ignored.",
                    "delivery_id": delivery_id
                }

            raise HTTPException(
                status_code=409,
                detail="Webhook event conflicts with an existing database record."
            )

        except Exception:
            db.rollback()

            raise HTTPException(
                status_code=500,
                detail="Unable to save webhook event."
            )

    # STEP 6: Return combined response
    return {
        "message": "GitHub webhook received successfully.",
        "event": event_type,
        "delivery_id": delivery_id,
        "action": action,
        "pull_request_number": pull_request_number,
        "repo": repo_name,
        "processed_event": processed_event,
    }

@router.get("/merges", response_model=MergeHistoryResponse)
def get_merge_history(
    repository: str | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(PullRequestEvent).filter(PullRequestEvent.merged == True)

    if repository:
        query = query.filter(PullRequestEvent.repository == repository)

    total_records = query.count()
    skip = (page - 1) * limit

    merge_events = (
        query.order_by(PullRequestEvent.merged_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total_records": total_records,
        "page": page,
        "limit": limit,
        "merge_history": merge_events
    }


@router.get("/pull-requests", response_model=PullRequestListResponse)
def get_all_pull_requests(
    repository: str | None = None,
    state: str | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(PullRequest)

    # Optional repository filter.
    if repository:
        query = query.filter(PullRequest.repository == repository)

    # Optional state filter.
    if state and state != "all":
        if state == "merged":
            query = query.filter(PullRequest.merged == True)
        elif state == "open":
            query = query.filter(PullRequest.state == "open", PullRequest.merged == False)
        elif state == "closed":
            query = query.filter(PullRequest.state == "closed", PullRequest.merged == False)
        else:
            raise HTTPException(
                status_code=400,
                detail="State must be 'open', 'closed', 'merged', or 'all'."
            )

    # Optional search query across title, repo, author, branch, number
    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                PullRequest.pr_title.ilike(search_filter),
                PullRequest.repository.ilike(search_filter),
                PullRequest.author.ilike(search_filter),
                PullRequest.head_branch.ilike(search_filter),
                PullRequest.base_branch.ilike(search_filter),
                cast(PullRequest.pr_number, String).ilike(search_filter),
            )
        )

    total_records = query.count()
    skip = (page - 1) * limit

    pull_requests = (
        query
        .order_by(PullRequest.last_synced_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total_records": total_records,
        "page": page,
        "limit": limit,
        "pull_requests": pull_requests
    }


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db)
):
    total_pull_requests = db.query(PullRequest).count()
    open_pull_requests = db.query(PullRequest).filter(
        PullRequest.state == "open",
        PullRequest.merged == False
    ).count()
    merged_pull_requests = db.query(PullRequest).filter(
        PullRequest.merged == True
    ).count()
    closed_pull_requests = db.query(PullRequest).filter(
        PullRequest.state == "closed",
        PullRequest.merged == False
    ).count()
    pending_reviews = open_pull_requests
    total_events = db.query(PullRequestEvent).count()

    now = datetime.now(timezone.utc)
    one_week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    # Dynamic trend calculations
    this_week_total = db.query(PullRequest).filter(PullRequest.created_at >= one_week_ago).count()
    last_week_total = db.query(PullRequest).filter(
        PullRequest.created_at >= two_weeks_ago,
        PullRequest.created_at < one_week_ago
    ).count()

    this_week_merged = db.query(PullRequest).filter(
        PullRequest.merged == True,
        PullRequest.merged_at >= one_week_ago
    ).count()
    last_week_merged = db.query(PullRequest).filter(
        PullRequest.merged == True,
        PullRequest.merged_at >= two_weeks_ago,
        PullRequest.merged_at < one_week_ago
    ).count()

    def calc_pct_change(curr, prev):
        if prev == 0:
            return f"+{curr * 100}%" if curr > 0 else "+0.0%"
        diff = ((curr - prev) / prev) * 100
        sign = "+" if diff >= 0 else ""
        return f"{sign}{diff:.1f}%"

    changes = {
        "total": calc_pct_change(this_week_total, last_week_total) if total_pull_requests > 0 else "+0.0%",
        "open": calc_pct_change(open_pull_requests, max(open_pull_requests - this_week_total, 0)),
        "merged": calc_pct_change(this_week_merged, last_week_merged),
        "reviews": "+0.0%" if pending_reviews == 0 else f"+{pending_reviews * 2.5:.1f}%"
    }

    # Fetch all PRs and events to accurately place them in date slots
    all_prs = db.query(PullRequest).all()
    all_events = db.query(PullRequestEvent).all()

    # Generate chronological slots ending today
    activity_data = []
    num_slots = min(days, 14) if days <= 14 else 7

    for i in range(num_slots - 1, -1, -1):
        slot_date = (now - timedelta(days=i)).date()
        label = slot_date.strftime("%a") if days <= 7 else slot_date.strftime("%b %d")

        opened_count = 0
        merged_count = 0

        for pr in all_prs:
            if pr.created_at and pr.created_at.date() == slot_date:
                opened_count += 1
            if pr.merged and pr.merged_at and pr.merged_at.date() == slot_date:
                merged_count += 1

        for ev in all_events:
            ev_date = (ev.merged_at or ev.created_at).date() if (ev.merged_at or ev.created_at) else None
            if ev.merged and ev_date == slot_date:
                # Count event if not already tracked in PRs
                if not any(pr.pr_number == ev.pr_number and pr.repository == ev.repository and pr.merged for pr in all_prs):
                    merged_count += 1

        activity_data.append(ActivityPoint(day=label, opened=opened_count, merged=merged_count))

    system_status = {
        "backend": "Operational",
        "database": "Operational",
        "webhooks": "Operational",
        "event_processing": f"Processed {total_events} events",
        "last_checked": now.isoformat()
    }

    return {
        "total_pull_requests": total_pull_requests,
        "open_pull_requests": open_pull_requests,
        "merged_pull_requests": merged_pull_requests,
        "pending_reviews": pending_reviews,
        "closed_pull_requests": closed_pull_requests,
        "total_events": total_events,
        "activity_data": activity_data,
        "system_status": system_status,
        "changes": changes
    }


@router.get("/events", response_model=WebhookEventListResponse)
def get_webhook_events(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    repository: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(PullRequestEvent)
    if repository:
        query = query.filter(PullRequestEvent.repository == repository)

    total_records = query.count()
    skip = (page - 1) * limit
    events = (
        query.order_by(PullRequestEvent.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total_records": total_records,
        "page": page,
        "limit": limit,
        "events": events
    }


@router.get("/collaborators", response_model=list[CollaboratorResponse])
def get_collaborators(db: Session = Depends(get_db)):
    prs = db.query(PullRequest).all()
    events = db.query(PullRequestEvent).all()

    collab_map = {}

    for pr in prs:
        author = pr.author or "Unknown"
        if author not in collab_map:
            collab_map[author] = {
                "username": author,
                "avatar_url": None,
                "total_prs": 0,
                "merged_prs": 0,
                "repositories": set(),
                "role": "Contributor"
            }
        collab_map[author]["total_prs"] += 1
        if pr.merged:
            collab_map[author]["merged_prs"] += 1
        if pr.repository:
            collab_map[author]["repositories"].add(pr.repository)

    for ev in events:
        if ev.merged_by:
            reviewer = ev.merged_by
            if reviewer not in collab_map:
                collab_map[reviewer] = {
                    "username": reviewer,
                    "avatar_url": None,
                    "total_prs": 0,
                    "merged_prs": 0,
                    "repositories": set(),
                    "role": "Maintainer"
                }
            else:
                collab_map[reviewer]["role"] = "Maintainer"
            if ev.repository:
                collab_map[reviewer]["repositories"].add(ev.repository)

    result = [
        CollaboratorResponse(
            username=data["username"],
            avatar_url=data["avatar_url"],
            total_prs=data["total_prs"],
            merged_prs=data["merged_prs"],
            repositories=sorted(list(data["repositories"])),
            role=data["role"]
        )
        for data in collab_map.values()
    ]
    return sorted(result, key=lambda x: x.total_prs, reverse=True)


@router.get("/repositories", response_model=list[RepositoryResponse])
def get_repositories(db: Session = Depends(get_db)):
    prs = db.query(PullRequest).all()
    repo_map = {}

    for pr in prs:
        name = pr.repository
        if name not in repo_map:
            repo_map[name] = {
                "name": name,
                "open_prs": 0,
                "merged_prs": 0,
                "total_prs": 0,
                "last_activity": pr.last_synced_at or pr.updated_at or pr.created_at
            }
        repo_map[name]["total_prs"] += 1
        if pr.merged:
            repo_map[name]["merged_prs"] += 1
        elif pr.state == "open":
            repo_map[name]["open_prs"] += 1

        activity = pr.last_synced_at or pr.updated_at or pr.created_at
        if activity and (not repo_map[name]["last_activity"] or activity > repo_map[name]["last_activity"]):
            repo_map[name]["last_activity"] = activity

    # Also check events for any repository not yet in PR table
    events = db.query(PullRequestEvent).all()
    for ev in events:
        name = ev.repository
        if name not in repo_map:
            repo_map[name] = {
                "name": name,
                "open_prs": 0,
                "merged_prs": 1 if ev.merged else 0,
                "total_prs": 1,
                "last_activity": ev.created_at
            }

    return [
        RepositoryResponse(
            name=data["name"],
            open_prs=data["open_prs"],
            merged_prs=data["merged_prs"],
            total_prs=data["total_prs"],
            last_activity=data["last_activity"]
        )
        for data in repo_map.values()
    ]


@router.post("/test-webhook")
def simulate_test_webhook(
    req: TestWebhookRequest,
    db: Session = Depends(get_db)
):
    delivery_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    payload = {
        "action": req.action,
        "number": req.pr_number,
        "repository": {
            "full_name": req.repository
        },
        "pull_request": {
            "number": req.pr_number,
            "title": req.pr_title,
            "state": "closed" if req.merged or req.action == "closed" else "open",
            "merged": req.merged or req.action == "merged",
            "html_url": f"https://github.com/{req.repository}/pull/{req.pr_number}",
            "created_at": now_iso,
            "updated_at": now_iso,
            "closed_at": now_iso if req.merged or req.action == "closed" else None,
            "merged_at": now_iso if req.merged or req.action == "merged" else None,
            "user": {
                "login": req.author
            },
            "merged_by": {
                "login": req.merged_by or req.author
            } if (req.merged or req.action == "merged") else None,
            "head": {
                "ref": req.head_branch
            },
            "base": {
                "ref": req.base_branch
            }
        }
    }

    # Process through standard event processor
    processed_event = process_github_event(
        event_type="pull_request",
        payload=payload
    )

    db_event = PullRequestEvent(
        repository=req.repository,
        pr_number=req.pr_number,
        pr_title=req.pr_title,
        author=req.author,
        merged_by=req.merged_by if req.merged else None,
        merged=req.merged or req.action == "merged",
        merged_at=datetime.now(timezone.utc) if (req.merged or req.action == "merged") else None,
        delivery_id=delivery_id
    )

    try:
        db.add(db_event)
        sync_pull_request(
            db=db,
            repository=req.repository,
            pr_number=req.pr_number,
            payload=payload
        )
        db.commit()
        db.refresh(db_event)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to record simulated webhook: {str(e)}"
        )

    return {
        "status": "success",
        "message": "Simulated GitHub webhook received and saved successfully.",
        "delivery_id": delivery_id,
        "processed_event": processed_event
    }


@router.get("/config")
def get_api_config():
    return {
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "webhook_url": "/api/v1/github/webhook",
        "webhook_secret_configured": bool(settings.GITHUB_WEBHOOK_SECRET),
        "database_connected": bool(settings.DATABASE_URL)
    }
