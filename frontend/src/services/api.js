// Base URL configuration: uses Vite environment variable or falls back to http://localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Helper to perform fetch requests with error handling
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP Error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request error on ${url}:`, error);
    throw error;
  }
}

// Fetch pull requests with optional filtering and pagination
export async function getPullRequests(params = {}) {
  const query = new URLSearchParams();
  if (params.repository) query.append("repository", params.repository);
  if (params.state && params.state !== "all") query.append("state", params.state);
  if (params.search) query.append("search", params.search);
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);

  const qs = query.toString();
  return await request(`/api/v1/github/pull-requests${qs ? `?${qs}` : ""}`);
}

// Fetch merge history from GitHub events
export async function getMergeHistory(params = {}) {
  const query = new URLSearchParams();
  if (params.repository) query.append("repository", params.repository);
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);

  const qs = query.toString();
  return await request(`/api/v1/github/merges${qs ? `?${qs}` : ""}`);
}

// Fetch dashboard statistics (counts, activity chart, and system status)
export async function getDashboardStats(days = 7) {
  return await request(`/api/v1/github/stats?days=${days}`);
}

// Fetch raw webhook event history for Activity Logs
export async function getWebhookEvents(params = {}) {
  const query = new URLSearchParams();
  if (params.repository) query.append("repository", params.repository);
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);

  const qs = query.toString();
  return await request(`/api/v1/github/events${qs ? `?${qs}` : ""}`);
}

// Fetch collaborators list
export async function getCollaborators() {
  return await request("/api/v1/github/collaborators");
}

// Fetch tracked repositories
export async function getRepositories() {
  return await request("/api/v1/github/repositories");
}

// Health check endpoint
export async function getHealthCheck() {
  return await request("/health");
}

// API Configuration
export async function getApiConfig() {
  return await request("/api/v1/github/config");
}

// Trigger simulated/test GitHub webhook event
export async function triggerTestWebhook(payload) {
  return await request("/api/v1/github/test-webhook", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
