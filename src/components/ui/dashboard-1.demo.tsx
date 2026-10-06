import { MarketingDashboard } from "@/components/ui/dashboard-1"

export default function MarketingDashboardDemo() {
  const sampleTeamActivities = {
    totalHours: 16.5,
    stats: [
      { label: "Productive", value: 45, color: "bg-green-400" },
      { label: "Middle", value: 25, color: "bg-lime-300" },
      { label: "Break", value: 15, color: "bg-yellow-300" },
      { label: "Idle", value: 15, color: "bg-slate-800 dark:bg-slate-700" },
    ],
  }

  const sampleTeam = {
    memberCount: 235,
    members: [
      { id: "1", name: "Olivia Martin", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces" },
      { id: "2", name: "Jackson Lee", avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=faces" },
      { id: "3", name: "Isabella Nguyen", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces" },
      { id: "4", name: "William Kim", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces" },
    ],
  }

  const sampleCta = {
    text: "Manage your activities and team members",
    buttonText: "See All",
    onButtonClick: () => alert("'See All' button clicked!"),
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <MarketingDashboard
        teamActivities={sampleTeamActivities}
        team={sampleTeam}
        cta={sampleCta}
        onFilterClick={() => alert("Filter clicked!")}
      />
    </div>
  )
}
