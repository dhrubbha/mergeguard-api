import { useState, useEffect, useCallback } from "react";
import {
  GitPullRequest,
  ArrowUpRight,
  Activity,
  CircleCheck,
  Clock,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatCard from "./components/StatCard";
import PullRequestTable from "./components/PullRequestTable";
import PullRequestsPage from "./components/PullRequestsPage";
import ReviewsPage from "./components/ReviewsPage";
import CollaboratorsPage from "./components/CollaboratorsPage";
import ActivityLogsPage from "./components/ActivityLogsPage";
import SettingsPage from "./components/SettingsPage";

import {
  getPullRequests,
  getDashboardStats,
  getWebhookEvents,
  getRepositories,
  getHealthCheck,
} from "./services/api";

import "./App.css";

// ==========================================
// OVERVIEW COMPONENT
// ==========================================

function Overview({
  pullRequests,
  loading,
  error,
  statsData,
  activityData,
  chartDays,
  setChartDays,
  systemStatus,
  lastRefreshTime,
  onViewAllPRs,
  onRefresh,
}) {
  // Dynamic greeting based on current time of day
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
        ? "Good afternoon"
        : "Good evening";

  // Stat cards structure with dynamic values and trend calculations from backend
  const statCards = [
    {
      title: "Total Pull Requests",
      value: String(statsData.total_pull_requests ?? pullRequests.length),
      change: statsData.changes?.total || "+0.0%",
      icon: "git-pull-request",
      color: "purple",
    },
    {
      title: "Open Pull Requests",
      value: String(statsData.open_pull_requests ?? 0),
      change: statsData.changes?.open || "+0.0%",
      icon: "git-branch",
      color: "blue",
    },
    {
      title: "Merged Pull Requests",
      value: String(statsData.merged_pull_requests ?? 0),
      change: statsData.changes?.merged || "+0.0%",
      icon: "git-merge",
      color: "green",
    },
    {
      title: "Pending Reviews",
      value: String(statsData.pending_reviews ?? 0),
      change: statsData.changes?.reviews || "+0.0%",
      icon: "clock",
      color: "orange",
    },
  ];

  return (
    <>
      {/* Welcome Section */}
      <div className="welcome-section">
        <div>
          <h2>{greeting}, Admin </h2>
          <p>Here's what's happening with your repositories today.</p>
        </div>

        <div className="live-indicator-wrapper">
          <div className="live-indicator">
            <span />
            {systemStatus?.backend === "Operational"
              ? "System operational"
              : "System degraded"}
          </div>
          <button
            className="quick-refresh-btn"
            onClick={onRefresh}
            title="Refresh dashboard data"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <section className="stats-grid">
        {statCards.map((stat) => (
          <StatCard key={stat.title} stat={stat} />
        ))}
      </section>

      {/* Dashboard Charts and System Status */}
      <section className="dashboard-grid">
        {/* Pull Request Activity Chart */}
        <div className="panel activity-panel">
          <div className="panel-header">
            <div>
              <h3>Pull Request Activity</h3>
              <p>Weekly pull request activity breakdown</p>
            </div>

            {/* Functional Toggle Button for 7 vs 30 days */}
            <button
              className="filter-button"
              onClick={() => setChartDays(chartDays === 7 ? 30 : 7)}
              title="Click to toggle time range"
            >
              {chartDays === 7 ? "Last 7 days" : "Last 30 days"}
            </button>
          </div>

          <div className="chart-legend">
            <span>
              <i className="legend-open" /> Opened
            </span>
            <span>
              <i className="legend-merged" /> Merged
            </span>
          </div>

          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="openedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient id="mergedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#273449"
                  strokeDasharray="4 4"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  stroke="#7f8ba3"
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  stroke="#7f8ba3"
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  contentStyle={{
                    background: "#172033",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                    color: "#fff",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="opened"
                  stroke="#818cf8"
                  strokeWidth={2}
                  fill="url(#openedGradient)"
                />

                <Area
                  type="monotone"
                  dataKey="merged"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#mergedGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Status Panel */}
        <div className="panel status-panel">
          <div className="panel-header">
            <div>
              <h3>System Status</h3>
              <p>Application health & microservices</p>
            </div>

            <Activity size={20} color="#34d399" />
          </div>

          <div className="system-status">
            <CircleCheck size={22} color="#34d399" />
            <div>
              <strong>All systems operational</strong>
              <span>No reported incidents</span>
            </div>
          </div>

          <div className="service-row">
            <span>FastAPI Backend</span>
            <span className="service-active">
              {systemStatus?.backend || "Operational"}
            </span>
          </div>

          <div className="service-row">
            <span>PostgreSQL Neon Database</span>
            <span className="service-active">
              {systemStatus?.database || "Operational"}
            </span>
          </div>

          <div className="service-row">
            <span>GitHub Webhooks</span>
            <span className="service-active">
              {systemStatus?.webhooks || "Operational"}
            </span>
          </div>

          <div className="service-row">
            <span>Event Processing</span>
            <span className="service-active">
              {systemStatus?.event_processing || "Operational"}
            </span>
          </div>

          <div className="uptime">
            <span>Last checked</span>
            <strong>{lastRefreshTime}</strong>
          </div>
        </div>
      </section>

      {/* Recent Pull Requests */}
      <section className="panel recent-panel">
        <div className="panel-header">
          <div>
            <h3>Recent Pull Requests</h3>
            <p>Latest pull request activity across monitored repositories (includes who merged)</p>
          </div>

          {/* Functional View All Button */}
          <button
            className="view-all"
            onClick={onViewAllPRs}
            title="View all pull requests"
          >
            View all <ArrowUpRight size={15} />
          </button>
        </div>

        {/* Loading / Error / Table State */}
        {loading ? (
          <p className="loading-message">Loading pull requests from backend...</p>
        ) : error ? (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={onRefresh} className="retry-btn">
              Retry
            </button>
          </div>
        ) : pullRequests.length === 0 ? (
          <p className="loading-message">No pull requests found.</p>
        ) : (
          <PullRequestTable pullRequests={pullRequests.slice(0, 5)} />
        )}
      </section>

      {/* Footer with dynamic refresh */}
      <div className="footer-note">
        <Clock size={14} />
        <span>Last dashboard refresh: {lastRefreshTime}</span>
        <button
          className="footer-refresh-btn"
          onClick={onRefresh}
          title="Refresh dashboard"
        >
          <RefreshCw size={12} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>
    </>
  );
}

// ==========================================
// MAIN APPLICATION COMPONENT
// ==========================================

export default function App() {
  // Navigation active page
  const [activePage, setActivePage] = useState("Overview");

  // Pull Requests data
  const [pullRequests, setPullRequests] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [filterState, setFilterState] = useState("all");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date().toLocaleTimeString());

  // Dashboard Stats & Chart Data
  const [statsData, setStatsData] = useState({
    total_pull_requests: 0,
    open_pull_requests: 0,
    merged_pull_requests: 0,
    pending_reviews: 0,
    changes: {},
  });
  const [activityData, setActivityData] = useState([]);
  const [chartDays, setChartDays] = useState(7);
  const [systemStatus, setSystemStatus] = useState(null);

  // Repositories & Notifications
  const [repositories, setRepositories] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Base URL
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  // ========================================
  // FETCH PULL REQUESTS
  // ========================================

  const fetchPRs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getPullRequests({
        repository: selectedRepo,
        state: filterState,
        search: searchQuery,
        page,
        limit: 10,
      });

      if (!Array.isArray(data.pull_requests)) {
        throw new Error("Invalid pull request API response.");
      }

      const formatted = data.pull_requests.map((pr) => ({
        id: pr.id,
        number: pr.pr_number,
        title: pr.pr_title || `Pull Request #${pr.pr_number}`,
        repository: pr.repository,
        author: pr.author || "Unknown",
        merged: pr.merged,
        // DYNAMIC: Include who merged the PR
        mergedBy: pr.merged_by || (pr.merged ? pr.author : null),
        mergedAt: pr.merged_at ? new Date(pr.merged_at).toLocaleString() : null,
        status: pr.merged
          ? "Merged"
          : pr.state === "open"
            ? "Open"
            : "Closed",
        headBranch: pr.head_branch || "feature",
        baseBranch: pr.base_branch || "main",
        htmlUrl:
          pr.html_url ||
          (pr.repository && pr.pr_number
            ? `https://github.com/${pr.repository}/pull/${pr.pr_number}`
            : null),
        updated: pr.updated_at
          ? new Date(pr.updated_at).toLocaleString()
          : pr.last_synced_at
            ? new Date(pr.last_synced_at).toLocaleString()
            : "Recently",
      }));

      setPullRequests(formatted);
      setTotalRecords(data.total_records || formatted.length);
      setLastRefreshTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Dashboard API error:", err);
      setError("Unable to load pull requests. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  }, [selectedRepo, filterState, searchQuery, page]);

  // ========================================
  // FETCH DASHBOARD STATS & REPOSITORIES
  // ========================================

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, reposRes, eventsRes, healthRes] = await Promise.all([
        getDashboardStats(chartDays).catch(() => null),
        getRepositories().catch(() => []),
        getWebhookEvents({ limit: 10 }).catch(() => ({ events: [] })),
        getHealthCheck().catch(() => null),
      ]);

      if (statsRes) {
        setStatsData(statsRes);
        if (Array.isArray(statsRes.activity_data)) {
          setActivityData(statsRes.activity_data);
        }
        if (statsRes.system_status) {
          setSystemStatus(statsRes.system_status);
        }
      }

      if (Array.isArray(reposRes)) {
        setRepositories(reposRes);
      }

      if (eventsRes && Array.isArray(eventsRes.events)) {
        setNotifications(eventsRes.events);
      }

      if (healthRes && !systemStatus) {
        setSystemStatus({
          backend: healthRes.status === "healthy" ? "Operational" : "Degraded",
          database: healthRes.database || "Operational",
          webhooks: "Operational",
          event_processing: "Operational",
          last_checked: new Date().toISOString(),
        });
      }
      setLastRefreshTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    }
  }, [chartDays]);

  // Initial load
  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Add Repository Handler
  const handleAddRepository = (repoName) => {
    if (!repoName) return;
    setRepositories((prev) => {
      if (prev.some((r) => (r.name || r) === repoName)) return prev;
      return [...prev, { name: repoName, open_prs: 0, merged_prs: 0, total_prs: 0 }];
    });
    setSelectedRepo(repoName);
    setActivePage("Pull Requests");
  };

  // Clear Notifications Handler
  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Combined Refresh Handler
  const handleRefreshAll = () => {
    fetchPRs();
    fetchDashboardData();
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <Header
          activePage={activePage}
          setActivePage={setActivePage}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          notifications={notifications}
          onClearNotifications={handleClearNotifications}
          onAddRepository={handleAddRepository}
          apiBaseUrl={apiBaseUrl}
        />

        {/* Dynamic Page Views */}
        <div className="page-content">
          {activePage === "Overview" && (
            <Overview
              pullRequests={pullRequests}
              loading={loading}
              error={error}
              statsData={statsData}
              activityData={activityData}
              chartDays={chartDays}
              setChartDays={setChartDays}
              systemStatus={systemStatus}
              lastRefreshTime={lastRefreshTime}
              onViewAllPRs={() => setActivePage("Pull Requests")}
              onRefresh={handleRefreshAll}
            />
          )}

          {activePage === "Pull Requests" && (
            <PullRequestsPage
              pullRequests={pullRequests}
              loading={loading}
              error={error}
              totalRecords={totalRecords}
              page={page}
              setPage={setPage}
              limit={10}
              filterState={filterState}
              setFilterState={setFilterState}
              selectedRepo={selectedRepo}
              setSelectedRepo={setSelectedRepo}
              repositories={repositories}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onRefresh={fetchPRs}
              onOpenTestWebhook={() => setActivePage("Settings")}
            />
          )}

          {activePage === "Reviews" && (
            <ReviewsPage repositories={repositories} />
          )}

          {activePage === "Collaborators" && (
            <CollaboratorsPage />
          )}

          {activePage === "Activity Logs" && (
            <ActivityLogsPage />
          )}

          {activePage === "Settings" && (
            <SettingsPage
              apiBaseUrl={apiBaseUrl}
              onWebhookSent={handleRefreshAll}
            />
          )}
        </div>
      </main>
    </div>
  );
}
