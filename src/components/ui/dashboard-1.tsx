import * as React from "react"
import { animate, motion, useMotionValue, useTransform } from "framer-motion"
import { ArrowRight, Clock, Filter, Users, Zap } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ActivityStat {
  label: string
  value: number
  color: string
}

interface TeamMember {
  id: string
  name: string
  avatarUrl: string
}

interface MarketingDashboardProps {
  title?: string
  activityLabel?: string
  teamLabel?: string
  teamActivities: {
    totalHours: number
    unitLabel?: string
    stats: ActivityStat[]
  }
  team: {
    memberCount: number
    unitLabel?: string
    members: TeamMember[]
  }
  cta: {
    text: string
    buttonText: string
    onButtonClick: () => void
  }
  onFilterClick?: () => void
  className?: string
}

const AnimatedNumber = ({ value }: { value: number }) => {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest * 10) / 10)

  React.useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: "easeOut" })
    return controls.stop
  }, [value, count])

  return <motion.span>{rounded}</motion.span>
}

export const MarketingDashboard = React.forwardRef<HTMLDivElement, MarketingDashboardProps>(
  (
    {
      title = "Actividad del equipo",
      activityLabel = "Actividad",
      teamLabel = "Equipo",
      teamActivities,
      team,
      cta,
      onFilterClick,
      className,
    },
    ref,
  ) => {
    const containerVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
    }

    const itemVariants = {
      hidden: { opacity: 0, y: 15 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    }

    const hoverTransition = { type: "spring" as const, stiffness: 300, damping: 15 }

    return (
      <motion.div
        ref={ref}
        className={cn("w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 text-text", className)}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onFilterClick} aria-label="Filtrar actividad">
            <Filter className="h-5 w-5" />
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <motion.div variants={itemVariants} whileHover={{ scale: 1.03, y: -5 }} transition={hoverTransition}>
            <Card className="h-full overflow-hidden rounded-xl p-4">
              <CardContent className="p-2">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-medium text-text-muted">{activityLabel}</p>
                  <Clock className="h-5 w-5 text-text-muted" />
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold">
                    <AnimatedNumber value={teamActivities.totalHours} />
                  </span>
                  <span className="ml-1 text-text-muted">{teamActivities.unitLabel ?? "horas"}</span>
                </div>
                <div className="mb-2 flex h-2 w-full overflow-hidden rounded-full bg-overlay">
                  {teamActivities.stats.map((stat, index) => (
                    <motion.div
                      key={index}
                      className={cn("h-full", stat.color)}
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.value}%` }}
                      transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  {teamActivities.stats.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", stat.color)}></span>
                      <span>{stat.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.03, y: -5 }} transition={hoverTransition}>
            <Card className="h-full overflow-hidden rounded-xl border-brand/20 bg-brand/5 p-4">
              <CardContent className="p-2">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-medium text-brand-light">{teamLabel}</p>
                  <Users className="h-5 w-5 text-brand-light" />
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-text">
                    <AnimatedNumber value={team.memberCount} />
                  </span>
                  <span className="ml-1 text-text-muted">{team.unitLabel ?? "miembros"}</span>
                </div>
                <div className="flex -space-x-2">
                  {team.members.slice(0, 4).map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                      whileHover={{ scale: 1.2, zIndex: 10, y: -2 }}
                    >
                      <Avatar className="border-2 border-surface">
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} transition={hoverTransition} className="mt-4">
          <div className="flex items-center justify-between rounded-xl bg-overlay p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-background p-2">
                <Zap className="h-5 w-5 text-text" />
              </div>
              <p className="text-sm font-medium text-text-muted">{cta.text}</p>
            </div>
            <Button onClick={cta.onButtonClick} className="shrink-0">
              {cta.buttonText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )
  },
)

MarketingDashboard.displayName = "MarketingDashboard"
