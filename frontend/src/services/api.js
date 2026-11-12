
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Fetch all pull requests from FastAPI.
export async function getPullRequests() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/github/pull-requests`
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error("Failed to fetch pull requests:", error);
    throw error;
  }
}
