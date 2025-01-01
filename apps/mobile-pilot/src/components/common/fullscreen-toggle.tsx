import { Fullscreen, Minimize } from "lucide-react"
import { Button, type ButtonProps } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { useFullscreen } from "~/hooks/useFullscreen"

type FullscreenToggleProps = ButtonProps

export function FullscreenToggle(props: FullscreenToggleProps) {
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  return (
    <Button
      variant="ghost"
      size="icon"
      {...props}
      className={cn("[&_svg]:size-6", props.className)}
      onClick={toggleFullscreen}
    >
      {isFullscreen ? <Minimize /> : <Fullscreen />}
      {props.children}
    </Button>
  )
}
