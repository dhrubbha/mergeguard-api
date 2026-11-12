import { ExternalLink, GitPullRequest, GitMerge, UserCheck, Clock, XCircle } from "lucide-react";

export default function PullRequestTable({ pullRequests = [] }) {
  if (!pullRequests || pullRequests.length === 0) {
    return (
      <div className="table-empty">
        <GitPullRequest size={32} />
        <p>No pull requests found matching the current criteria.</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="pr-table">
        <thead>
          <tr>
            <th>PULL REQUEST</th>
            <th>REPOSITORY</th>
            <th>AUTHOR</th>
            <th>BRANCH</th>
            <th>STATUS</th>
            <th>MERGED BY</th>
            <th>UPDATED</th>
            <th>ACTION</th>
          </tr>
        </thead>

        <tbody>
          {pullRequests.map((pr) => {
            const statusKey = (pr.status || "open").toLowerCase();
            const prUrl =
              pr.htmlUrl ||
              (pr.repository && pr.number
                ? `https://github.com/${pr.repository}/pull/${pr.number}`
                : null);

            return (
              <tr key={pr.id || `${pr.repository}-${pr.number}`}>
                {/* Pull Request Title and Number */}
                <td>
                  <div className="pr-title">
                    {pr.merged ? (
                      <GitMerge size={17} color="#34d399" />
                    ) : (
                      <GitPullRequest size={17} color="#818cf8" />
                    )}

                    <div>
                      {prUrl ? (
                        <a
                          href={prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pr-title-link"
                          title="Open PR on GitHub"
                        >
                          <strong>{pr.title || `Pull Request #${pr.number}`}</strong>
                        </a>
                      ) : (
                        <strong>{pr.title || `Pull Request #${pr.number}`}</strong>
                      )}

                      <span>#{pr.number}</span>
                    </div>
                  </div>
                </td>

                {/* Repository */}
                <td>
                  <span className="repository-name">
                    {pr.repository}
                  </span>
                </td>

                {/* PR Author */}
                <td>
                  <div className="author">
                    <div className="author-avatar">
                      {(pr.author || "U").slice(0, 1).toUpperCase()}
                    </div>
                    <span>{pr.author || "Unknown"}</span>
                  </div>
                </td>

                {/* Source and Target Branch */}
                <td>
                  <div className="branch-info">
                    <span className="branch-badge head">
                      {pr.headBranch || "feature"}
                    </span>
                    <span className="branch-arrow">→</span>
                    <span className="branch-badge base">
                      {pr.baseBranch || "main"}
                    </span>
                  </div>
                </td>

                {/* PR Status */}
                <td>
                  <span className={`status ${statusKey}`}>
                    <span className="status-dot" />
                    {pr.status || (pr.merged ? "Merged" : "Open")}
                  </span>
                </td>

                {/* WHO MERGED THE PR */}
                <td>
                  {pr.merged ? (
                    <div className="merged-by-badge-table" title={`Merged by ${pr.mergedBy || pr.author || "Maintainer"}`}>
                      <div className="merged-by-avatar">
                        {(pr.mergedBy || pr.author || "M").slice(0, 1).toUpperCase()}
                      </div>
                      <span className="merged-by-name">
                        {pr.mergedBy || pr.author || "Maintainer"}
                      </span>
                    </div>
                  ) : pr.status === "Open" ? (
                    <span className="pending-merge-pill" title="PR is currently open and awaiting review/merge">
                      <Clock size={12} />
                      Pending
                    </span>
                  ) : (
                    <span className="unmerged-pill" title="PR was closed without merging">
                      <XCircle size={12} />
                      Closed
                    </span>
                  )}
                </td>

                {/* Last Updated */}
                <td>
                  <span className="updated-date">
                    {pr.updated || "Recently"}
                  </span>
                </td>

                {/* GitHub Link Action */}
                <td>
                  {prUrl ? (
                    <a
                      href={prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="row-action"
                      aria-label="Open pull request on GitHub"
                      title="Open on GitHub"
                    >
                      <ExternalLink size={16} />
                    </a>
                  ) : (
                    <span className="row-action-disabled">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
