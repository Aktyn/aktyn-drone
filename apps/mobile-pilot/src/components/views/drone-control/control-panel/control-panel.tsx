import { clamp, MessageType } from "@aktyn-drone/common"
import { Maximize2, Minimize2 } from "lucide-react"
import {
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { Label } from "~/components/ui/label"
import { useInterval } from "~/hooks/useInterval"
import { cn } from "~/lib/utils"
import { useConnection } from "~/providers/connection-provider"
import { DroneCameraPreview } from "../drone-camera-preview"
import {
  DroneOrientationWidget,
  type DroneOrientationWidgetProps,
} from "./drone-orientation-widget"
import { Joystick } from "./joystick"
import { ThrottleSlider } from "./throttle-slider"
import { AUXPanel } from "./aux-panel"
import { Separator } from "~/components/ui/separator"

type ControlPanelProps = DroneOrientationWidgetProps & ControlPanelMainProps

export const ControlPanel = memo<ControlPanelProps>(
  ({ onPreviewMaximizedChange, ...droneOrientationWidgetProps }) => {
    return (
      <div className="flex-grow overflow-hidden size-full animate-in fade-in grid grid-cols-[1fr_2fr_1fr] grid-rows-[minmax(0,1fr)_auto] justify-between items-stretch">
        <ControlPanelMain onPreviewMaximizedChange={onPreviewMaximizedChange} />
        <DroneOrientationWidget {...droneOrientationWidgetProps} />
      </div>
    )
  },
)

ControlPanel.displayName = "ControlPanel"

type ControlPanelMainProps = {
  onPreviewMaximizedChange?: (maximized: boolean) => void
}

const ControlPanelMain = memo<ControlPanelMainProps>(
  ({ onPreviewMaximizedChange }) => {
    const { send } = useConnection()
    const throttleAcceleratorRef = useRef(0)

    const [maximizeCameraPreview, setMaximizeCameraPreview] = useState(false)
    const [eulerAngles, setEulerAngles] = useState({
      yaw: 0,
      pitch: 0,
      roll: 0,
    })
    const [throttle, setThrottle] = useState(0)
    const [throttleSafety, setThrottleSafety] = useState(true)

    const updateEulerAngles = useCallback(
      (data: Partial<typeof eulerAngles>) => {
        setEulerAngles((prev) => {
          const updatedAngles = { ...prev, ...data }
          send({
            type: MessageType.SEND_EULER_ANGLES,
            data: updatedAngles,
          })
          return updatedAngles
        })
      },
      [send],
    )

    const handleThrottleChange = useCallback(
      (value: SetStateAction<number>) => {
        setThrottle((prev) => {
          const newValue = clamp(
            typeof value === "function" ? value(prev) : value,
            0,
            100,
          )

          send({
            type: MessageType.SET_THROTTLE,
            data: { throttle: newValue },
          })

          return newValue
        })
      },
      [send],
    )

    useInterval(
      () => {
        if (throttleSafety) {
          return
        }

        if (throttleAcceleratorRef.current !== 0) {
          handleThrottleChange(
            (throttle) => throttle + throttleAcceleratorRef.current,
          )
        }
      },
      1000 / 60,
      [throttleSafety],
    )

    useEffect(() => {
      onPreviewMaximizedChange?.(maximizeCameraPreview)
    }, [maximizeCameraPreview, onPreviewMaximizedChange])

    return (
      <>
        <div className="h-full flex flex-col items-stretch justify-center gap-y-2 p-2 z-10 pointer-events-none overflow-hidden row-span-2 *:pointer-events-auto">
          <AUXPanel />
          <Separator />
          <div className="flex flex-col items-center justify-end">
            <div className="flex items-center gap-x-2">
              <Checkbox
                id="throttle-safety"
                checked={throttleSafety}
                onCheckedChange={(checked) => setThrottleSafety(!!checked)}
              />
              <Label htmlFor="throttle-safety" className="cursor-pointer">
                Throttle safety
              </Label>
            </div>
          </div>
          <Joystick
            className="pointer-events-auto"
            disableVertical={throttleSafety}
            onChange={(yaw, throttleAccelerator) => {
              updateEulerAngles({ yaw })
              throttleAcceleratorRef.current = throttleAccelerator
            }}
          />
        </div>
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
              className={cn(
                "absolute top-2 right-2 opacity-0 transition-[background-color,color,border-color,opacity] z-40",
                maximizeCameraPreview && "top-16",
              )}
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
        <div className="h-full flex flex-col items-stretch justify-center gap-y-4 p-2 z-10 pointer-events-none overflow-hidden row-span-2">
          <ThrottleSlider
            throttle={throttle}
            onThrottleChange={handleThrottleChange}
          />
          <Joystick
            className="mt-auto pointer-events-auto"
            onChange={(roll, pitch) => updateEulerAngles({ roll, pitch })}
          />
        </div>
      </>
    )
  },
)
