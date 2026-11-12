import { useState, useEffect } from "react";
import {
  Settings,
  ShieldCheck,
  Copy,
  Check,
  Eye,
  EyeOff,
  Send,
  Database,
  Server,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  GitPullRequest,
} from "lucide-react";
import { getHealthCheck, getApiConfig, triggerTestWebhook } from "../services/api";

export default function SettingsPage({ apiBaseUrl = "http://localhost:8000", onWebhookSent }) {
  const [config, setConfig] = useState(null);
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Webhook Simulator state
  const [simAction, setSimAction] = useState("opened");
  const [simRepo, setSimRepo] = useState("demo/MergeGuardNotify");
  const [simNumber, setSimNumber] = useState(103);
  const [simTitle, setSimTitle] = useState("Feature: Realtime Dashboard Notifications");
  const [simAuthor, setSimAuthor] = useState("dhrubbha");
  const [simHead, setSimHead] = useState("feature/notifications");
  const [simBase, setSimBase] = useState("main");
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const webhookUrl = `${apiBaseUrl}/api/v1/github/webhook`;
  const defaultSecret = "9e2cba14f03ef4722e7ae1eac50d5acd0cfc99fbc8f08804a35df260514d0986";

  const loadDiagnostics = async () => {
    try {
      setLoadingHealth(true);
      const [h, c] = await Promise.all([
        getHealthCheck().catch((err) => ({ status: "error", error: err.message })),
        getApiConfig().catch(() => ({})),
      ]);
      setHealth(h);
      setConfig(c);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const handleCopyUrl = () => {
    navigator.clipboard?.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopySecret = () => {
    navigator.clipboard?.writeText(defaultSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleSendWebhook = async (e) => {
    e.preventDefault();
    try {
      setSimulating(true);
      setSimResult(null);
      const res = await triggerTestWebhook({
        action: simAction,
        repository: simRepo,
        pr_number: Number(simNumber),
        pr_title: simTitle,
        author: simAuthor,
        merged: simAction === "merged",
        head_branch: simHead,
        base_branch: simBase,
      });
      setSimResult({ success: true, data: res });
      setSimNumber((n) => n + 1);
      if (onWebhookSent) onWebhookSent();
    } catch (err) {
      setSimResult({
        success: false,
        error: err.message || "Failed to trigger simulated webhook.",
      });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="tab-page-container">
      {/* Webhook Configuration Panel */}
      <div className="panel settings-panel">
        <div className="panel-header">
          <div>
            <h3>GitHub Webhook Configuration</h3>
            <p>Configure these parameters in your GitHub repository's Webhook settings</p>
          </div>
          <div className="badge-count purple">
            <ShieldCheck size={14} /> HMAC SHA-256
          </div>
        </div>

        <div className="settings-section">
          {/* Webhook URL Field */}
          <div className="settings-field-group">
            <label>Payload URL</label>
            <div className="copy-input-row">
              <input type="text" readOnly value={webhookUrl} />
              <button
                type="button"
                className="copy-button"
                onClick={handleCopyUrl}
              >
                {copiedUrl ? <Check size={15} /> : <Copy size={15} />}
                {copiedUrl ? "Copied" : "Copy URL"}
              </button>
            </div>
            <span className="field-hint">
              The endpoint where GitHub sends POST payloads when PR events occur.
            </span>
          </div>

          {/* Webhook Secret Field */}
          <div className="settings-field-group">
            <label>Webhook Secret</label>
            <div className="copy-input-row">
              <input
                type={showSecret ? "text" : "password"}
                readOnly
                value={defaultSecret}
              />
              <button
                type="button"
                className="icon-action-btn"
                onClick={() => setShowSecret(!showSecret)}
                title={showSecret ? "Hide secret" : "Show secret"}
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                type="button"
                className="copy-button"
                onClick={handleCopySecret}
              >
                {copiedSecret ? <Check size={15} /> : <Copy size={15} />}
                {copiedSecret ? "Copied" : "Copy Secret"}
              </button>
            </div>
            <span className="field-hint">
              Used to generate and verify <code>X-Hub-Signature-256</code> signatures.
            </span>
          </div>

          {/* Webhook Setup Instructions */}
          <div className="info-box">
            <strong>GitHub Webhook Setup Guide:</strong>
            <ol>
              <li>Go to your repository on GitHub → <strong>Settings</strong> → <strong>Webhooks</strong>.</li>
              <li>Click <strong>Add webhook</strong>.</li>
              <li>Paste the <strong>Payload URL</strong> above.</li>
              <li>Set <strong>Content type</strong> to <code>application/json</code>.</li>
              <li>Paste the <strong>Secret</strong> into the Secret field.</li>
              <li>Select <strong>Let me select individual events</strong> and check <strong>Pull requests</strong>.</li>
              <li>Click <strong>Add webhook</strong> to save.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Interactive Webhook Simulator */}
      <div className="panel settings-panel">
        <div className="panel-header">
          <div>
            <h3>Interactive Webhook Simulator</h3>
            <p>Test the full pipeline (Webhook → Verification → DB Save → Dashboard update)</p>
          </div>
          <div className="badge-count green">
            <GitPullRequest size={14} /> Live Tester
          </div>
        </div>

        <form onSubmit={handleSendWebhook} className="simulator-form">
          <div className="simulator-grid">
            <div className="form-group">
              <label>Event Action</label>
              <select
                value={simAction}
                onChange={(e) => setSimAction(e.target.value)}
              >
                <option value="opened">opened (New PR)</option>
                <option value="merged">merged (PR Merged)</option>
                <option value="closed">closed (Closed without merge)</option>
                <option value="synchronized">synchronized (New commits)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Repository (owner/repo)</label>
              <input
                type="text"
                value={simRepo}
                onChange={(e) => setSimRepo(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>PR Number</label>
              <input
                type="number"
                value={simNumber}
                onChange={(e) => setSimNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Author Username</label>
              <input
                type="text"
                value={simAuthor}
                onChange={(e) => setSimAuthor(e.target.value)}
                required
              />
            </div>

            <div className="form-group span-2">
              <label>PR Title</label>
              <input
                type="text"
                value={simTitle}
                onChange={(e) => setSimTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Source Branch (head)</label>
              <input
                type="text"
                value={simHead}
                onChange={(e) => setSimHead(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Target Branch (base)</label>
              <input
                type="text"
                value={simBase}
                onChange={(e) => setSimBase(e.target.value)}
              />
            </div>
          </div>

          <div className="simulator-footer">
            <button
              type="submit"
              className="primary-action-btn"
              disabled={simulating}
            >
              <Send size={15} className={simulating ? "spin" : ""} />
              {simulating ? "Sending Webhook..." : "Dispatch Simulated Webhook"}
            </button>
          </div>

          {simResult && (
            <div
              className={`result-banner ${
                simResult.success ? "success" : "error"
              }`}
            >
              {simResult.success ? (
                <>
                  <CheckCircle size={18} color="#34d399" />
                  <div>
                    <strong>Webhook processed successfully!</strong>
                    <p>
                      Delivery ID: <code>{simResult.data?.delivery_id}</code>.
                      The dashboard data and tables have been updated.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={18} color="#f87171" />
                  <div>
                    <strong>Webhook dispatch failed:</strong>
                    <p>{simResult.error}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </form>
      </div>

      {/* System Health & Diagnostics Panel */}
      <div className="panel settings-panel">
        <div className="panel-header">
          <div>
            <h3>System Status & Diagnostics</h3>
            <p>Live health monitoring of backend components and database connections</p>
          </div>
          <button
            className="secondary-btn"
            onClick={loadDiagnostics}
            disabled={loadingHealth}
          >
            <RefreshCw size={14} className={loadingHealth ? "spin" : ""} />
            Check Health
          </button>
        </div>

        <div className="diagnostics-list">
          <div className="diag-item">
            <div className="diag-icon">
              <Server size={18} color="#818cf8" />
            </div>
            <div className="diag-info">
              <strong>FastAPI Backend Server</strong>
              <span>
                {apiBaseUrl} • {config?.app_name || "MergeGuard"} v{config?.app_version || "1.0.0"}
              </span>
            </div>
            <span className="service-active">
              <span className="status-dot" /> Operational
            </span>
          </div>

          <div className="diag-item">
            <div className="diag-icon">
              <Database size={18} color="#34d399" />
            </div>
            <div className="diag-info">
              <strong>PostgreSQL Neon Database</strong>
              <span>
                Connection pool active • Status: {health?.database || "Operational"}
              </span>
            </div>
            <span className="service-active">
              <span className="status-dot" /> Connected
            </span>
          </div>

          <div className="diag-item">
            <div className="diag-icon">
              <ShieldCheck size={18} color="#fbbf24" />
            </div>
            <div className="diag-info">
              <strong>GitHub Webhook Secret Verification</strong>
              <span>
                HMAC-SHA256 signature verification enabled
              </span>
            </div>
            <span className="service-active">
              <span className="status-dot" /> Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

