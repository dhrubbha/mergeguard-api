import hashlib
import hmac
import json

import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.config import settings
from backend.app.database.connection import Base, get_db
from backend.app.models.pull_request import PullRequestEvent


# --------------------------------------------------
# TEST CONFIGURATION
# --------------------------------------------------

TEST_SECRET = "integration-test-secret-123"


# --------------------------------------------------
# FIXTURE: CONNECT TO THE REAL TEST DATABASE
# --------------------------------------------------

@pytest.fixture
def integration_client(monkeypatch):

    # Read the existing DATABASE_URL.
    original_url = make_url(settings.DATABASE_URL)

    # Change only the database name.
    test_database_url = original_url.set(
        database="mergeguard_test_db"
    )

    # Create a real SQLAlchemy engine for PostgreSQL.
    test_engine = create_engine(
        test_database_url,
        pool_pre_ping=True
    )

    # IMPORTANT:
    # This is safe only because this is our dedicated test database.
    # Remove old test tables and recreate them.
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    # Create database sessions connected to the test database.
    TestingSessionLocal = sessionmaker(
        bind=test_engine,
        autoflush=False,
        autocommit=False
    )

    # Use a test webhook secret.
    monkeypatch.setattr(
        settings,
        "GITHUB_WEBHOOK_SECRET",
        TEST_SECRET
    )

    # Override FastAPI's real database dependency.
    def override_get_db():

        db = TestingSessionLocal()

        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Create the HTTP test client.
    with TestClient(app) as test_client:
        yield test_client, TestingSessionLocal

    # Clean up after each test.
    app.dependency_overrides.clear()

    Base.metadata.drop_all(bind=test_engine)

    test_engine.dispose()


# --------------------------------------------------
# HELPER: GENERATE GITHUB SIGNATURE
# --------------------------------------------------

def generate_signature(body: bytes) -> str:

    signature = hmac.new(
        key=TEST_SECRET.encode("utf-8"),
        msg=body,
        digestmod=hashlib.sha256
    ).hexdigest()

    return f"sha256={signature}"


# --------------------------------------------------
# HELPER: CREATE WEBHOOK HEADERS
# --------------------------------------------------

def create_headers(body: bytes, delivery_id: str):

    return {
        "X-GitHub-Event": "pull_request",
        "X-GitHub-Delivery": delivery_id,
        "X-Hub-Signature-256": generate_signature(body),
        "Content-Type": "application/json"
    }


# --------------------------------------------------
# HELPER: CREATE MERGED PR PAYLOAD
# --------------------------------------------------

def create_merged_pr_payload():

    return {
        "action": "closed",
        "number": 201,
        "repository": {
            "full_name": "Cisco/integration-test"
        },
        "pull_request": {
            "title": "Add authentication",
            "merged": True,
            "merged_at": "2026-11-11T14:30:00Z",
            "user": {
                "login": "developer123"
            },
            "merged_by": {
                "login": "manager123"
            }
        }
    }


# --------------------------------------------------
# HELPER: CREATE UNMERGED PR PAYLOAD
# --------------------------------------------------

def create_unmerged_pr_payload():

    return {
        "action": "closed",
        "number": 202,
        "repository": {
            "full_name": "Cisco/integration-test"
        },
        "pull_request": {
            "title": "Update documentation",
            "merged": False,
            "merged_at": None,
            "user": {
                "login": "developer456"
            },
            "merged_by": None
        }
    }


# --------------------------------------------------
# TEST 1: SAVE A MERGED PR IN POSTGRESQL
# --------------------------------------------------

def test_merged_pr_is_saved_in_postgresql(integration_client):

    test_client, TestingSessionLocal = integration_client

    payload = create_merged_pr_payload()

    body = json.dumps(payload).encode("utf-8")

    headers = create_headers(
        body,
        delivery_id="integration-merge-001"
    )

    # Send a real HTTP request through FastAPI.
    response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert response.status_code == 200

    # Open a separate database session to verify persistence.
    db = TestingSessionLocal()

    try:
        saved_event = db.query(PullRequestEvent).filter(
            PullRequestEvent.delivery_id == "integration-merge-001"
        ).first()

        assert saved_event is not None

        assert saved_event.repository == "Cisco/integration-test"
        assert saved_event.pr_number == 201
        assert saved_event.pr_title == "Add authentication"

        assert saved_event.author == "developer123"
        assert saved_event.merged_by == "manager123"

        assert saved_event.merged is True
        assert saved_event.merged_at is not None

        assert saved_event.delivery_id == "integration-merge-001"

    finally:
        db.close()


# --------------------------------------------------
# TEST 2: DUPLICATE WEBHOOK MUST NOT CREATE TWO ROWS
# --------------------------------------------------

def test_duplicate_webhook_creates_only_one_database_record(
    integration_client
):

    test_client, TestingSessionLocal = integration_client

    payload = create_merged_pr_payload()

    body = json.dumps(payload).encode("utf-8")

    headers = create_headers(
        body,
        delivery_id="integration-duplicate-001"
    )

    # First request: should insert the event.
    first_response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert first_response.status_code == 200

    assert (
        first_response.json()["message"]
        == "GitHub webhook received successfully."
    )

    # Second request: same delivery ID.
    second_response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert second_response.status_code == 200

    assert (
        second_response.json()["message"]
        == "Duplicate webhook delivery ignored."
    )

    # Verify the actual number of database records.
    db = TestingSessionLocal()

    try:
        record_count = db.query(PullRequestEvent).filter(
            PullRequestEvent.delivery_id == "integration-duplicate-001"
        ).count()

        assert record_count == 1

    finally:
        db.close()


# --------------------------------------------------
# TEST 3: SAVE A PR CLOSED WITHOUT MERGING
# --------------------------------------------------

def test_unmerged_pr_is_saved_correctly(integration_client):

    test_client, TestingSessionLocal = integration_client

    payload = create_unmerged_pr_payload()

    body = json.dumps(payload).encode("utf-8")

    headers = create_headers(
        body,
        delivery_id="integration-unmerged-001"
    )

    response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert response.status_code == 200

    db = TestingSessionLocal()

    try:
        saved_event = db.query(PullRequestEvent).filter(
            PullRequestEvent.delivery_id == "integration-unmerged-001"
        ).first()

        assert saved_event is not None

        assert saved_event.pr_number == 202
        assert saved_event.repository == "Cisco/integration-test"

        assert saved_event.merged is False
        assert saved_event.merged_at is None

        assert saved_event.author == "developer456"
        assert saved_event.merged_by is None

    finally:
        db.close()