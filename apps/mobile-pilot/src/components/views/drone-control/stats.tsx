import type { TelemetryDataFull } from "@aktyn-drone/common"
import {
  ArrowUpFromLine,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Compass,
  EllipsisVertical,
  Gauge,
  MapPin,
  Rotate3D,
  Satellite,
  Thermometer,
} from "lucide-react"
import { memo, type ReactNode } from "react"
import { Button } from "~/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area"
import { Separator } from "~/components/ui/separator"
import { cmPerSecondToKmPerHour, cn, radiansToDegrees } from "~/lib/utils"

type StatsProps = {
  className?: string
  telemetry: TelemetryDataFull
}

export const Stats = memo<StatsProps>(({ className, telemetry }) => {
  const batteryLevel = telemetry.percentage / 100

  return (
    <ScrollArea>
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
            ) : batteryLevel > 0 ? (
              <BatteryLow />
            ) : (
              <BatteryWarning />
            )
          }
        />
        <StatsItem
          label="Speed:"
          value={
            formatDecimal(cmPerSecondToKmPerHour(telemetry.groundSpeed)) +
            " km/h"
          }
          icon={<Gauge />}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-transparent rounded-full"
            >
              <EllipsisVertical />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="flex flex-col gap-y-2 w-64 [&_svg]:text-muted-foreground">
            <StatsItem
              label="Pitch:"
              value={
                formatDecimal(radiansToDegrees(telemetry.pitch), 2) + " deg"
              }
              icon={<Rotate3D />}
            />
            <StatsItem
              label="Roll:"
              value={
                formatDecimal(radiansToDegrees(telemetry.roll), 2) + " deg"
              }
              icon={<Rotate3D />}
            />
            <StatsItem
              label="Yaw:"
              value={formatDecimal(radiansToDegrees(telemetry.yaw), 2) + " deg"}
              icon={<Rotate3D />}
            />
            <Separator />
            <StatsItem
              label="Latitude:"
              value={formatDecimal(telemetry.latitude, 6)}
              icon={<MapPin />}
            />
            <StatsItem
              label="Longitude:"
              value={formatDecimal(telemetry.longitude, 6)}
              icon={<MapPin />}
            />
            <StatsItem
              label="Heading:"
              value={
                formatDecimal(telemetry.heading) +
                `deg | ${headingToCompass(telemetry.heading)}`
              }
              icon={<Compass />}
            />
            <StatsItem
              label="Altitude:"
              value={formatDecimal(telemetry.altitude) + "m"}
              icon={<ArrowUpFromLine />}
            />
            <StatsItem
              className={cn(
                (telemetry.satellites ?? 0) >= 5
                  ? "last:*:text-green-400"
                  : (telemetry.satellites ?? 0) >= 3
                    ? "last:*:text-yellow-400"
                    : "text-red-400 animate-pulse",
              )}
              label="Satellites:"
              value={telemetry.satellites?.toString() ?? "-"}
              icon={<Satellite />}
            />
            <Separator />
            <StatsItem
              className={cn(
                telemetry.rpiTemperature > 70
                  ? "text-red-400"
                  : telemetry.rpiTemperature > 50
                    ? "last:*:text-yellow-400"
                    : "last:*:text-green-400",
              )}
              label="RPi Temperature:"
              value={formatDecimal(telemetry.rpiTemperature, 2) + "°C"}
              icon={<Thermometer />}
            />
          </PopoverContent>
        </Popover>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
})

Stats.displayName = "Stats"

function formatDecimal(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(undefined, {
    style: "decimal",
    maximumFractionDigits,
  }).format(value)
}

type StatsItemProps = {
  icon?: ReactNode
  label: string
  value: ReactNode
  className?: string
}

function StatsItem({ icon, label, value, className }: StatsItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-x-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap",
        className,
      )}
    >
      {icon}
      <label>{label}</label>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function headingToCompass(heading: number) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  if (heading === -Infinity) {
    heading = 0
  }
  heading = ((heading % 360) + 360) % 360
  return directions[Math.round(heading / 45) % 8]
}
