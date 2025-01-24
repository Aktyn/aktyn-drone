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

  const homePointIcon = useMemo(
    () =>
      L.divIcon({
        className: "home-point-marker",
        html: `<span style="width: 48px; height: 48px; display: flex; justify-content: center; align-items: center; font-size: 32px;">🏠</span>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      }),
    [],
  )

  const droneIcon = useMemo(
    () =>
      L.divIcon({
        className: "drone-marker",
        html: `<span style="display: inline-block; transform: rotate(${heading}deg); transition: transform 0.2s linear"><img src="data:image/png;base64,${droneMarkerBase64}" style="width: 48px; height: 48px" /></span>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      }),
    [heading],
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
      <DroneCameraPreview
        className="absolute top-0 right-0 rounded-none rounded-bl-lg z-10 h-64 max-h-[50%] hover:opacity-25 transition-opacity"
        hideNoPreviewInfo
      />
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

const droneMarkerBase64 = `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`
