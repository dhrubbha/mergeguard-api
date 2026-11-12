import { useState, useEffect } from "react";
import {
  GitMerge,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserCheck,
} from "lucide-react";
import { getMergeHistory } from "../services/api";
import RepoSelect from "./RepoSelect";

export default function ReviewsPage({ repositories = [] }) {
  const [merges, setMerges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedRepo, setSelectedRepo] = useState("");
  const limit = 10;

  const fetchMerges = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getMergeHistory({
        repository: selectedRepo,
        page,
        limit,
      });
      setMerges(data.merge_history || []);
      setTotalRecords(data.total_records || 0);
    } catch (err) {
      console.error("Failed to load merge history:", err);
      setError("Unable to load reviews and merge history from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerges();
  }, [page, selectedRepo]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

  return (
    <div className="tab-page-container">
      {/* Top Filter Bar */}
      <div className="panel filter-bar-panel">
        <div className="filter-left">
          <RepoSelect
            selectedRepo={selectedRepo}
            onSelectRepo={(repo) => {
              setSelectedRepo(repo);
              setPage(1);
            }}
            repositories={repositories}
            placeholder="All Repositories"
          />
        </div>

        <div className="filter-right">
          <button className="secondary-btn" onClick={fetchMerges}>
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Reviews Panel */}
      <div className="panel content-panel">
        <div className="panel-header">
          <div>
            <h3>Merge History & Code Reviews</h3>
            <p>Pull requests that passed review and were merged into target branches</p>
          </div>
          <div className="badge-count green">
            <UserCheck size={14} /> {totalRecords} Merged PRs
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <RefreshCw size={24} className="spin" />
            <p>Loading merge history...</p>
          </div>
        ) : error ? (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={fetchMerges} className="retry-btn">
              Retry
            </button>
          </div>
        ) : merges.length === 0 ? (
          <div className="table-empty">
            <GitMerge size={32} />
            <p>No merge history records found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="pr-table">
              <thead>
                <tr>
                  <th>PULL REQUEST</th>
                  <th>REPOSITORY</th>
                  <th>AUTHOR</th>
                  <th>MERGED BY</th>
                  <th>MERGED AT</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {merges.map((item) => {
                  const prUrl = `https://github.com/${item.repository}/pull/${item.pr_number}`;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="pr-title">
                          <GitMerge size={17} color="#34d399" />
                          <div>
                            <a
                              href={prUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pr-title-link"
                            >
                              <strong>
                                {item.pr_title || `Pull Request #${item.pr_number}`}
                              </strong>
                            </a>
                            <span>#{item.pr_number}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="repository-name">{item.repository}</span>
                      </td>

                      <td>
                        <div className="author">
                          <div className="author-avatar">
                            {(item.author || "U").slice(0, 1).toUpperCase()}
                          </div>
                          <span>{item.author || "Unknown"}</span>
                        </div>
                      </td>

                      <td>
                        <div className="merged-by-badge">
                          <UserCheck size={13} />
                          <span>{item.merged_by || "Automated Merge"}</span>
                        </div>
                      </td>

                      <td>
                        <span className="updated-date">
                          {item.merged_at
                            ? new Date(item.merged_at).toLocaleString()
                            : "Recorded"}
                        </span>
                      </td>

                      <td>
                        <span className="status merged">
                          <span className="status-dot" />
                          Merged
                        </span>
                      </td>

                      <td>
                        <a
                          href={prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="row-action"
                          title="Open PR on GitHub"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="pagination-bar">
          <div className="pagination-info">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords} records)
          </div>

          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
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

