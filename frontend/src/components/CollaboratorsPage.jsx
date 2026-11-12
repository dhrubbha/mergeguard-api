import { useState, useEffect } from "react";
import { Users, GitPullRequest, GitMerge, Shield, RefreshCw, FolderGit2 } from "lucide-react";
import { getCollaborators } from "../services/api";

export default function CollaboratorsPage() {
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getCollaborators();
      setCollaborators(data || []);
    } catch (err) {
      console.error("Failed to load collaborators:", err);
      setError("Unable to load collaborators from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, []);

  const filtered = collaborators.filter((c) =>
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="tab-page-container">
      {/* Top Controls Bar */}
      <div className="panel filter-bar-panel">
        <div className="filter-left">
          <input
            className="filter-input"
            placeholder="Search collaborators by username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-right">
          <button className="secondary-btn" onClick={fetchCollaborators}>
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Grid Panel */}
      <div className="panel content-panel">
        <div className="panel-header">
          <div>
            <h3>Project Collaborators & Reviewers</h3>
            <p>Active developers contributing pull requests and code reviews</p>
          </div>
          <div className="badge-count purple">
            <Users size={14} /> {collaborators.length} Contributors
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <RefreshCw size={24} className="spin" />
            <p>Loading collaborators data...</p>
          </div>
        ) : error ? (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={fetchCollaborators} className="retry-btn">
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <Users size={32} />
            <p>No collaborators found.</p>
          </div>
        ) : (
          <div className="collaborators-grid">
            {filtered.map((collab) => (
              <div key={collab.username} className="collaborator-card">
                <div className="collab-top">
                  <div className="collab-avatar">
                    {collab.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="collab-meta">
                    <h4>{collab.username}</h4>
                    <span className={`role-badge ${collab.role.toLowerCase()}`}>
                      <Shield size={12} />
                      {collab.role}
                    </span>
                  </div>
                </div>

                <div className="collab-stats-row">
                  <div className="collab-stat">
                    <span className="collab-stat-label">
                      <GitPullRequest size={13} /> Created
                    </span>
                    <strong>{collab.total_prs}</strong>
                  </div>
                  <div className="collab-stat">
                    <span className="collab-stat-label">
                      <GitMerge size={13} color="#34d399" /> Merged
                    </span>
                    <strong style={{ color: "#34d399" }}>
                      {collab.merged_prs}
                    </strong>
                  </div>
                </div>

                {collab.repositories && collab.repositories.length > 0 && (
                  <div className="collab-repos">
                    <span className="repos-label">
                      <FolderGit2 size={12} /> Repositories:
                    </span>
                    <div className="repo-tags-list">
                      {collab.repositories.map((r) => (
                        <span key={r} className="repo-mini-tag">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

