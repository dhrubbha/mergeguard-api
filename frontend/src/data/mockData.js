export const stats = [
  {
    title: "Total Pull Requests",
    value: "128",
    change: "+12.5%",
    icon: "git-pull-request",
    color: "purple",
  },
  {
    title: "Open Pull Requests",
    value: "24",
    change: "+4.2%",
    icon: "git-branch",
    color: "blue",
  },
  {
    title: "Merged Pull Requests",
    value: "86",
    change: "+18.2%",
    icon: "git-merge",
    color: "green",
  },
  {
    title: "Pending Reviews",
    value: "18",
    change: "-2.4%",
    icon: "clock",
    color: "orange",
  },
];

export const pullRequests = [
  {
    id: 42,
    title: "Add user authentication API",
    repository: "mergeguard-api",
    author: "alex_dev",
    status: "Open",
    updated: "5 minutes ago",
  },
  {
    id: 41,
    title: "Improve database query performance",
    repository: "mergeguard-api",
    author: "john_doe",
    status: "Merged",
    updated: "24 minutes ago",
  },
  {
    id: 40,
    title: "Update dashboard components",
    repository: "frontend-app",
    author: "sarah_dev",
    status: "Review",
    updated: "1 hour ago",
  },
  {
    id: 39,
    title: "Fix webhook signature validation",
    repository: "mergeguard-api",
    author: "mike_dev",
    status: "Open",
    updated: "3 hours ago",
  },
  {
    id: 38,
    title: "Add pagination to merge history",
    repository: "backend-service",
    author: "alex_dev",
    status: "Merged",
    updated: "5 hours ago",
  },
];

export const activityData = [
  { day: "Mon", opened: 12, merged: 8 },
  { day: "Tue", opened: 18, merged: 11 },
  { day: "Wed", opened: 14, merged: 10 },
  { day: "Thu", opened: 22, merged: 16 },
  { day: "Fri", opened: 17, merged: 13 },
  { day: "Sat", opened: 10, merged: 7 },
  { day: "Sun", opened: 15, merged: 12 },
];
