import hashlib
import hmac
import json
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import settings
from backend.app.database.connection import get_db
from backend.app.models.pull_request import PullRequestEvent
from sqlalchemy.exc import IntegrityError


# --------------------------------------------------
# TEST CONFIGURATION
# --------------------------------------------------

TEST_SECRET = "test-webhook-secret-123456"


# --------------------------------------------------
# FIXTURE: CREATE A TEST CLIENT AND MOCK DATABASE
# --------------------------------------------------

@pytest.fixture
def client(monkeypatch):

    # Create a fake database session.
    mock_db = MagicMock()

    # By default, no previous webhook delivery exists.
    mock_db.query.return_value.filter.return_value.first.return_value = None

    # Use a predictable secret instead of the real .env secret.
    monkeypatch.setattr(
        settings,
        "GITHUB_WEBHOOK_SECRET",
        TEST_SECRET
    )

    # FastAPI will use this function instead of the real get_db().
    def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    # Create a client that can send HTTP requests to our app.
    with TestClient(app) as test_client:
        yield test_client, mock_db

    # Remove dependency overrides after each test.
    app.dependency_overrides.clear()


# --------------------------------------------------
# HELPER: GENERATE A VALID GITHUB SIGNATURE
# --------------------------------------------------

def generate_signature(payload_body):

    signature = hmac.new(
        key=TEST_SECRET.encode("utf-8"),
        msg=payload_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    return f"sha256={signature}"


# --------------------------------------------------
# HELPER: CREATE GITHUB WEBHOOK HEADERS
# --------------------------------------------------

def create_headers(
    payload_body,
    event_type="pull_request",
    delivery_id="test-delivery-001"
):

    return {
        "X-GitHub-Event": event_type,
        "X-GitHub-Delivery": delivery_id,
        "X-Hub-Signature-256": generate_signature(payload_body),
        "Content-Type": "application/json"
    }


# --------------------------------------------------
# HELPER: SAMPLE PULL REQUEST PAYLOAD
# --------------------------------------------------

def create_pull_request_payload():

    return {
        "action": "closed",
        "number": 101,
        "repository": {
            "full_name": "Cisco/demo-project"
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
# TEST 1: VALID WEBHOOK REQUEST
# --------------------------------------------------

def test_valid_pull_request_webhook(client):

    test_client, mock_db = client

    payload = create_pull_request_payload()
    body = json.dumps(payload).encode("utf-8")

    headers = create_headers(
        body,
        delivery_id="valid-delivery-001"
    )

    response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == "GitHub webhook received successfully."
    assert data["event"] == "pull_request"
    assert data["delivery_id"] == "valid-delivery-001"
    assert data["action"] == "closed"
    assert data["pull_request_number"] == 101
    assert data["repo"] == "Cisco/demo-project"

    assert data["processed_event"]["merged"] is True

    # Verify that the database session was used.
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once()

    # Inspect the object passed to the database.
    saved_event = mock_db.add.call_args[0][0]

    assert isinstance(saved_event, PullRequestEvent)
    assert saved_event.repository == "Cisco/demo-project"
    assert saved_event.pr_number == 101
    assert saved_event.author == "developer123"
    assert saved_event.merged_by == "manager123"
    assert saved_event.merged is True
    assert saved_event.delivery_id == "valid-delivery-001"


# --------------------------------------------------
# TEST 2: INVALID WEBHOOK SIGNATURE
# --------------------------------------------------

def test_invalid_webhook_signature(client):

    test_client, mock_db = client

    payload = create_pull_request_payload()
    body = json.dumps(payload).encode("utf-8")

    headers = create_headers(body)

    # Replace the valid signature with an invalid one.
    headers["X-Hub-Signature-256"] = "sha256=invalidsignature"

    response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid Github Webhook Signature."

    # Invalid requests must never reach database insertion.
    mock_db.add.assert_not_called()
    mock_db.commit.assert_not_called()


# --------------------------------------------------
# TEST 3: MISSING WEBHOOK SIGNATURE
# --------------------------------------------------

def test_missing_webhook_signature(client):

    test_client, mock_db = client

    payload = create_pull_request_payload()
    body = json.dumps(payload).encode("utf-8")

    headers = {
        "X-GitHub-Event": "pull_request",
        "X-GitHub-Delivery": "missing-signature-001",
        "Content-Type": "application/json"
    }

    response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid Github Webhook Signature."

    mock_db.add.assert_not_called()


# --------------------------------------------------
# TEST 4: MALFORMED JSON PAYLOAD
# --------------------------------------------------

def test_malformed_json_payload(client):

    test_client, mock_db = client

    # This is deliberately invalid JSON.
    body = b'{"action": "closed",'

    headers = create_headers(body)

    response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid JSON payload."

    mock_db.add.assert_not_called()


# --------------------------------------------------
# TEST 5: JSON PAYLOAD IS NOT AN OBJECT
# --------------------------------------------------

def test_non_object_json_payload(client):

    test_client, mock_db = client

    # A JSON array is valid JSON, but not a dictionary/object.
    body = json.dumps(["invalid", "payload"]).encode("utf-8")

    headers = create_headers(body)

    response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Webhook payload must be a JSON object."

    mock_db.add.assert_not_called()


# --------------------------------------------------
# TEST 6: MISSING GITHUB DELIVERY ID
# --------------------------------------------------

def test_missing_delivery_id(client):

    test_client, mock_db = client

    payload = create_pull_request_payload()
    body = json.dumps(payload).encode("utf-8")

    headers = {
        "X-GitHub-Event": "pull_request",
        "X-Hub-Signature-256": generate_signature(body),
        "Content-Type": "application/json"
    }

    response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Missing GitHub delivery ID."

    mock_db.add.assert_not_called()


# --------------------------------------------------
# TEST 7: DUPLICATE WEBHOOK DELIVERY
# --------------------------------------------------

def test_duplicate_webhook_delivery(client):

    test_client, mock_db = client

    # Simulate an event that already exists in the database.
    existing_event = PullRequestEvent(
        repository="Cisco/demo-project",
        pr_number=101,
        delivery_id="duplicate-delivery-001",
        merged=True
    )

    mock_db.query.return_value.filter.return_value.first.return_value = existing_event

    payload = create_pull_request_payload()
    body = json.dumps(payload).encode("utf-8")

    headers = create_headers(
        body,
        delivery_id="duplicate-delivery-001"
    )

    response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == "Duplicate webhook delivery ignored."
    assert data["delivery_id"] == "duplicate-delivery-001"

    # Duplicate events must not be inserted again.
    mock_db.add.assert_not_called()
    mock_db.commit.assert_not_called()


# --------------------------------------------------
# TEST 8: VALID PULL REQUEST REVIEW EVENT
# --------------------------------------------------

def test_pull_request_review_webhook(client):

    test_client, mock_db = client

    payload = {
        "action": "submitted",
        "number": 102,
        "review": {
            "state": "approved",
            "user": {
                "login": "manager123"
            }
        }
    }

    body = json.dumps(payload).encode("utf-8")

    headers = create_headers(
        body,
        event_type="pull_request_review",
        delivery_id="review-delivery-001"
    )

    response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert response.status_code == 200

    data = response.json()

    assert data["event"] == "pull_request_review"
    assert data["action"] == "submitted"
    assert data["pull_request_number"] == 102

    assert "manager123" in data["processed_event"]["message"]

    # Review events are processed but not stored as PR merge records.
    mock_db.add.assert_not_called()
    mock_db.commit.assert_not_called()

def test_missing_github_event_header(client):

    test_client, mock_db = client

    payload = create_pull_request_payload()
    body = json.dumps(payload).encode("utf-8")

    headers = {
        "X-GitHub-Delivery": "missing-event-001",
        "X-Hub-Signature-256": generate_signature(body),
        "Content-Type": "application/json"
    }

    response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Missing Github event header."
    )

    mock_db.add.assert_not_called()
    mock_db.commit.assert_not_called()


def test_database_integrity_error(client):

    test_client, mock_db = client

    payload = create_pull_request_payload()
    body = json.dumps(payload).encode("utf-8")

    headers = create_headers(
        body,
        delivery_id="integrity-error-001"
    )

    mock_db.commit.side_effect = IntegrityError(
        "INSERT",
        {},
        Exception("Unique constraint violation")
    )

    response = test_client.post(
        "/api/v1/github/webhook",
        content=body,
        headers=headers
    )

    assert response.status_code == 409

    assert response.json()["detail"] == (
        "Webhook event conflicts with an existing database record."
    )

    mock_db.rollback.assert_called_once()