import L, { type LatLngExpression } from "leaflet"
import { Crosshair } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { MapContainer, Marker, TileLayer } from "react-leaflet"
import { type MapRef } from "react-leaflet/MapContainer"
import { Button } from "~/components/ui/button"
import { DroneCameraPreview } from "../drone-camera-preview"

import { MessageType } from "@aktyn-drone/common"
import "leaflet/dist/leaflet.css"
import {
  useConnection,
  useConnectionMessageHandler,
} from "~/providers/connection-provider"

const defaultZoom = 17

interface MapProps {
  latitude: number
  longitude: number
  heading: number
}

export function Map({ latitude, longitude, heading = 0 }: MapProps) {
  const { send } = useConnection()

  const mapRef = useRef<MapRef>(null)
  const position: LatLngExpression = [latitude, longitude]

  const [homePoint, setHomePoint] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const droneIcon = useMemo(
    () =>
      L.divIcon({
        className: "drone-marker",
        html: `<img src="/drone-marker.png" style="transform: rotate(${heading}deg); transition: transform 0.2s linear; width: 48px; height: 48px;" />`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      }),
    [heading],
  )

  const homePointIcon = useMemo(
    () =>
      L.divIcon({
        className: "home-point-marker",
        html: `<span style="width: 48px; height: 48px; display: flex; justify-content: center; align-items: center; font-size: 48px;">🏠</span>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      }),
    [],
  )

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

  return (
    <div className="flex-grow flex flex-col first:*:flex-grow first:*:h-full first:*:w-full animate-in fade-in relative">
      <MapContainer
        ref={mapRef}
        className="z-0"
        center={position}
        zoom={defaultZoom}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={droneIcon} />
        {homePoint && (
          <Marker
            position={[homePoint.latitude, homePoint.longitude]}
            icon={homePointIcon}
          />
        )}
      </MapContainer>
      <DroneCameraPreview className="absolute top-0 right-0 rounded-none rounded-bl-lg z-10 h-64 max-h-[50%] hover:opacity-25 transition-opacity" />
      <div className="absolute bottom-2 right-2 flex flex-col gap-y-2 *:bg-background/50 *:backdrop-blur-md">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            mapRef.current?.setView(
              position,
              mapRef.current?.getZoom() ?? defaultZoom,
              {
                animate: true,
                duration: 0.4,
              },
            )
          }}
        >
          <Crosshair />
          Center on drone
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!homePoint}
          onClick={() => {
            if (!homePoint) {
              return
            }
            mapRef.current?.setView(
              [homePoint.latitude, homePoint.longitude],
              defaultZoom,
            )
          }}
        >
          <Crosshair />
          Center on home point
        </Button>
      </div>
    </div>
  )
}
