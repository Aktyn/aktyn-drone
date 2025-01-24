import { Settings } from "lucide-react"
import { memo, useState } from "react"
import { FullscreenToggle } from "~/components/common/fullscreen-toggle"
import { Button } from "~/components/ui/button"
import { Label } from "~/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { Separator } from "~/components/ui/separator"
import { Slider } from "~/components/ui/slider"
import { Switch } from "~/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group"
import { useDebounce } from "~/hooks/useDebounce"
import { CAMERA_RESOLUTIONS } from "~/lib/consts"
import { useSettings } from "~/providers/settings-provider"
import { cn } from "~/lib/utils"

export const SettingsMenu = memo(() => {
  const { settings, setSettingsValue } = useSettings()

  const [framerateState, setFramerateState] = useState(settings.cameraFramerate)

  const resolutionKey = `${settings.cameraResolution.width}x${settings.cameraResolution.height}`

  const updateFramerateDebounced = useDebounce(
    (value: number) => setSettingsValue("cameraFramerate", value),
    1000,
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="[&_svg]:size-6">
          <Settings />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-y-4 w-64 [&_svg]:text-muted-foreground">
        <FullscreenToggle size="default" className="[&_svg]:text-foreground">
          Toggle fullscreen
        </FullscreenToggle>
        <Separator />
        <div className="flex items-center gap-x-2">
          <Switch
            id="show-camera-preview"
            checked={settings.showCameraPreview}
            onCheckedChange={(checked) =>
              setSettingsValue("showCameraPreview", !!checked)
            }
          />
          <Label htmlFor="show-camera-preview" className="cursor-pointer">
            Show camera preview
          </Label>
        </div>
        <Label>Camera stream resolution</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={resolutionKey}
          onValueChange={(key) => {
            try {
              const [width, height] = key.split("x").map(Number)
              setSettingsValue("cameraResolution", { width, height })
            } catch (error) {
              console.error(error)
            }
          }}
        >
          {CAMERA_RESOLUTIONS.map((resolution) => {
            const key = `${resolution.width}x${resolution.height}`

            return (
              <ToggleGroupItem key={key} value={key} className="w-full">
                {key}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
        <Label>
          Camera framerate:{" "}
          <span
            className={cn(
              framerateState === settings.cameraFramerate && "font-bold",
            )}
          >
            {framerateState}
          </span>
        </Label>
        <Slider
          value={[framerateState]}
          onValueChange={([value]) => {
            setFramerateState(value)
            updateFramerateDebounced(value)
          }}
          min={1}
          max={60}
          step={1}
        />
        <Separator />
        <div className="flex items-center gap-x-2">
          <Switch
            id="smooth-keyboard-controls"
            checked={settings.smoothKeyboardControls}
            onCheckedChange={(checked) =>
              setSettingsValue("smoothKeyboardControls", !!checked)
            }
          />
          <Label htmlFor="smooth-keyboard-controls" className="cursor-pointer">
            Smooth keyboard controls
          </Label>
        </div>
      </PopoverContent>
    </Popover>
  )
})

SettingsMenu.displayName = "SettingsMenu"
