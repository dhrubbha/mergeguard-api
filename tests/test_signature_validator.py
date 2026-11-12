import hashlib
import hmac

from backend.app.services.signature_validator import(verify_github_signature)




def test_valid_github_signature():

    secret="test-secret"
    payload=b'{"action" : "opened" , "number" : 25}'

    expected_signature= "sha256=" + hmac.new(
        key=secret.encode("utf-8"),
        msg=payload,
        digestmod= hashlib.sha256
    ).hexdigest()
    
    result = verify_github_signature(
        payload_body= payload,
        signature_header= expected_signature,
        secret= secret
    )

    assert result is True

def test_invalid_signature():

    secret = "test-secret"
    payload = b'{"action":"opened","number":25}'

    result = verify_github_signature(
        payload_body=payload,
        signature_header="sha256=invalidsignature",
        secret=secret
    )

    assert result is False


def test_missing_signature():

    payload = b'{"action":"opened","number":25}'

    result = verify_github_signature(
        payload_body=payload,
        signature_header="",
        secret="test-secret"
    )

    assert result is False


def test_missing_secret():

    payload = b'{"action":"opened","number":25}'

    result = verify_github_signature(
        payload_body=payload,
        signature_header="sha256=something",
        secret=""
    )

    assert result is False


def test_modified_payload():

    secret = "test-secret"

    original_payload = b'{"action":"opened","number":25}'
    modified_payload = b'{"action":"opened","number":26}'

    original_signature = "sha256=" + hmac.new(
        key=secret.encode("utf-8"),
        msg=original_payload,
        digestmod=hashlib.sha256
    ).hexdigest()

    result = verify_github_signature(
        payload_body=modified_payload,
        signature_header=original_signature,
        secret=secret
    )

    assert result is False
