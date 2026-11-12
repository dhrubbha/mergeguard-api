
import { ExternalLink, GitPullRequest } from "lucide-react";

export default function PullRequestTable({ pullRequests }) {
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
            <th>UPDATED</th>
            <th>ACTION</th>
          </tr>
        </thead>

        <tbody>
          {pullRequests.map((pr) => (

            <tr key={pr.id}>

              {/* Pull Request Title and Number */}
              <td>
                <div className="pr-title">
                  <GitPullRequest size={17} />

                  <div>
                    <strong>{pr.title}</strong>
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
                    {(pr.author || "U")
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>

                  {pr.author || "Unknown"}

                </div>
              </td>

              {/* Source and Target Branch */}
              <td>
                <div className="branch-info">

                  <span>
                    {pr.headBranch || "Unknown"}
                  </span>

                  <span className="branch-arrow">→</span>

                  <span>
                    {pr.baseBranch || "Unknown"}
                  </span>

                </div>
              </td>

              {/* PR Status */}
              <td>
                <span
                  className={`status ${pr.status.toLowerCase()}`}
                >
                  <span className="status-dot" />
                  {pr.status}
                </span>
              </td>

              {/* Last Updated */}
              <td>
                <span className="updated-date">
                  {pr.updated}
                </span>
              </td>

              {/* GitHub Link */}
              <td>
                {pr.htmlUrl ? (
                  <a
                    href={pr.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="row-action"
                    aria-label="Open pull request on GitHub"
                    title="Open on GitHub"
                  >
                    <ExternalLink size={16} />
                  </a>
                ) : (
                  <span className="row-action-disabled">
                    —
                  </span>
                )}
              </td>

            </tr>

          ))}

        </tbody>
      </table>
    </div>
  );
}
