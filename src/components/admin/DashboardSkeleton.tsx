export function DashboardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="h-8 w-32 rounded bg-surface-hover" />
        <div className="flex gap-2">
          <div className="h-10 w-36 rounded-control bg-surface-hover" />
          <div className="h-10 w-40 rounded-control bg-surface-hover" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-control bg-surface-hover" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-72 rounded-control bg-surface-hover lg:col-span-2" />
        <div className="h-72 rounded-control bg-surface-hover" />
      </div>

      <div className="h-48 rounded-control bg-surface-hover" />
    </div>
  )
}
