import { useState } from "react"
import {
  Activity,
  Blocks,
  Calendar,
  Command,
  CreditCard,
  FolderKanban,
  Globe,
  Hash,
  Inbox,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Terminal,
  Users,
  X,
} from "lucide-react"

import { type NavGroupData, type NavItemData, SidebarNav } from "@/components/ui/sidebar-nav"

const mockNavGroups: NavGroupData[] = [
  {
    items: [
      { id: "search", title: "Search", icon: Search, shortcut: "⌘K" },
      { id: "home", title: "Home", icon: LayoutDashboard },
      { id: "inbox", title: "Inbox", icon: Inbox, badge: 12 },
      { id: "analytics", title: "Analytics", icon: Activity },
    ],
  },
  {
    heading: "Workspace",
    items: [
      {
        id: "projects",
        title: "Projects",
        icon: FolderKanban,
        children: [
          { id: "p-active", title: "Active", icon: Hash },
          { id: "p-archived", title: "Archived", icon: Hash },
        ],
      },
      { id: "calendar", title: "Calendar", icon: Calendar },
      {
        id: "team",
        title: "Team",
        icon: Users,
        children: [
          { id: "t-design", title: "Designers", icon: Hash },
          { id: "t-eng", title: "Engineering", icon: Hash },
          { id: "t-product", title: "Product", icon: Hash },
        ],
      },
      {
        id: "customers",
        title: "Customers",
        icon: Globe,
        children: [
          { id: "c-enterprise", title: "Enterprise", icon: Hash },
          { id: "c-smb", title: "SMB", icon: Hash },
        ],
      },
      { id: "finance", title: "Finance", icon: CreditCard },
    ],
  },
  {
    heading: "Developers",
    items: [
      { id: "api", title: "API Keys", icon: Terminal },
      { id: "webhooks", title: "Webhooks", icon: Blocks },
    ],
  },
]

const mockBottomItems: NavItemData[] = [
  { id: "settings", title: "Settings", icon: Settings, shortcut: "⌘," },
  { id: "logout", title: "Log out", icon: LogOut },
]

const mockWorkspaces = ["Acme Corp", "Personal Workspace", "Client Sandbox"]

function flattenItems(items: NavItemData[]): NavItemData[] {
  return items.reduce((acc, item) => {
    acc.push(item)
    if (item.children) acc.push(...flattenItems(item.children))
    return acc
  }, [] as NavItemData[])
}

const flatMockData = flattenItems([...mockNavGroups.flatMap((g) => g.items), ...mockBottomItems])

export default function SidebarNavDemo() {
  const [isOpen, setIsOpen] = useState(true)
  const [activeId, setActiveId] = useState("home")
  const [activeWorkspace, setActiveWorkspace] = useState("Acme Corp")
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const activeItem = flatMockData.find((i) => i.id === activeId)
  const activeTitle = activeItem ? activeItem.title : "Dashboard"

  const handleSelect = (id: string) => {
    if (id === "search") {
      setIsSearchOpen(true)
      return
    }
    setActiveId(id)
  }

  return (
    <div className="flex min-h-[700px] w-full flex-col items-center justify-center bg-background p-4 md:p-8">
      <div className="ring-border/20 relative flex h-[700px] w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-surface shadow-sm ring-1">
        <div
          className={`h-full shrink-0 overflow-hidden border-r border-border bg-surface/50 transition-all duration-300 ease-in-out ${
            isOpen ? "w-[260px] opacity-100" : "w-0 border-none opacity-0"
          }`}
        >
          <SidebarNav
            className="w-[260px] border-none bg-transparent"
            groups={mockNavGroups}
            bottomItems={mockBottomItems}
            workspaces={mockWorkspaces}
            activeId={activeId}
            onSelect={handleSelect}
            activeWorkspace={activeWorkspace}
            onWorkspaceSelect={setActiveWorkspace}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-overlay-subtle transition-all duration-300">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-control p-1.5 text-text-muted transition-colors hover:bg-overlay-subtle hover:text-text"
              >
                {isOpen ? (
                  <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.5} />
                ) : (
                  <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.5} />
                )}
              </button>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span className="truncate">{activeWorkspace}</span>
                <span>/</span>
                <span className="truncate font-medium text-text">{activeTitle}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden h-8 w-64 rounded-control bg-overlay-subtle md:block" />
              <div className="h-8 w-8 rounded-full border border-brand/20 bg-brand/10" />
            </div>
          </div>

          <div className="overflow-y-auto p-6 [-ms-overflow-style:none] [scrollbar-width:none] md:p-8 [&::-webkit-scrollbar]:hidden">
            <div className="mb-8 flex items-center justify-between">
              <div className="h-8 w-48 rounded-control bg-overlay-subtle" />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="h-32 rounded-xl border border-border bg-surface shadow-sm" />
              <div className="h-32 rounded-xl border border-border bg-surface shadow-sm" />
            </div>

            <div className="w-full rounded-xl border border-border bg-surface p-6 shadow-sm">
              <div className="mb-6 h-5 w-1/3 rounded-control bg-overlay-subtle" />
              <div className="mb-6 h-[1px] w-full bg-border" />

              <div className="flex flex-col gap-4">
                <div className="h-12 w-full rounded-lg bg-overlay-subtle" />
                <div className="h-12 w-full rounded-lg bg-overlay-subtle" />
                <div className="h-12 w-full rounded-lg bg-overlay-subtle" />
                <div className="h-12 w-full rounded-lg bg-overlay-subtle" />
              </div>
            </div>
          </div>
        </div>

        {isSearchOpen && (
          <div className="absolute inset-0 z-50 flex items-start justify-center bg-background/40 px-4 pt-[15vh] backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setIsSearchOpen(false)} />
            <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center border-b border-border px-4">
                <Search className="mr-3 h-[18px] w-[18px] shrink-0 text-text-muted/70" strokeWidth={1.5} />
                <input
                  autoFocus
                  className="flex-1 bg-transparent py-4 text-[14px] text-text outline-none placeholder:text-text-muted/50"
                  placeholder="Search projects, docs, or actions..."
                />
                <kbd
                  onClick={() => setIsSearchOpen(false)}
                  className="ml-2 hidden h-5 cursor-pointer items-center justify-center rounded-[4px] border border-border bg-overlay px-1.5 font-mono text-[10px] font-medium text-text-muted/70 transition-colors hover:bg-overlay-strong hover:text-text sm:inline-flex"
                >
                  ESC
                </kbd>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="ml-3 rounded-control p-1 text-text-muted/70 transition-colors hover:bg-overlay hover:text-text"
                >
                  <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex flex-col items-center justify-center p-2 py-8">
                <Command className="mb-2 h-6 w-6 text-text-muted/30" strokeWidth={1.5} />
                <p className="text-[13px] font-medium text-text-muted">Type a command or search...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
