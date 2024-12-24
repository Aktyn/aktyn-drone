import { Fullscreen, Minimize } from "lucide-react"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { useFullscreen } from "~/hooks/useFullscreen"

export function FullscreenToggle({ className }: { className?: string }) {
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("[&_svg]:size-6", className)}
      onClick={toggleFullscreen}
    >
      {isFullscreen ? <Minimize /> : <Fullscreen />}
    </Button>
  )
}
