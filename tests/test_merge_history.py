from datetime import datetime, timezone

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
# TEST DATABASE CONFIGURATION
# --------------------------------------------------

@pytest.fixture
def merge_history_client():

    # Step 1: Read the application's original database URL.
    original_url = make_url(settings.DATABASE_URL)

    # Step 2: Create a URL pointing to our dedicated test database.
    test_database_url = original_url.set(
        database="mergeguard_test_db"
    )

    # Step 3: Safety check before connecting.
    if test_database_url.database != "mergeguard_test_db":
        pytest.fail(
            "Tests must use the mergeguard_test_db database."
        )

    # Step 4: Create an engine connected to the test database.
    test_engine = create_engine(
        test_database_url,
        pool_pre_ping=True
    )

    # Step 5: Recreate tables in the test database.
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    # Step 6: Create database sessions.
    TestingSessionLocal = sessionmaker(
        bind=test_engine,
        autoflush=False,
        autocommit=False
    )

    # Step 7: Override FastAPI's database dependency.
    def override_get_db():

        db = TestingSessionLocal()

        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client, TestingSessionLocal

    finally:
        # Step 8: Remove the dependency override.
        app.dependency_overrides.clear()

        # Step 9: Clean up test tables.
        Base.metadata.drop_all(bind=test_engine)

        # Step 10: Close database connections.
        test_engine.dispose()


# --------------------------------------------------
# HELPER: SEED TEST DATA INTO POSTGRESQL
# --------------------------------------------------

def seed_pull_request_events(TestingSessionLocal):

    db = TestingSessionLocal()

    try:

        events = [

            # Merged PR 101
            PullRequestEvent(
                repository="Cisco/project-alpha",
                pr_number=101,
                pr_title="Add authentication",
                author="developer1",
                merged_by="manager1",
                merged=True,
                merged_at=datetime(
                    2026, 11, 10, 10, 0,
                    tzinfo=timezone.utc
                ),
                delivery_id="merge-history-101"
            ),

            # Merged PR 102
            PullRequestEvent(
                repository="Cisco/project-alpha",
                pr_number=102,
                pr_title="Improve API security",
                author="developer2",
                merged_by="manager2",
                merged=True,
                merged_at=datetime(
                    2026, 11, 11, 10, 0,
                    tzinfo=timezone.utc
                ),
                delivery_id="merge-history-102"
            ),

            # Merged PR 201
            PullRequestEvent(
                repository="Cisco/project-beta",
                pr_number=201,
                pr_title="Add database support",
                author="developer3",
                merged_by="manager3",
                merged=True,
                merged_at=datetime(
                    2026, 11, 12, 10, 0,
                    tzinfo=timezone.utc
                ),
                delivery_id="merge-history-201"
            ),

            # Merged PR 103
            PullRequestEvent(
                repository="Cisco/project-alpha",
                pr_number=103,
                pr_title="Fix login bug",
                author="developer4",
                merged_by="manager4",
                merged=True,
                merged_at=datetime(
                    2026, 11, 9, 10, 0,
                    tzinfo=timezone.utc
                ),
                delivery_id="merge-history-103"
            ),

            # Closed PR 202, NOT merged
            PullRequestEvent(
                repository="Cisco/project-beta",
                pr_number=202,
                pr_title="Incomplete feature",
                author="developer5",
                merged_by=None,
                merged=False,
                merged_at=None,
                delivery_id="merge-history-202"
            )
        ]

        db.add_all(events)
        db.commit()

    finally:
        db.close()


# --------------------------------------------------
# TEST 1: FETCH ALL MERGED PULL REQUESTS
# --------------------------------------------------

def test_get_all_merged_pull_requests(merge_history_client):

    client, TestingSessionLocal = merge_history_client

    seed_pull_request_events(TestingSessionLocal)

    response = client.get(
        "/api/v1/github/merges"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_records"] == 4
    assert data["page"] == 1
    assert data["limit"] == 10

    assert len(data["merge_history"]) == 4

    # Results should be ordered newest first.
    pr_numbers = [
        event["pr_number"]
        for event in data["merge_history"]
    ]

    assert pr_numbers == [201, 102, 101, 103]


# --------------------------------------------------
# TEST 2: FILTER MERGES BY REPOSITORY
# --------------------------------------------------

def test_filter_merges_by_repository(merge_history_client):

    client, TestingSessionLocal = merge_history_client

    seed_pull_request_events(TestingSessionLocal)

    response = client.get(
        "/api/v1/github/merges",
        params={
            "repository": "Cisco/project-alpha"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_records"] == 3
    assert len(data["merge_history"]) == 3

    for event in data["merge_history"]:
        assert event["repository"] == "Cisco/project-alpha"


# --------------------------------------------------
# TEST 3: PAGINATION
# --------------------------------------------------

def test_merge_history_pagination(merge_history_client):

    client, TestingSessionLocal = merge_history_client

    seed_pull_request_events(TestingSessionLocal)

    response = client.get(
        "/api/v1/github/merges",
        params={
            "page": 2,
            "limit": 2
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_records"] == 4
    assert data["page"] == 2
    assert data["limit"] == 2

    assert len(data["merge_history"]) == 2

    pr_numbers = [
        event["pr_number"]
        for event in data["merge_history"]
    ]

    assert pr_numbers == [101, 103]


# --------------------------------------------------
# TEST 4: EMPTY RESULTS
# --------------------------------------------------

def test_merge_history_empty_results(merge_history_client):

    client, TestingSessionLocal = merge_history_client

    seed_pull_request_events(TestingSessionLocal)

    response = client.get(
        "/api/v1/github/merges",
        params={
            "repository": "Cisco/nonexistent-project"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_records"] == 0
    assert data["merge_history"] == []


# --------------------------------------------------
# TEST 5: EXCLUDE PULL REQUESTS NOT MERGED
# --------------------------------------------------

def test_unmerged_pull_requests_are_excluded(merge_history_client):

    client, TestingSessionLocal = merge_history_client

    seed_pull_request_events(TestingSessionLocal)

    response = client.get(
        "/api/v1/github/merges",
        params={
            "repository": "Cisco/project-beta"
        }
    )

    assert response.status_code == 200

    data = response.json()

    # project-beta has one merged PR and one unmerged PR.
    assert data["total_records"] == 1
    assert len(data["merge_history"]) == 1

    assert data["merge_history"][0]["pr_number"] == 201
    assert data["merge_history"][0]["merged"] is True


# --------------------------------------------------
# TEST 6: RESPONSE SCHEMA AND DATA TYPES
# --------------------------------------------------

def test_merge_history_response_schema(merge_history_client):

    client, TestingSessionLocal = merge_history_client

    seed_pull_request_events(TestingSessionLocal)

    response = client.get(
        "/api/v1/github/merges"
    )

    assert response.status_code == 200

    data = response.json()

    # Validate top-level response structure.
    assert isinstance(data["total_records"], int)
    assert isinstance(data["page"], int)
    assert isinstance(data["limit"], int)
    assert isinstance(data["merge_history"], list)

    # Validate one returned PR record.
    event = data["merge_history"][0]

    assert isinstance(event["id"], int)
    assert isinstance(event["repository"], str)
    assert isinstance(event["pr_number"], int)
    assert isinstance(event["merged"], bool)

    assert isinstance(event["pr_title"], str)
    assert isinstance(event["author"], str)
    assert isinstance(event["merged_by"], str)
    assert isinstance(event["merged_at"], str)


# --------------------------------------------------
# TEST 7-9: INVALID PAGINATION PARAMETERS
# --------------------------------------------------

@pytest.mark.parametrize(
    "query_params",
    [
        {"page": 0},
        {"limit": 0},
        {"limit": 101}
    ]
)
def test_invalid_pagination_parameters(
    merge_history_client,
    query_params
):

    client, TestingSessionLocal = merge_history_client

    response = client.get(
        "/api/v1/github/merges",
        params=query_params
    )

    assert response.status_code == 422
