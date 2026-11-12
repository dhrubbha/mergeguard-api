from fastapi import APIRouter, Request, HTTPException, Depends, Query
import json
from datetime import datetime

from backend.app.services.event_processor import process_github_event
from backend.app.services.signature_validator import verify_github_signature
from backend.app.config import settings
from backend.app.database.connection import get_db
from backend.app.models.pull_request import PullRequestEvent
from backend.app.schemas.pull_request import MergeHistoryResponse
from backend.app.services.pull_request_service import sync_pull_request

from backend.app.models.pull_request_record import PullRequest
from backend.app.schemas.pull_request import PullRequestListResponse

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

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
        db_event = PullRequestEvent(
        repository=repo_name,
        pr_number=pull_request_number,
        pr_title=pull_request_data.get("title"),
        author=(pull_request_data.get("user") or {}).get("login"),
        merged_by=(pull_request_data.get("merged_by") or {}).get("login"),
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

@router.get("/merges",response_model=MergeHistoryResponse)
def get_merge_history(repository:str =None,page:int= Query(default=1, ge=1),limit :int =Query(default=10,ge=1,le=100) ,db:Session = Depends(get_db)):

    query=db.query(PullRequestEvent).filter(PullRequestEvent.merged == True)

    if repository:
        query=query.filter(PullRequestEvent.repository == repository)

    total_records=query.count()

    skip=(page-1) * limit
    merge_events=(

        query.order_by(PullRequestEvent.merged_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "total_records" : total_records,
        "page" :  page,
        "limit" : limit,
        "merge_history" : merge_events
    }



@router.get("/pull-requests",response_model=PullRequestListResponse)
def get_all_pull_requests(
    repository: str | None = None,
    state: str | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(PullRequest)

    # Optional repository filter.
    if repository:
        query = query.filter(
            PullRequest.repository == repository
        )

    # Optional state filter.
    if state:
        if state not in ("open", "closed"):
            raise HTTPException(
                status_code=400,
                detail="State must be 'open' or 'closed'."
            )

        query = query.filter(
            PullRequest.state == state
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
