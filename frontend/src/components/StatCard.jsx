import {
  GitPullRequest,
  GitBranch,
  GitMerge,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const iconMap = {
  "git-pull-request": GitPullRequest,
  "git-branch": GitBranch,
  "git-merge": GitMerge,
  clock: Clock,
};

export default function StatCard({ stat }) {
  const Icon = iconMap[stat.icon] || GitPullRequest;
  const isNegative = String(stat.change || "").startsWith("-");

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
        <span className={`stat-change ${isNegative ? "negative" : "positive"}`}>
          {isNegative ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
          {stat.change || "+0.0%"}
        </span>

        <span>vs previous week</span>
      </div>
    </div>
  );
}
