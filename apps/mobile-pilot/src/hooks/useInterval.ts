import { useEffect, type DependencyList } from "react"
import { useStateToRef } from "./useStateToRef"

export function useInterval(
  callback: () => void,
  /** Milliseconds */
  delay: number,
  deps: DependencyList = [],
) {
  const callbackRef = useStateToRef(callback)

  useEffect(() => {
    if (delay == null || delay < 0) return

    const id = setInterval(() => {
      callbackRef.current()
    }, delay)

    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, ...deps])
}
