import { Minus, Plus } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Label } from "~/components/ui/label"
import { Separator } from "~/components/ui/separator"
import { Slider } from "~/components/ui/slider"

type ThrottleSliderProps = {
  throttle: number
  onThrottleChange: (throttle: number) => void
}

export function ThrottleSlider({
  throttle,
  onThrottleChange,
}: ThrottleSliderProps) {
  return (
    <div className="flex flex-col items-start gap-y-2 pointer-events-auto mt-auto">
      <Label>
        Throttle:&nbsp;
        <strong>
          {new Intl.NumberFormat(undefined, {
            style: "percent",
          }).format(throttle / 100)}
        </strong>
      </Label>
      <Slider
        className="w-full"
        value={[throttle]}
        onValueChange={([value]) => onThrottleChange(value)}
        min={0}
        max={100}
        step={1}
      />
      <div className="grid grid-cols-[1fr_1px_1fr] items-stretch justify-stretch w-full *:w-auto *:rounded-none">
        <Button
          variant="ghost"
          size="icon"
          disabled={throttle <= 0}
          onClick={(event) => {
            event.stopPropagation()
            event.preventDefault()
            onThrottleChange(Math.max(throttle - 2, 0))
          }}
        >
          <Minus />
        </Button>
        <Separator orientation="vertical" />
        <Button
          variant="ghost"
          size="icon"
          disabled={throttle >= 100}
          onClick={(event) => {
            event.stopPropagation()
            event.preventDefault()
            onThrottleChange(Math.min(throttle + 2, 100))
          }}
        >
          <Plus />
        </Button>
      </div>
    </div>
  )
}
