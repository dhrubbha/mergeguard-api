
import json
import hmac
import hashlib
import uuid
import requests

from backend.app.config import settings

url = "http://127.0.0.1:8000/api/v1/github/webhook"

payload = {
    "action": "opened",
    "number": 101,
    "repository": {
        "full_name": "demo/MergeGuardNotify"
    },
    "pull_request": {
        "number": 101,
        "title": "Test PR - Add authentication",
        "state": "open",
        "merged": False,
        "html_url": "https://github.com/demo/MergeGuardNotify/pull/101",
        "created_at": "2026-11-12T12:00:00Z",
        "updated_at": "2026-11-12T12:00:00Z",
        "closed_at": None,
        "merged_at": None,
        "user": {
            "login": "test-developer"
        },
        "merged_by": None,
        "head": {
            "ref": "feature/authentication"
        },
        "base": {
            "ref": "main"
        }
    }
}

body = json.dumps(payload).encode("utf-8")

signature = hmac.new(
    settings.GITHUB_WEBHOOK_SECRET.encode("utf-8"),
    body,
    hashlib.sha256
).hexdigest()

headers = {
    "Content-Type": "application/json",
    "X-GitHub-Event": "pull_request",
    "X-GitHub-Delivery": str(uuid.uuid4()),
    "X-Hub-Signature-256": f"sha256={signature}"
}

response = requests.post(
    url,
    data=body,
    headers=headers
)

print("Status:", response.status_code)
print("Response:", response.json())
