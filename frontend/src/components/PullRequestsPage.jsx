import { useState } from "react";
import {
  GitPullRequest,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import PullRequestTable from "./PullRequestTable";
import RepoSelect from "./RepoSelect";

export default function PullRequestsPage({
  pullRequests = [],
  loading = false,
  error = "",
  totalRecords = 0,
  page = 1,
  setPage,
  limit = 10,
  filterState = "all",
  setFilterState,
  selectedRepo = "",
  setSelectedRepo,
  repositories = [],
  searchQuery = "",
  setSearchQuery,
  onRefresh,
  onOpenTestWebhook,
}) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

  return (
    <div className="tab-page-container">
      {/* Top Controls Bar */}
      <div className="panel filter-bar-panel">
        <div className="filter-left">
          {/* Status filter tabs */}
          <div className="filter-pill-group">
            {[
              { label: "All PRs", value: "all" },
              { label: "Open", value: "open" },
              { label: "Merged", value: "merged" },
              { label: "Closed", value: "closed" },
            ].map((tab) => (
              <button
                key={tab.value}
                className={`filter-pill ${filterState === tab.value ? "active" : ""}`}
                onClick={() => {
                  setFilterState && setFilterState(tab.value);
                  setPage && setPage(1);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Repository selector dropdown */}
          <RepoSelect
            selectedRepo={selectedRepo}
            onSelectRepo={(repo) => {
              setSelectedRepo && setSelectedRepo(repo);
              setPage && setPage(1);
            }}
            repositories={repositories}
            placeholder="All Repositories"
          />
        </div>

        <div className="filter-right">
          {/* Refresh button */}
          <button
            className="secondary-btn"
            onClick={onRefresh}
            title="Refresh pull requests"
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Refresh
          </button>

          {/* Test Webhook button */}
          <button
            className="primary-action-btn"
            onClick={onOpenTestWebhook}
            title="Simulate GitHub Webhook"
          >
            <Plus size={16} />
            Simulate Webhook
          </button>
        </div>
      </div>

      {/* Main PR Table Panel */}
      <div className="panel content-panel">
        <div className="panel-header">
          <div>
            <h3>Pull Requests Repository Overview</h3>
            <p>
              Showing {pullRequests.length} of {totalRecords} recorded pull requests
            </p>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <RefreshCw size={24} className="spin" />
            <p>Loading pull requests from database...</p>
          </div>
        ) : error ? (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={onRefresh} className="retry-btn">
              Retry
            </button>
          </div>
        ) : (
          <PullRequestTable pullRequests={pullRequests} />
        )}

        {/* Pagination Bar */}
        <div className="pagination-bar">
          <div className="pagination-info">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords} items)
          </div>

          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => setPage && setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage && setPage((p) => p + 1)}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

