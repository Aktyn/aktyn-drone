import { Settings } from "lucide-react"
import { memo } from "react"
import { FullscreenToggle } from "~/components/common/fullscreen-toggle"
import { Button } from "~/components/ui/button"
import { Label } from "~/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { Separator } from "~/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group"
import { CAMERA_RESOLUTIONS } from "~/lib/consts"
import { useSettings } from "~/providers/settings-provider"

export const SettingsMenu = memo(() => {
  const { cameraResolution, setCameraResolution } = useSettings()

  const resolutionKey = `${cameraResolution.width}x${cameraResolution.height}`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="[&_svg]:size-6">
          <Settings />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-y-2 w-64 [&_svg]:text-muted-foreground">
        <FullscreenToggle size="default" className="[&_svg]:text-foreground">
          Toggle fullscreen
        </FullscreenToggle>
        <Separator />
        <Label>Camera resolution</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={resolutionKey}
          onValueChange={(key) => {
            try {
              const [width, height] = key.split("x").map(Number)
              setCameraResolution({ width, height })
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
      </PopoverContent>
    </Popover>
  )
})

SettingsMenu.displayName = "SettingsMenu"
