import L, { type LatLngExpression } from "leaflet"
import { Crosshair, TriangleAlert } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import droneMarker from "~/assets/drone-marker.png"
import { cn } from "~/lib/utils"

const defaultZoom = 17

interface MapProps {
  latitude: number
  longitude: number
  satellites: number
  heading: number
}

export function Map({
  latitude,
  longitude,
  satellites,
  heading = 0,
}: MapProps) {
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
        html: `<img src="${droneMarker}" style="transform: rotate(${heading}deg); transition: transform 0.2s linear; width: 48px; height: 48px; z-index: 10;" />`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      }),
    [heading],
  )

  const homePointIcon = useMemo(
    () =>
      L.divIcon({
        className: "home-point-marker",
        html: `<span style="width: 48px; height: 48px; display: flex; justify-content: center; align-items: center; font-size: 32px; z-index: 1;">🏠</span>`,
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

  const centerAt = useCallback((position: LatLngExpression) => {
    mapRef.current?.setView(
      position,
      mapRef.current?.getZoom() ?? defaultZoom,
      {
        animate: true,
        duration: 0.4,
      },
    )
  }, [])

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
        {homePoint && (
          <Marker
            position={[homePoint.latitude, homePoint.longitude]}
            icon={homePointIcon}
          />
        )}
        <Marker position={position} icon={droneIcon} />
      </MapContainer>
      <DroneCameraPreview className="absolute top-0 right-0 rounded-none rounded-bl-lg z-10 h-64 max-h-[50%] hover:opacity-25 transition-opacity" />
      <div className="absolute bottom-2 right-2 flex flex-col gap-y-2 [&>button]:bg-background/50 [&>button]:backdrop-blur-md">
        <div className="flex flex-row items-center text-lg text-background [text-shadow:0_0_2px_#fff] whitespace-nowrap">
          Satellites:&nbsp;<strong>{satellites}</strong>&nbsp;
          <span
            className={cn(
              "bg-orange-600 p-2 rounded-full inline-flex items-center justify-center transition-opacity",
              satellites < 3 ? "opacity-100" : "opacity-0",
            )}
          >
            <TriangleAlert className="inline align-middle text-orange-100" />
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => centerAt(position)}>
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
            centerAt([homePoint.latitude, homePoint.longitude])
          }}
        >
          <Crosshair />
          Center on home point
        </Button>
      </div>
    </div>
  )
}
