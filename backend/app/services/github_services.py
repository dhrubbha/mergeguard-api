import httpx
from backend.app.config import settings

GITHUB_API_URL="https://api.github.com"

HEADERS = {
    "Accept":"application/vnd.github+json",
    "X-GitHub-Api-Version" : "2022-11-28",
    "User-Agent": "MergeGuard",
}



async def get_repository(owner : str, repo : str):
    url=f'{GITHUB_API_URL}/repos/{owner}/{repo}'

    async with httpx.AsyncClient(timeout=15.0) as client:

        try:
            response=await client.get(
                url,
                headers=HEADERS
            )

            response.raise_for_status()

            return response.json()
        except httpx.HTTPStatusError as error:
            raise RuntimeError(
                f'GitHub API returned HTTP {error.response.status_code}'
            ) from error
        
        except httpx.RequestError as error:
            raise RuntimeError(
                f'Unable to communicate with GitHub {error}'
            ) from error


async def get_pull_request(owner:str, repo:str, pr_number: int):
    
    url=(
        f"{GITHUB_API_URL}/repos/"
        f"{owner}/{repo}/pulls/{pr_number}"
    )

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response= await client.get(
                url,
                headers=HEADERS
            )
            response.raise_for_status()

            return response.json()

        except httpx.HTTPStatusError as error:
            raise RuntimeError(
                f"GitHub API returned HTTP {error.response.status_code}"
            ) from error
        except httpx.RequestError as error:
            raise RuntimeError(
                f"Unable to communicate with Github : {error}"
            ) from error