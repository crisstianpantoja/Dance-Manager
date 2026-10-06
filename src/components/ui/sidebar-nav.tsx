import * as React from "react"
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

export type NavItemData = {
  id: string
  title: string
  icon: React.ElementType
  badge?: number | string
  shortcut?: string
  children?: NavItemData[]
}

export type NavGroupData = {
  heading?: string
  items: NavItemData[]
}

function WorkspaceSwitcher({
  options,
  selected,
  onSelect,
}: {
  options: string[]
  selected?: string
  onSelect?: (ws: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [internalSelected, setInternalSelected] = useState(options[0] ?? "")

  const current = selected || internalSelected
  const handleSelect = onSelect || setInternalSelected

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="group mb-4 flex cursor-pointer select-none items-center justify-between rounded-control px-2 py-2 transition-colors hover:bg-overlay-subtle"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-brand text-[13px] font-semibold text-white shadow-sm">
            {current.charAt(0)}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="mb-1 max-w-[120px] truncate text-[13px] font-medium leading-none text-text">
              {current}
            </span>
            <span className="text-[11px] leading-none text-text-muted">Pro Plan</span>
          </div>
        </div>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-text-muted/60 transition-colors group-hover:text-text/70"
          strokeWidth={1.5}
        />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-[52px] z-50 flex w-full flex-col gap-0.5 rounded-control border border-border bg-surface py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
            {options.map((ws) => (
              <div
                key={ws}
                onClick={() => {
                  handleSelect(ws)
                  setIsOpen(false)
                }}
                className={`mx-1 cursor-pointer rounded-control px-3 py-2 text-[13px] transition-colors ${
                  current === ws
                    ? "bg-brand/10 font-medium text-brand-light"
                    : "text-text/80 hover:bg-overlay-subtle"
                }`}
              >
                {ws}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function NavItem({
  item,
  activeId,
  onSelect,
  level = 0,
}: {
  item: NavItemData
  activeId: string
  onSelect: (id: string) => void
  level?: number
}) {
  const isActive = activeId === item.id
  const hasChildren = !!item.children
  const [isOpen, setIsOpen] = useState(false)

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen)
    } else {
      onSelect(item.id)
    }
  }

  return (
    <div className="flex w-full flex-col">
      <div
        className={`group flex cursor-pointer select-none items-center justify-between rounded-[6px] px-2.5 py-[7px] transition-all duration-200 ${
          isActive
            ? "bg-overlay font-medium text-text"
            : "text-text-muted hover:bg-overlay-subtle hover:text-text/90"
        }`}
        style={{ paddingLeft: `${level * 12 + 10}px` }}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2.5">
          <item.icon
            className={`h-[16px] w-[16px] transition-colors ${
              isActive ? "text-text" : "text-text-muted/70 group-hover:text-text/70"
            }`}
            strokeWidth={1.5}
          />
          <span className="truncate text-[13px] tracking-wide">{item.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {item.shortcut && (
            <kbd className="hidden h-5 items-center justify-center rounded-[4px] border border-border bg-background/50 px-1.5 font-mono text-[10px] font-medium text-text-muted/60 shadow-xs group-hover:inline-flex">
              {item.shortcut}
            </kbd>
          )}
          {item.badge && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand/10 px-1.5 text-[10px] font-medium text-brand-light">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronRight
              className={`h-3.5 w-3.5 text-text-muted/50 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
              strokeWidth={2}
            />
          )}
        </div>
      </div>

      {hasChildren && (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="relative mt-0.5 flex min-h-0 flex-col gap-0.5 overflow-hidden">
            <div
              className="absolute bottom-0 top-0 border-l border-border-subtle"
              style={{ left: `${level * 12 + 17.5}px` }}
            />
            {item.children!.map((child) => (
              <NavItem key={child.id} item={child} activeId={activeId} onSelect={onSelect} level={level + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface SidebarNavProps {
  groups: NavGroupData[]
  bottomItems?: NavItemData[]
  workspaces?: string[]
  className?: string
  activeId?: string
  onSelect?: (id: string) => void
  activeWorkspace?: string
  onWorkspaceSelect?: (ws: string) => void
}

export function SidebarNav({
  groups,
  bottomItems = [],
  workspaces = [],
  className = "",
  activeId,
  onSelect,
  activeWorkspace,
  onWorkspaceSelect,
}: SidebarNavProps) {
  const [internalId, setInternalId] = useState("")
  const currentId = activeId !== undefined ? activeId : internalId
  const handleSelect = onSelect || setInternalId

  return (
    <div className={`flex h-full w-[260px] flex-col border-r border-border bg-surface/50 p-3 font-sans ${className}`}>
      {workspaces.length > 0 && (
        <WorkspaceSwitcher options={workspaces} selected={activeWorkspace} onSelect={onWorkspaceSelect} />
      )}

      <div className="mt-2 flex flex-1 flex-col gap-4 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-0.5">
            {group.heading && (
              <span className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted/50">
                {group.heading}
              </span>
            )}
            {group.items.map((item) => (
              <NavItem key={item.id} item={item} activeId={currentId} onSelect={handleSelect} />
            ))}
          </div>
        ))}
      </div>

      {bottomItems.length > 0 && (
        <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-4">
          {bottomItems.map((item) => (
            <NavItem key={item.id} item={item} activeId={currentId} onSelect={handleSelect} />
          ))}
        </div>
      )}
    </div>
  )
}
