def process_github_event(event_type: str, payload: dict):
    action=payload.get("action","unknown")

    pr_number=payload.get("number")

    repository=payload.get("repository") or {}
    repo_name= repository.get("full_name")


    pull_request=payload.get("pull_request") or {}
    author = (pull_request.get("user") or {}).get("login")

    merged_by = (pull_request.get("merged_by") or {}).get("login")

    merged_at = pull_request.get("merged_at")

    pr_title = pull_request.get("title")



    if event_type=="pull_request":
        if action == "opened":
            message=f'Pull Request #{pr_number} was created.'
        
        elif action == "synchronized":
            message=f'New commits were pushed to PR #{pr_number}.'
        
        elif action=="closed":
            pull_request=payload.get("pull_request", {})
            merged = pull_request.get("merged",False)

            if merged:
                message = f'Pull Request #{pr_number} was merged.'
            else:
                message = f'Pull Request #{pr_number} was closed without merging.'
        else:
            message = f'Unrecognized Pull Request action : {action}'

    elif event_type=="pull_request_review":
        review = payload.get("review",{})
        reviewer = review.get("user", {}).get("login", "Unknown")

        if action == "submitted" :
            state = review.get("state", "unknown")
            message = (
                f'{reviewer} submitted a review'
                f'for PR #{pr_number} : {state}'
                   )

        elif action =="dismissed":
            message=(
                f'A review for PR #{pr_number} was dismissed.'
            )
        else:
            message=f'Unrecognized review action : {action}'

    else:
        message=f'Unsupported GitHub event: {event_type}'

    return {
        "event": event_type,
        "action": action,
        "repository": repo_name,
        "pull_request_number": pr_number,
        "pull_request_title": pr_title,
        "author": author,
        "merged_by": merged_by,
        "merged_at": merged_at,
        "merged": pull_request.get("merged",False),
        "message": message
    }