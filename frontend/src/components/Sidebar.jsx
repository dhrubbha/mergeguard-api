
import {
  LayoutDashboard,
  GitPullRequest,
  GitMerge,
  Users,
  Activity,
  Settings,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Pull Requests", icon: GitPullRequest },
  { label: "Reviews", icon: GitMerge },
  { label: "Collaborators", icon: Users },
  { label: "Activity Logs", icon: Activity },
];

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="sidebar">
      <div
        className="brand clickable"
        onClick={() => setActivePage("Overview")}
        role="button"
        title="Go to Overview"
      >
        <div className="brand-icon">
          <ShieldCheck size={23} />
        </div>

        <div>
          <h2>MergeGuard</h2>
          <span>PR MONITORING</span>
        </div>
      </div>

      <div className="workspace-label">WORKSPACE</div>

      <nav className="navigation">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              className={`nav-item ${
                activePage === item.label ? "active" : ""
              }`}
              onClick={() => setActivePage(item.label)}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button
          className={`nav-item ${
            activePage === "Settings" ? "active" : ""
          }`}
          onClick={() => setActivePage("Settings")}
        >
          <Settings size={19} />
          <span>Settings</span>
        </button>

        <div className="user-profile">
          <div className="user-avatar">DB</div>
          <div className="user-info">
            <strong>Admin User</strong>
            <span>Workspace owner</span>
          </div>
          <ChevronLeft size={17} />
        </div>
      </div>
    </aside>
  );
}
