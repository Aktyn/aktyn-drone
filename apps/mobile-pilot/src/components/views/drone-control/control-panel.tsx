import { Maximize2, Minimize2, Minus, Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Label } from "~/components/ui/label"
import { Separator } from "~/components/ui/separator"
import { Slider } from "~/components/ui/slider"
import { cn } from "~/lib/utils"
import { DroneCameraPreview } from "./drone-camera-preview"
import {
  DroneOrientationWidget,
  type DroneOrientationWidgetProps,
} from "./drone-orientation-widget"

type ControlPanelProps = DroneOrientationWidgetProps

export function ControlPanel(droneOrientationWidgetProps: ControlPanelProps) {
  const [throttle, setThrottle] = useState(37)
  const [maximizeCameraPreview, setMaximizeCameraPreview] = useState(false)

  return (
    <div className="flex-grow overflow-hidden size-full animate-in fade-in grid grid-cols-1 grid-rows-[minmax(0,1fr)_auto] justify-between items-stretch relative">
      <div className="grid grid-cols-[1fr_2fr_1fr] w-full">
        <span />
        <div className="flex items-center justify-center mx-auto max-w-full overflow-hidden">
          <DroneCameraPreview
            className={cn(
              "mx-auto max-w-full max-h-full [&:hover>button]:opacity-100",
              maximizeCameraPreview &&
                "border-none rounded-none absolute inset-0 max-h-full max-w-full w-auto z-0",
            )}
          >
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 opacity-0 transition-[background-color,color,border-color,opacity] z-20"
              onClick={() => setMaximizeCameraPreview((v) => !v)}
            >
              {maximizeCameraPreview ? (
                <>
                  <Minimize2 />
                  <span>Minimize</span>
                </>
              ) : (
                <>
                  <Maximize2 />
                  <span>Maximize</span>
                </>
              )}
            </Button>
          </DroneCameraPreview>
        </div>
        <div className="flex flex-col items-stretch justify-center gap-y-4 p-2 z-10 pointer-events-none">
          <div className="flex flex-col items-start gap-y-2 pointer-events-auto">
            <Label>
              Throttle:&nbsp;
              <strong>
                {new Intl.NumberFormat(undefined, { style: "percent" }).format(
                  throttle / 100,
                )}
              </strong>
            </Label>
            <Slider
              value={[throttle]}
              onValueChange={([value]) => setThrottle(value)}
              min={0}
              max={100}
              step={1}
            />
            <div className="grid grid-cols-[1fr_1px_1fr] items-stretch justify-stretch w-full *:w-auto *:rounded-none">
              <Button
                variant="ghost"
                size="icon"
                disabled={throttle <= 0}
                onClick={() => setThrottle(throttle - 2)}
              >
                <Minus />
              </Button>
              <Separator orientation="vertical" />
              <Button
                variant="ghost"
                size="icon"
                disabled={throttle >= 100}
                onClick={() => setThrottle(throttle + 2)}
              >
                <Plus />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr]">
        <span />
        <DroneOrientationWidget {...droneOrientationWidgetProps} />
        <span />
      </div>
    </div>
  )
}
