import { Minus, Plus } from "lucide-react"
import { Button } from "../ui/button"
import { Label } from "../ui/label"
import { Separator } from "../ui/separator"
import { Slider } from "../ui/slider"
import { type ComponentProps, type ReactNode } from "react"
import { cn } from "~/lib/utils"

type PreciseSliderProps = {
  label?: ReactNode
  value: number
  onChange: (_value: number) => void
  min?: number
  max?: number
  step?: number
  buttonStep?: number
} & Omit<ComponentProps<"div">, "onChange">

export function PreciseSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  buttonStep = 2,
  ...divProps
}: PreciseSliderProps) {
  return (
    <div
      {...divProps}
      className={cn("flex flex-col items-start gap-y-2", divProps.className)}
    >
      {label && <Label>{label}</Label>}
      <Slider
        className="w-full"
        value={[value]}
        onValueChange={([value]) => onChange(value)}
        min={min}
        max={max}
        step={step}
      />
      <div className="grid grid-cols-[1fr_1px_1fr] items-stretch justify-stretch w-full *:w-auto *:rounded-none">
        <Button
          variant="ghost"
          size="icon"
          disabled={value <= min}
          onClick={(event) => {
            event.stopPropagation()
            event.preventDefault()
            onChange(Math.max(value - buttonStep, min))
          }}
        >
          <Minus />
        </Button>
        <Separator orientation="vertical" />
        <Button
          variant="ghost"
          size="icon"
          disabled={value >= max}
          onClick={(event) => {
            event.stopPropagation()
            event.preventDefault()
            onChange(Math.min(value + buttonStep, max))
          }}
        >
          <Plus />
        </Button>
      </div>
    </div>
  )
}
