import asyncio

from backend.app.services.github_services import get_pull_request


async def main():

    pull_request = await get_pull_request(
        owner="octocat",
        repo="Hello-World",
        pr_number=1
    )

    print("PR Number:", pull_request["number"])
    print("PR Title:", pull_request["title"])
    print("Author:", pull_request["user"]["login"])
    print("State:", pull_request["state"])
    print("Merged:", pull_request["merged"])
    print("Base Branch:", pull_request["base"]["ref"])
    print("Source Branch:", pull_request["head"]["ref"])

    if pull_request["merged"]:
        print("Merged By:", pull_request["merged_by"]["login"])
    else:
        print("This PR has not been merged.")


if __name__ == "__main__":
    asyncio.run(main())