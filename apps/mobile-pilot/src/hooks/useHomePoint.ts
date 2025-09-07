import { MessageType } from "@aktyn-drone/common"
import { useEffect, useState } from "react"
import {
  useConnection,
  useConnectionMessageHandler,
} from "~/providers/connection-provider"

export function useHomePoint() {
  const { send } = useConnection()

  const [homePoint, setHomePoint] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  useEffect(() => {
    send({
      type: MessageType.REQUEST_HOME_POINT,
      data: {},
    })
  }, [send])

  useConnectionMessageHandler((message) => {
    switch (message.type) {
      case MessageType.HOME_POINT_COORDINATES:
        setHomePoint(message.data)
        break
    }
  })

  return homePoint
}
