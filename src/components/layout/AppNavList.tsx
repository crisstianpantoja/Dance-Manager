import { NavLink } from "react-router-dom"

import { cn } from "@/lib/utils"

export interface AppNavItem {
  to: string
  label: string
  icon: React.ElementType
  badge?: number | string
}

export interface AppNavGroup {
  heading?: string
  items: AppNavItem[]
}

interface AppNavListProps {
  groups: AppNavGroup[]
  className?: string
  onItemClick?: () => void
}

export function AppNavList({ groups, className, onItemClick }: AppNavListProps) {
  return (
    <nav className={cn("flex-1 space-y-4 px-4", className)}>
      {groups.map((group, idx) => (
        <div key={idx} className="space-y-1">
          {group.heading && (
            <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted/50">
              {group.heading}
            </p>
          )}
          {group.items.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onItemClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-control px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand text-white shadow-md shadow-brand/20"
                    : "text-text-muted hover:bg-surface-hover hover:text-text",
                )
              }
            >
              <Icon className="size-5" />
              {label}
              {badge != null && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[10px] font-bold text-background">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}
