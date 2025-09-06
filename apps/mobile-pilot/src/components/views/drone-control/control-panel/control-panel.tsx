import { clamp, MessageType } from "@aktyn-drone/common"
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react"
import {
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { PreciseSlider } from "~/components/common/precise-slider"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { Label } from "~/components/ui/label"
import { Separator } from "~/components/ui/separator"
import { useInterval } from "~/hooks/useInterval"
import { cn } from "~/lib/utils"
import { useConnection } from "~/providers/connection-provider"
import { useSettings } from "~/providers/settings-provider"
import { DroneCameraPreview } from "../drone-camera-preview"
import { AUXPanel } from "./aux-panel"
import {
  DroneOrientationWidget,
  type DroneOrientationWidgetProps,
} from "./drone-orientation-widget"
import { Joystick } from "./joystick"
import { useGlobalState } from "~/hooks/useGlobalState"
import { useStateToRef } from "~/hooks/useStateToRef"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Switch } from "~/components/ui/switch"
import { DEFAULT_ZOOM, Map } from "../map/map"
import { type LatLngExpression } from "leaflet"
import { type MapRef } from "react-leaflet/MapContainer"

type ControlPanelProps = DroneOrientationWidgetProps &
  ControlPanelMainProps & {
    latitude: number
    longitude: number
    heading: number
  }

export const ControlPanel = memo<ControlPanelProps>(
  ({
    latitude,
    longitude,
    heading,
    onPreviewMaximizedChange,
    ...droneOrientationWidgetProps
  }) => {
    const mapRef = useRef<MapRef>(null)

    const [bottomView, setBottomView] = useState<"orientation" | "map">(
      "orientation",
    )
    const [bottomViewSize, setBottomViewSize] = useState<"sm" | "md" | "lg">(
      "sm",
    )

    const position: LatLngExpression = [latitude, longitude]

    useEffect(() => {
      mapRef.current?.setView(
        [latitude, longitude],
        mapRef.current?.getZoom() ?? DEFAULT_ZOOM,
        {
          animate: true,
          duration: 0.4,
        },
      )
    }, [latitude, longitude])

    return (
      <div className="flex-grow overflow-hidden size-full animate-in fade-in grid grid-cols-[minmax(12rem,1fr)_minmax(16rem,auto)_minmax(12rem,1fr)] grid-rows-[auto_1fr] justify-between items-stretch gap-y-2">
        <ControlPanelMain onPreviewMaximizedChange={onPreviewMaximizedChange} />
        <div
          className={cn(
            "relative mt-auto flex flex-col w-full hover:*:last:translate-y-0 hover:*:last:opacity-100 h-full max-h-[50dvh]",
            bottomView === "map" &&
              bottomViewSize === "sm" &&
              "min-h-[min(8rem,50dvh)]",
            bottomView === "map" &&
              bottomViewSize === "md" &&
              "min-h-[min(16rem,50dvh)]",
            bottomView === "map" &&
              bottomViewSize === "lg" &&
              "min-h-[min(24rem,50dvh)]",
          )}
        >
          {bottomView === "orientation" && (
            <DroneOrientationWidget
              {...droneOrientationWidgetProps}
              size={bottomViewSize}
              className={cn("mt-auto", droneOrientationWidgetProps.className)}
            />
          )}
          {bottomView === "map" && (
            <div className="mt-auto absolute inset-0 bg-blue-300/20 pointer-events-none z-0 rounded-lg overflow-hidden">
              <Map
                ref={mapRef}
                center={position}
                zoom={DEFAULT_ZOOM - 1}
                scrollWheelZoom={false}
                heading={heading}
                className="w-full h-full"
              />
            </div>
          )}

          <div className="absolute bottom-0 w-full flex flex-row items-center justify-stretch gap-1 p-1 *:flex-1 transition-transform pointer-fine:translate-y-full z-100 bg-background/50">
            <Button
              variant="ghost"
              size="icon"
              disabled={bottomViewSize === "sm"}
              onClick={() =>
                setBottomViewSize(bottomViewSize === "md" ? "sm" : "md")
              }
            >
              <ZoomOut />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-background/50"
              onClick={() =>
                setBottomView((v) => (v === "map" ? "orientation" : "map"))
              }
            >
              {bottomView === "map" ? "Show orientation" : "Show location"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={bottomViewSize === "lg"}
              onClick={() =>
                setBottomViewSize(bottomViewSize === "sm" ? "md" : "lg")
              }
            >
              <ZoomIn />
            </Button>
          </div>
        </div>
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
    const throttleAcceleratorRef = useRef(0)
    const { send } = useConnection()
    const { settings } = useSettings()

    const [maximizeCameraPreview, setMaximizeCameraPreview] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [eulerAngles, setEulerAngles] = useState({
      yaw: 0,
      pitch: 0,
      roll: 0,
    })
    const [throttle, setThrottle] = useState(0)
    const [throttleSafety, setThrottleSafety] = useState(true)
    const [controlsStrength, setControlsStrength] = useGlobalState(
      "controls-strength",
      100 as number,
      localStorage,
    )

    useEffect(() => {
      if (!settings.showCameraPreview) {
        setMaximizeCameraPreview(false)
      }
    }, [settings.showCameraPreview])

    const controlsStrengthRef = useStateToRef(controlsStrength)
    const updateEulerAngles = useCallback(
      (data: Partial<typeof eulerAngles>) => {
        if (
          typeof controlsStrengthRef.current === "number" &&
          controlsStrengthRef.current < 100
        ) {
          for (const key in data) {
            data[key as keyof typeof data] =
              (data[key as keyof typeof data] ?? 0) *
              (controlsStrengthRef.current / 100)
          }
        }

        setEulerAngles((prev) => {
          const updatedAngles = { ...prev, ...data }
          send({
            type: MessageType.SEND_EULER_ANGLES,
            data: updatedAngles,
          })
          return updatedAngles
        })
      },
      [controlsStrengthRef, send],
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
        <div className="h-full flex flex-col items-stretch justify-center gap-y-2 p-2 pt-0 z-10 pointer-events-none row-span-2 *:pointer-events-auto">
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
            keyboardKeys={["a", "d", "s", "w"]}
            onChange={(yaw, throttleAccelerator) => {
              updateEulerAngles({ yaw })
              throttleAcceleratorRef.current = throttleAccelerator
            }}
          />
        </div>
        <div className="flex items-center justify-center mx-auto max-w-full overflow-hidden">
          <DroneCameraPreview
            className={cn(
              "mx-auto max-w-full max-h-full [&:hover>.options]:opacity-100",
              maximizeCameraPreview &&
                "border-none rounded-none absolute inset-0 max-h-full max-w-full w-auto z-0",
            )}
          >
            <div
              className={cn(
                "options",
                "absolute top-2 right-2 opacity-0 transition-opacity flex flex-col gap-2",
                maximizeCameraPreview && "hidden",
              )}
            >
              <Button
                variant="outline"
                size="sm"
                className="transition-[background-color,color,border-color,opacity] z-40"
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
              <div className="flex items-center gap-2 py-2 px-3 border border-input bg-background shadow-sm rounded-md text-sm font-medium">
                {/* TODO: implement */}
                <Switch id="record-switch" checked={false} disabled />
                <Label htmlFor="record-switch">Record</Label>
              </div>
            </div>
          </DroneCameraPreview>
        </div>
        <div className="h-full flex flex-col items-stretch justify-center gap-y-4 p-2 pt-0 z-10 pointer-events-none row-span-2">
          <ScrollArea className="mt-auto pointer-events-auto">
            <div className="flex flex-col gap-y-4">
              <PreciseSlider
                label={
                  <>
                    Throttle:&nbsp;
                    <strong>
                      {new Intl.NumberFormat(undefined, {
                        style: "percent",
                      }).format(throttle / 100)}
                    </strong>
                  </>
                }
                value={throttle}
                onChange={handleThrottleChange}
              />
              <Separator />
              <PreciseSlider
                label={
                  <>
                    Controls strength:&nbsp;
                    <strong>
                      {new Intl.NumberFormat(undefined, {
                        style: "percent",
                      }).format((controlsStrength ?? 0) / 100)}
                    </strong>
                  </>
                }
                value={controlsStrength ?? 0}
                onChange={setControlsStrength}
              />
            </div>
          </ScrollArea>
          <Joystick
            className="mt-auto pointer-events-auto"
            keyboardKeys={["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"]}
            onChange={(roll, pitch) =>
              updateEulerAngles({ roll, pitch: -pitch })
            }
          />
        </div>
      </>
    )
  },
)
