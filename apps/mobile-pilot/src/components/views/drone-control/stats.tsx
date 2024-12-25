import { BatteryFull, BatteryLow, BatteryMedium, Gauge } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { cn } from "~/lib/utils"

export function Stats({ className }: { className?: string }) {
  const [batteryLevel, setBatteryLevel] = useState(0)
  const [speedKmH, setSpeedKmH] = useState(0)

  useEffect(() => {
    setBatteryLevel(Math.random())
    setSpeedKmH(Math.random() * 100)
  }, [])

  //TODO: listen to drone stats and update the UI
  // useConnectionMessageHandler((message) => {
  // ...
  // })

  return (
    <div className={cn("flex items-center gap-x-3", className)}>
      <StatsItem
        className={cn(
          batteryLevel > 0.66
            ? "text-green-400"
            : batteryLevel > 0.33
              ? "text-yellow-400"
              : "text-red-400 animate-pulse",
        )}
        label="Battery:"
        value={new Intl.NumberFormat(undefined, { style: "percent" }).format(
          batteryLevel,
        )}
        icon={
          batteryLevel > 0.66 ? (
            <BatteryFull />
          ) : batteryLevel > 0.33 ? (
            <BatteryMedium />
          ) : (
            <BatteryLow />
          )
        }
      />
      <StatsItem
        label="Speed:"
        value={
          new Intl.NumberFormat(undefined, {
            style: "decimal",
            maximumFractionDigits: 0,
          }).format(speedKmH) + " km/h"
        }
        icon={<Gauge />}
      />
    </div>
  )
}

type StatsItemProps = {
  icon: ReactNode
  label: string
  value: ReactNode
  className?: string
}

function StatsItem({ icon, label, value, className }: StatsItemProps) {
  return (
    <div className={cn("flex items-center gap-x-1 text-sm", className)}>
      {icon}
      <label>{label}</label>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
