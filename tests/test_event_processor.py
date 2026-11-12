from backend.app.services.event_processor import process_github_event


def test_merged_pull_request():

    payload = {
        "action": "closed",
        "number": 25,
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

    result = process_github_event(
        event_type="pull_request",
        payload=payload
    )

    assert result["event"] == "pull_request"
    assert result["action"] == "closed"
    assert result["repository"] == "Cisco/demo-project"
    assert result["pull_request_number"] == 25
    assert result["author"] == "developer123"
    assert result["merged_by"] == "manager123"
    assert result["merged"] is True
    assert "merged" in result["message"].lower()

def test_closed_pull_request_without_merge():

    payload = {
        "action": "closed",
        "number": 26,
        "repository": {
            "full_name": "Cisco/demo-project"
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

    result = process_github_event(
        event_type="pull_request",
        payload=payload
    )

    assert result["event"] == "pull_request"
    assert result["action"] == "closed"
    assert result["pull_request_number"] == 26
    assert result["merged"] is False
    assert result["merged_at"] is None
    assert "without merging" in result["message"].lower()

def test_opened_pull_request():

    payload = {
        "action": "opened",
        "number": 27,
        "repository": {
            "full_name": "Cisco/demo-project"
        },
        "pull_request": {
            "title": "Add user authentication",
            "merged": False,
            "merged_at": None,
            "user": {
                "login": "developer789"
            }
        }
    }

    result = process_github_event(
        event_type="pull_request",
        payload=payload
    )

    assert result["event"] == "pull_request"
    assert result["action"] == "opened"
    assert result["repository"] == "Cisco/demo-project"
    assert result["pull_request_number"] == 27
    assert result["author"] == "developer789"
    assert "created" in result["message"].lower()

def test_synchronize_pull_request():

    payload = {
        "action": "synchronized",
        "number": 28,
        "repository": {
            "full_name": "Cisco/demo-project"
        },
        "pull_request": {
            "title": "Improve API authentication",
            "merged": False,
            "user": {
                "login": "developer123"
            }
        }
    }

    result = process_github_event(
        event_type="pull_request",
        payload=payload
    )

    assert result["event"] == "pull_request"
    assert result["action"] == "synchronized"
    assert result["pull_request_number"] == 28
    assert "new commits" in result["message"].lower()

def test_unsupported_github_event():

    payload = {
        "action": "created"
    }

    result = process_github_event(
        event_type="issues",
        payload=payload
    )

    assert result["event"] == "issues"
    assert result["action"] == "created"
    assert result["message"] == "Unsupported GitHub event: issues"

def test_submitted_pull_request_review():

    payload = {
        "action": "submitted",
        "number": 29,
        "review": {
            "state": "approved",
            "user": {
                "login": "manager123"
            }
        }
    }

    result = process_github_event(
        event_type="pull_request_review",
        payload=payload
    )

    assert result["event"] == "pull_request_review"
    assert result["action"] == "submitted"
    assert result["pull_request_number"] == 29
    assert "manager123" in result["message"]
    assert "approved" in result["message"].lower()

def test_dismissed_pull_request_review():

    payload = {
        "action": "dismissed",
        "number": 30,
        "review": {
            "state": "approved",
            "user": {
                "login": "manager123"
            }
        }
    }

    result = process_github_event(
        event_type="pull_request_review",
        payload=payload
    )

    assert result["event"] == "pull_request_review"
    assert result["action"] == "dismissed"
    assert result["pull_request_number"] == 30
    assert "dismissed" in result["message"].lower()