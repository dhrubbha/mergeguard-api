import { useState, useEffect } from "react";

import {
  GitPullRequest,
  ArrowUpRight,
  Activity,
  CircleCheck,
  Clock,
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

import { getPullRequests } from "./services/api";

import {
  stats,
  activityData,
} from "./data/mockData";

import "./App.css";


// ==========================================
// OVERVIEW COMPONENT
// ==========================================

function Overview({ pullRequests, loading, error }) {
  return (
    <>
      {/* Welcome Section */}
      <div className="welcome-section">
        <div>
          <h2>Good afternoon, Admin 👋</h2>
          <p>
            Here's what's happening with your repositories today.
          </p>
        </div>

        <div className="live-indicator">
          <span />
          System operational
        </div>
      </div>


      {/* Statistics Cards */}
      <section className="stats-grid">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            stat={stat}
          />
        ))}
      </section>


      {/* Dashboard Charts and System Status */}
      <section className="dashboard-grid">

        {/* Pull Request Activity Chart */}
        <div className="panel activity-panel">

          <div className="panel-header">
            <div>
              <h3>Pull Request Activity</h3>
              <p>Weekly pull request overview</p>
            </div>

            <button className="filter-button">
              Last 7 days
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
                  <linearGradient
                    id="openedGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#818cf8"
                      stopOpacity={0.3}
                    />

                    <stop
                      offset="95%"
                      stopColor="#818cf8"
                      stopOpacity={0}
                    />
                  </linearGradient>

                  <linearGradient
                    id="mergedGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#34d399"
                      stopOpacity={0.25}
                    />

                    <stop
                      offset="95%"
                      stopColor="#34d399"
                      stopOpacity={0}
                    />
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


        {/* System Status */}
        <div className="panel status-panel">

          <div className="panel-header">
            <div>
              <h3>System Status</h3>
              <p>Application health</p>
            </div>

            <Activity
              size={20}
              color="#34d399"
            />
          </div>

          <div className="system-status">

            <CircleCheck
              size={22}
              color="#34d399"
            />

            <div>
              <strong>All systems operational</strong>
              <span>No reported issues</span>
            </div>

          </div>

          <div className="service-row">
            <span>FastAPI Backend</span>
            <span className="service-active">Operational</span>
          </div>

          <div className="service-row">
            <span>PostgreSQL Database</span>
            <span className="service-active">Operational</span>
          </div>

          <div className="service-row">
            <span>GitHub Webhooks</span>
            <span className="service-active">Operational</span>
          </div>

          <div className="service-row">
            <span>Event Processing</span>
            <span className="service-active">Operational</span>
          </div>

          <div className="uptime">
            <span>Last checked</span>
            <strong>Just now</strong>
          </div>

        </div>

      </section>


      {/* Recent Pull Requests */}
      <section className="panel recent-panel">

        <div className="panel-header">

          <div>
            <h3>Recent Pull Requests</h3>
            <p>Latest activity across your repositories</p>
          </div>

          <button className="view-all">
            View all <ArrowUpRight size={15} />
          </button>

        </div>


        {/* Loading State */}
        {loading ? (

          <p className="loading-message">
            Loading pull requests from backend...
          </p>

        ) : error ? (

          /* Error State */
          <p className="error-message">
            {error}
          </p>

        ) : pullRequests.length === 0 ? (

          /* Empty State */
          <p className="loading-message">
            No pull requests found.
          </p>

        ) : (

          /* Display API Data */
          <PullRequestTable
            pullRequests={pullRequests}
          />

        )}

      </section>


      {/* Footer */}
      <div className="footer-note">
        <Clock size={14} />
        Last dashboard refresh: Just now
      </div>

    </>
  );
}


// ==========================================
// PLACEHOLDER PAGE COMPONENT
// ==========================================

function PlaceholderPage({ title }) {
  return (
    <div className="panel placeholder-panel">

      <GitPullRequest size={36} />

      <h2>{title}</h2>

      <p>
        This section will be implemented next.
      </p>

    </div>
  );
}


// ==========================================
// MAIN APPLICATION COMPONENT
// ==========================================

export default function App() {

  // Sidebar navigation.
  const [activePage, setActivePage] = useState("Overview");

  // Store pull requests received from FastAPI.
  const [pullRequests, setPullRequests] = useState([]);

  // Track API loading.
  const [loading, setLoading] = useState(true);

  // Store API errors.
  const [error, setError] = useState("");


  // ========================================
  // FETCH PULL REQUESTS
  // ========================================

  useEffect(() => {

    async function fetchPullRequests() {

      try {

        setLoading(true);
        setError("");

        // Call the API service.
        const data = await getPullRequests();

        // Validate API response.
        if (!Array.isArray(data.pull_requests)) {
          throw new Error(
            "Invalid pull request API response."
          );
        }

        // Format backend data for React table.
        const formattedPRs = data.pull_requests.map((pr) => ({

          id: pr.id,

          number: pr.pr_number,

          title:
            pr.pr_title || `Pull Request #${pr.pr_number}`,

          repository: pr.repository,

          author: pr.author || "Unknown",

          // Determine the actual PR status.
          status: pr.merged
            ? "Merged"
            : pr.state === "open"
              ? "Open"
              : "Closed",

          // Source branch.
          headBranch: pr.head_branch || "Unknown",

          // Target branch.
          baseBranch: pr.base_branch || "Unknown",

          // GitHub pull request URL.
          htmlUrl: pr.html_url,

          // Last update timestamp.
          updated: pr.updated_at
            ? new Date(pr.updated_at).toLocaleString()
            : "Unknown",

        }));

        // Update React state.
        setPullRequests(formattedPRs);

      } catch (err) {

        console.error(
          "Dashboard API error:",
          err
        );

        setError(
          "Unable to load pull requests. Please check the backend connection."
        );

      } finally {

        setLoading(false);

      }

    }

    fetchPullRequests();

  }, []);


  // ========================================
  // APPLICATION LAYOUT
  // ========================================

  return (

    <div className="app-layout">

      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />


      {/* Main Content */}
      <main className="main-content">

        {/* Header */}
        <Header
          activePage={activePage}
        />


        {/* Page Content */}
        <div className="page-content">

          {activePage === "Overview" ? (

            <Overview
              pullRequests={pullRequests}
              loading={loading}
              error={error}
            />

          ) : (

            <PlaceholderPage
              title={activePage}
            />

          )}

        </div>

      </main>

    </div>

  );
}
