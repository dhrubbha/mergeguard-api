import { useState, useRef, useEffect } from "react";
import { Filter, ChevronDown, Check, X, FolderGit2, Search } from "lucide-react";

export default function RepoSelect({
  selectedRepo = "",
  onSelectRepo,
  repositories = [],
  placeholder = "All Repositories",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const handleSelect = (repoName) => {
    if (onSelectRepo) {
      onSelectRepo(repoName);
    }
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onSelectRepo) {
      onSelectRepo("");
    }
  };

  const filteredRepos = repositories.filter((repo) => {
    const name = typeof repo === "string" ? repo : repo.name || "";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const currentRepoName = selectedRepo || placeholder;

  return (
    <div className="repo-select-wrapper" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`repo-select-trigger ${isOpen ? "open" : ""} ${selectedRepo ? "has-selection" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="trigger-left">
          <Filter size={14} className="repo-filter-icon" />
          <span className="trigger-label" title={currentRepoName}>
            {currentRepoName}
          </span>
        </div>

        <div className="trigger-actions">
          {selectedRepo && (
            <span
              role="button"
              tabIndex={0}
              className="clear-repo-btn"
              onClick={handleClear}
              onKeyDown={(e) => e.key === "Enter" && handleClear(e)}
              title="Clear repository filter"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={14} className={`chevron-icon ${isOpen ? "rotated" : ""}`} />
        </div>
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="repo-dropdown-menu">
          {repositories.length > 3 && (
            <div className="repo-search-box">
              <Search size={13} />
              <input
                type="text"
                placeholder="Filter repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="search-clear-mini"
                  onClick={() => setSearchTerm("")}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          <div className="repo-options-list" role="listbox">
            {/* All Repositories Option */}
            <div
              className={`repo-option-item ${!selectedRepo ? "selected" : ""}`}
              onClick={() => handleSelect("")}
              role="option"
              aria-selected={!selectedRepo}
            >
              <div className="option-name-group">
                <FolderGit2 size={14} color="#818cf8" />
                <span>{placeholder}</span>
              </div>
              <div className="option-meta">
                <span className="repo-count-pill">{repositories.length}</span>
                {!selectedRepo && <Check size={14} className="check-icon" />}
              </div>
            </div>

            <div className="repo-dropdown-divider" />

            {/* List of Repositories */}
            {filteredRepos.length === 0 ? (
              <div className="no-repos-found">
                No matching repositories found
              </div>
            ) : (
              filteredRepos.map((repo) => {
                const name = typeof repo === "string" ? repo : repo.name || "";
                const isSelected = selectedRepo === name;
                const prCount = typeof repo === "object" ? repo.total_prs : null;

                return (
                  <div
                    key={name}
                    className={`repo-option-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelect(name)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="option-name-group">
                      <FolderGit2 size={14} color={isSelected ? "#818cf8" : "#64748b"} />
                      <span className="repo-name-text" title={name}>
                        {name}
                      </span>
                    </div>

                    <div className="option-meta">
                      {prCount !== null && prCount !== undefined && (
                        <span className="repo-count-pill">
                          {prCount} {prCount === 1 ? "PR" : "PRs"}
                        </span>
                      )}
                      {isSelected && <Check size={14} className="check-icon" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

