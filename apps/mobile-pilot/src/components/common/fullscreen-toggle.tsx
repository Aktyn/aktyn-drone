import { Fullscreen, Minimize } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

interface ScreenOrientationLock {
  lock(orientation: "landscape" | "portrait"): Promise<void>
}

interface ExtendedScreen extends Screen {
  orientation: ScreenOrientation & ScreenOrientationLock
}

export function FullscreenToggle({ className }: { className?: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      const hasFullscreenElement = !!document.fullscreenElement

      setIsFullscreen(hasFullscreenElement)

      if (hasFullscreenElement) {
        const extendedScreen = screen as ExtendedScreen
        if (extendedScreen.orientation?.lock) {
          extendedScreen.orientation
            .lock("landscape")
            .catch((error: Error) =>
              console.warn("Failed to lock screen orientation:", error),
            )
        }
      }
    }
    handleFullscreenChange()

    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error("Error toggling fullscreen:", error)
    }
  }

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
