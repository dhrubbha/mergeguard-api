
import { Search, Bell, ChevronDown, Plus } from "lucide-react";

export default function Header({ activePage }) {
  return (
    <header className="top-header">
      <div>
        <div className="breadcrumb">Workspace / {activePage}</div>
        <h1>{activePage}</h1>
      </div>

      <div className="header-actions">
        <div className="search-box">
          <Search size={17} />
          <input placeholder="Search anything..." />
          <kbd>⌘ K</kbd>
        </div>

        <button className="icon-button" aria-label="Notifications">
          <Bell size={19} />
          <span className="notification-dot" />
        </button>

        <button className="add-repository">
          <Plus size={17} />
          Add Repository
        </button>

        <button className="profile-button">
          DB
          <ChevronDown size={15} />
        </button>
      </div>
    </header>
  );
}