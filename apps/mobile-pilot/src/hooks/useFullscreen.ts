import { useCallback, useEffect, useMemo, useState } from "react"

interface ScreenOrientationLock {
  lock(orientation: "landscape" | "portrait"): Promise<void>
}

interface ExtendedScreen extends Screen {
  orientation: ScreenOrientation & ScreenOrientationLock
}

export function useFullscreen() {
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

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error("Error toggling fullscreen:", error)
    }
  }, [])

  return useMemo(
    () => ({ isFullscreen, toggleFullscreen }),
    [isFullscreen, toggleFullscreen],
  )
}
