import { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  Plus,
  Check,
  Copy,
  X,
  ExternalLink,
  ShieldAlert,
  GitBranch,
} from "lucide-react";

export default function Header({
  activePage,
  setActivePage,
  searchQuery,
  setSearchQuery,
  notifications = [],
  onClearNotifications,
  onAddRepository,
  apiBaseUrl = "http://localhost:8000",
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddRepoModal, setShowAddRepoModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const searchInputRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const webhookEndpoint = `${apiBaseUrl}/api/v1/github/webhook`;

  // Keyboard shortcut: Ctrl+K or Cmd+K to focus search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyWebhook = () => {
    navigator.clipboard?.writeText(webhookEndpoint);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleAddRepoSubmit = (e) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;
    if (onAddRepository) {
      onAddRepository(newRepoName.trim());
    }
    setNewRepoName("");
    setShowAddRepoModal(false);
  };

  return (
    <header className="top-header">
      <div>
        <div className="breadcrumb">Workspace / {activePage}</div>
        <h1>{activePage}</h1>
      </div>

      <div className="header-actions">
        {/* Search Box */}
        <div className="search-box">
          <Search size={17} />
          <input
            ref={searchInputRef}
            placeholder="Search PR, repo, author..."
            value={searchQuery || ""}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery && setSearchQuery("")}
              title="Clear search"
            >
              <X size={12} />
            </button>
          ) : (
            <kbd>⌘ K</kbd>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative-container" ref={notifRef}>
          <button
            className={`icon-button ${showNotifications ? "active" : ""}`}
            aria-label="Notifications"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
          >
            <Bell size={19} />
            {notifications.length > 0 && <span className="notification-dot" />}
          </button>

          {showNotifications && (
            <div className="dropdown-menu notifications-menu">
              <div className="dropdown-header">
                <div>
                  <strong>Notifications</strong>
                  <span className="badge-count">{notifications.length} events</span>
                </div>
                {notifications.length > 0 && onClearNotifications && (
                  <button
                    className="text-action-btn"
                    onClick={onClearNotifications}
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="dropdown-body">
                {notifications.length === 0 ? (
                  <div className="dropdown-empty">
                    <p>No new notifications</p>
                    <span>Webhook events will appear here</span>
                  </div>
                ) : (
                  notifications.map((item, idx) => (
                    <div key={idx} className="notification-item">
                      <div className={`notif-icon ${item.merged ? "green" : "blue"}`}>
                        <GitBranch size={14} />
                      </div>
                      <div className="notif-content">
                        <div className="notif-title">
                          <strong>{item.repository}</strong>
                          <span>#{item.pr_number}</span>
                        </div>
                        <p>{item.pr_title || item.message || "Pull request activity"}</p>
                        <time>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleTimeString()
                            : "Just now"}
                        </time>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="dropdown-footer">
                <button
                  className="full-width-btn"
                  onClick={() => {
                    setActivePage && setActivePage("Activity Logs");
                    setShowNotifications(false);
                  }}
                >
                  View all activity logs →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Repository Button & Modal */}
        <button
          className="add-repository"
          onClick={() => setShowAddRepoModal(true)}
          title="Add or track a repository"
        >
          <Plus size={17} />
          Add Repository
        </button>

        {/* Profile Popover */}
        <div className="relative-container" ref={profileRef}>
          <button
            className="profile-button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
          >
            DB
            <ChevronDown size={15} />
          </button>

          {showProfileMenu && (
            <div className="dropdown-menu profile-menu">
              <div className="profile-header-info">
                <strong>Admin User</strong>
                <span>admin@mergeguard.io</span>
                <span className="role-tag">Workspace Owner</span>
              </div>
              <div className="menu-divider" />
              <button
                className="dropdown-item"
                onClick={() => {
                  setActivePage && setActivePage("Overview");
                  setShowProfileMenu(false);
                }}
              >
                Dashboard Overview
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setActivePage && setActivePage("Pull Requests");
                  setShowProfileMenu(false);
                }}
              >
                Pull Requests
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setActivePage && setActivePage("Settings");
                  setShowProfileMenu(false);
                }}
              >
                Settings & Webhooks
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Repository Modal */}
      {showAddRepoModal && (
        <div className="modal-backdrop" onClick={() => setShowAddRepoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <div className="brand-icon small">
                  <Plus size={18} />
                </div>
                <div>
                  <h3>Add Repository to Monitor</h3>
                  <p>Configure webhook forwarding for automatic PR tracking</p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowAddRepoModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRepoSubmit} className="modal-body">
              <div className="form-group">
                <label>Repository Full Name (owner/repo)</label>
                <input
                  type="text"
                  placeholder="e.g. octocat/Hello-World or myorg/myrepo"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="webhook-guide-box">
                <label>GitHub Webhook Payload URL</label>
                <div className="copy-input-row">
                  <input
                    type="text"
                    readOnly
                    value={webhookEndpoint}
                  />
                  <button
                    type="button"
                    className="copy-button"
                    onClick={handleCopyWebhook}
                  >
                    {copiedWebhook ? <Check size={16} /> : <Copy size={16} />}
                    {copiedWebhook ? "Copied" : "Copy"}
                  </button>
                </div>
                <span className="help-text">
                  Paste this URL in your GitHub repository <strong>Settings → Webhooks</strong>. Choose <code>application/json</code> as content type.
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowAddRepoModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Track Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
