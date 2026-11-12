
import {
  GitPullRequest,
  GitBranch,
  GitMerge,
  Clock,
  TrendingUp,
} from "lucide-react";

const iconMap = {
  "git-pull-request": GitPullRequest,
  "git-branch": GitBranch,
  "git-merge": GitMerge,
  clock: Clock,
};

export default function StatCard({ stat }) {
  const Icon = iconMap[stat.icon];

  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{stat.title}</span>

        <div className={`stat-icon ${stat.color}`}>
          <Icon size={20} />
        </div>
      </div>

      <div className="stat-value">{stat.value}</div>

      <div className="stat-footer">
        <span className="stat-change">
          <TrendingUp size={14} />
          {stat.change}
        </span>

        <span>vs last week</span>
      </div>
    </div>
  );
}
