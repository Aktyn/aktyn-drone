import { clamp } from "@aktyn-drone/common"
import { memo, useEffect, useRef, useState } from "react"
import { Separator } from "~/components/ui/separator"
import { useStateToRef } from "~/hooks/useStateToRef"
import { cn } from "~/lib/utils"
import { useSettings } from "~/providers/settings-provider"

//TODO: pitch, yaw and roll strength factor for allowing more accurate control
const SMOOTH_KEYBOARD_UPDATE_SPEED = 0.002

type JoystickProps = {
  className?: string
  disableVertical?: boolean
  keyboardKeys?: [left: string, right: string, down: string, up: string]
  onChange?: (x: number, y: number) => void
}

export const Joystick = memo<JoystickProps>(
  ({ className, disableVertical, keyboardKeys, onChange }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const handleRef = useRef<HTMLDivElement>(null)

    const { settings } = useSettings()
    const { smoothKeyboardControls } = settings

    const [grabbed, setGrabbed] = useState(false)
    const [x, setX] = useState(0)
    const [y, setY] = useState(0)
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

    const containerSizeRef = useStateToRef(containerSize)
    const xRef = useStateToRef(x)
    const yRef = useStateToRef(y)

    useEffect(() => {
      const container = containerRef.current
      const handle = handleRef.current
      if (!container || !handle) {
        return
      }

      let mounted = true

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

      const keyboardTarget = [0, 0]
      let lastTimestamp = 0
      if (smoothKeyboardControls) {
        const smoothKeyboardUpdate = (timestamp: number) => {
          if (!mounted) {
            return
          }

          const deltaTime = timestamp - lastTimestamp
          lastTimestamp = timestamp

          if (keyboardTarget[0] !== 0 || keyboardTarget[1] !== 0) {
            const newX =
              xRef.current +
              keyboardTarget[0] * deltaTime * SMOOTH_KEYBOARD_UPDATE_SPEED
            const newY =
              yRef.current +
              keyboardTarget[1] * deltaTime * SMOOTH_KEYBOARD_UPDATE_SPEED
            update(clamp(newX, -1, 1), clamp(newY, -1, 1))
          }

          requestAnimationFrame(smoothKeyboardUpdate)
        }
        smoothKeyboardUpdate(0)
      }

      const update = (x: number | undefined, y: number | undefined) => {
        setX(x ?? xRef.current)
        setY(y ?? yRef.current)
        onChange?.(x ?? xRef.current, y ?? yRef.current)
      }

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
        update(0, 0)
        keyboardTarget[0] = keyboardTarget[1] = 0
        setTimeout(() => {
          update(0, 0)
        }, 16)

        setGrabbed(false)
        grabPosition = null
      }

      const onMove = (event: PointerEvent) => {
        if (!grabPosition || grabPosition.pointerId !== event.pointerId) {
          return
        }

        const deltaX = event.clientX - grabPosition.x
        const deltaY = disableVertical ? 0 : event.clientY - grabPosition.y

        update(
          clamp((deltaX / containerSizeRef.current.width) * 2, -1, 1),
          -clamp((deltaY / containerSizeRef.current.height) * 2, -1, 1),
        )
      }

      const onKeyDown = (event: KeyboardEvent) => {
        if (!keyboardKeys) {
          return
        }

        const set = (x: number | undefined, y: number | undefined) => {
          if (smoothKeyboardControls) {
            keyboardTarget[0] = x ?? keyboardTarget[0]
            keyboardTarget[1] = y ?? keyboardTarget[1]
          } else {
            update(x, y)
          }
        }

        switch (event.key) {
          case keyboardKeys[0]:
            set(-1, undefined)
            break
          case keyboardKeys[1]:
            set(1, undefined)
            break
          case keyboardKeys[2]:
            if (!disableVertical) {
              set(undefined, -1)
            }
            break
          case keyboardKeys[3]:
            if (!disableVertical) {
              set(undefined, 1)
            }
            break
        }

        if (keyboardKeys.includes(event.key)) {
          event.preventDefault()
          event.stopPropagation()
        }
      }

      const onKeyUp = (event: KeyboardEvent) => {
        if (!keyboardKeys) {
          return
        }

        if (event.key === keyboardKeys[0] || event.key === keyboardKeys[1]) {
          update(0, undefined)
          keyboardTarget[0] = 0
          setTimeout(() => {
            update(0, undefined)
          }, 16)
        }

        if (event.key === keyboardKeys[2] || event.key === keyboardKeys[3]) {
          update(undefined, 0)
          keyboardTarget[1] = 0
          setTimeout(() => {
            update(undefined, 0)
          }, 16)
        }

        if (keyboardKeys.includes(event.key)) {
          event.preventDefault()
          event.stopPropagation()
        }
      }

      handle.addEventListener("pointerdown", onGrab)
      document.addEventListener("pointerup", onRelease)
      document.addEventListener("pointercancel", onRelease)
      document.addEventListener("pointermove", onMove)
      document.addEventListener("keydown", onKeyDown)
      document.addEventListener("keyup", onKeyUp)

      return () => {
        handle.removeEventListener("pointerdown", onGrab)
        document.removeEventListener("pointerup", onRelease)
        document.removeEventListener("pointercancel", onRelease)
        document.removeEventListener("pointermove", onMove)
        document.removeEventListener("keydown", onKeyDown)
        document.removeEventListener("keyup", onKeyUp)
        mounted = false
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      containerSizeRef,
      disableVertical,
      smoothKeyboardControls,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ...(keyboardKeys ?? []),
    ])

    return (
      <div className={cn("w-full max-h-[50%] pointer-events-none", className)}>
        <div
          ref={containerRef}
          onContextMenu={(event) => event.preventDefault()}
          className="aspect-square max-h-full bg-background/80 mx-auto rounded-md border flex items-center justify-center select-none relative touch-none z-10"
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
              transform: `translate(${(x * containerSize.width) / 2}px, ${(-y * containerSize.height) / 2}px)`,
            }}
          />
        </div>
      </div>
    )
  },
  (prevProps, nextProps) =>
    prevProps.className === nextProps.className &&
    prevProps.disableVertical === nextProps.disableVertical &&
    JSON.stringify(prevProps.keyboardKeys) ===
      JSON.stringify(nextProps.keyboardKeys),
)

Joystick.displayName = "Joystick"
