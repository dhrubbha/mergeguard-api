import { useState, useEffect } from "react";
import {
  Activity,
  RefreshCw,
  GitBranch,
  GitMerge,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Hash,
} from "lucide-react";
import { getWebhookEvents } from "../services/api";

export default function ActivityLogsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getWebhookEvents({ page, limit });
      setEvents(data.events || []);
      setTotalRecords(data.total_records || 0);
    } catch (err) {
      console.error("Failed to load activity logs:", err);
      setError("Unable to load activity logs from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

  return (
    <div className="tab-page-container">
      {/* Top Filter Bar */}
      <div className="panel filter-bar-panel">
        <div className="filter-left">
          <div className="live-pill">
            <span className="live-dot" /> Live Webhook Stream
          </div>
        </div>

        <div className="filter-right">
          <button className="secondary-btn" onClick={fetchEvents}>
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Events Panel */}
      <div className="panel content-panel">
        <div className="panel-header">
          <div>
            <h3>Webhook Delivery & Ingestion Logs</h3>
            <p>Every GitHub webhook payload received and processed by MergeGuard</p>
          </div>
          <div className="badge-count blue">
            <Activity size={14} /> {totalRecords} Events Ingested
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <RefreshCw size={24} className="spin" />
            <p>Loading activity logs...</p>
          </div>
        ) : error ? (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={fetchEvents} className="retry-btn">
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="table-empty">
            <Activity size={32} />
            <p>No webhook activity logs recorded yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="pr-table">
              <thead>
                <tr>
                  <th>DELIVERY ID</th>
                  <th>REPOSITORY</th>
                  <th>PR #</th>
                  <th>ACTION / STATUS</th>
                  <th>AUTHOR</th>
                  <th>DELIVERED AT</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <div className="delivery-id-cell">
                        <Hash size={13} color="#818cf8" />
                        <code>{ev.delivery_id.slice(0, 18)}...</code>
                      </div>
                    </td>

                    <td>
                      <span className="repository-name">{ev.repository}</span>
                    </td>

                    <td>
                      <span className="pr-num-badge">#{ev.pr_number}</span>
                    </td>

                    <td>
                      <span
                        className={`status ${
                          ev.merged ? "merged" : "open"
                        }`}
                      >
                        <span className="status-dot" />
                        {ev.merged ? "Merged" : "Processed"}
                      </span>
                    </td>

                    <td>
                      <div className="author">
                        <div className="author-avatar">
                          {(ev.author || "U").slice(0, 1).toUpperCase()}
                        </div>
                        <span>{ev.author || "Unknown"}</span>
                      </div>
                    </td>

                    <td>
                      <span className="updated-date">
                        {ev.created_at
                          ? new Date(ev.created_at).toLocaleString()
                          : "Recorded"}
                      </span>
                    </td>
                  </tr>
                ))}
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

