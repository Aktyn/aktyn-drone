import { clamp } from "@aktyn-drone/common"
import { memo, useEffect, useRef, useState } from "react"
import { Separator } from "~/components/ui/separator"
import { useStateToRef } from "~/hooks/useStateToRef"
import { cn } from "~/lib/utils"

type JoystickProps = {
  className?: string
  disableVertical?: boolean
  onChange?: (x: number, y: number) => void
}

export const Joystick = memo<JoystickProps>(
  ({ className, disableVertical, onChange }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const handleRef = useRef<HTMLDivElement>(null)

    const [grabbed, setGrabbed] = useState(false)
    const [x, setX] = useState(0)
    const [y, setY] = useState(0)
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

    const containerSizeRef = useStateToRef(containerSize)

    useEffect(() => {
      const container = containerRef.current
      const handle = handleRef.current
      if (!container || !handle) {
        return
      }

      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      })

      const observer = new ResizeObserver(() => {
        setContainerSize({
          width: container.clientWidth,
          height: container.clientHeight,
        })
      })

      observer.observe(container)

      let grabPosition: { x: number; y: number; pointerId: number } | null =
        null

      const onGrab = (event: PointerEvent) => {
        setGrabbed(true)
        grabPosition = {
          x: event.clientX,
          y: event.clientY,
          pointerId: event.pointerId,
        }
      }

      const onRelease = () => {
        setGrabbed(false)
        grabPosition = null
        setX(0)
        setY(0)
      }

      const onMove = (event: PointerEvent) => {
        if (!grabPosition || grabPosition.pointerId !== event.pointerId) {
          return
        }

        const deltaX = event.clientX - grabPosition.x
        const deltaY = disableVertical ? 0 : event.clientY - grabPosition.y

        setX(deltaX)
        setY(deltaY)

        onChange?.(
          clamp((deltaX / containerSizeRef.current.width) * 2, -1, 1),
          -clamp((deltaY / containerSizeRef.current.height) * 2, -1, 1),
        )
      }

      handle.addEventListener("pointerdown", onGrab)
      document.addEventListener("pointerup", onRelease)
      document.addEventListener("pointercancel", onRelease)
      document.addEventListener("pointermove", onMove)

      return () => {
        handle.removeEventListener("pointerdown", onGrab)
        document.removeEventListener("pointerup", onRelease)
        document.removeEventListener("pointercancel", onRelease)
        document.removeEventListener("pointermove", onMove)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerSizeRef, disableVertical])

    return (
      <div className={cn("w-full max-h-[50%] pointer-events-none", className)}>
        <div
          ref={containerRef}
          onContextMenu={(event) => event.preventDefault()}
          className="aspect-square max-h-full bg-background/80 mx-auto rounded-md border flex items-center justify-center overflow-hidden select-none relative touch-none"
        >
          <Separator className="absolute inset-0 my-auto opacity-40" />
          {!disableVertical && (
            <Separator
              className="absolute inset-0 mx-auto opacity-40"
              orientation="vertical"
            />
          )}
          <span
            ref={handleRef}
            onDrag={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
            className={cn(
              "size-12 bg-muted-foreground rounded-full border border-transparent transition-colors hover:border-primary cursor-pointer pointer-events-auto",
              grabbed && "bg-primary cursor-grabbing",
            )}
            style={{
              transform: `translate(${clamp(x, -containerSize.width / 2, containerSize.width / 2)}px, ${clamp(y, -containerSize.height / 2, containerSize.height / 2)}px)`,
            }}
          />
        </div>
      </div>
    )
  },
  (prevProps, nextProps) =>
    prevProps.className === nextProps.className &&
    prevProps.disableVertical === nextProps.disableVertical,
)

Joystick.displayName = "Joystick"
