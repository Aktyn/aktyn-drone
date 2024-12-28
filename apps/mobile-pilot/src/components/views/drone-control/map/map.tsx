import L, { type LatLngExpression } from "leaflet"
import { Crosshair } from "lucide-react"
import { useMemo, useRef } from "react"
import { MapContainer, Marker, TileLayer } from "react-leaflet"
import { type MapRef } from "react-leaflet/MapContainer"
import { Button } from "~/components/ui/button"
import { DroneCameraPreview } from "../drone-camera-preview"

import "leaflet/dist/leaflet.css"

const defaultZoom = 17

interface MapProps {
  latitude: number
  longitude: number
  heading: number
}

export function Map({ latitude, longitude, heading = 0 }: MapProps) {
  const mapRef = useRef<MapRef>(null)
  const position: LatLngExpression = [latitude, longitude]

  const rotatedIcon = useMemo(
    () =>
      L.divIcon({
        className: "drone-marker",
        html: `<img src="/drone-marker.png" style="transform: rotate(${heading}deg); transition: transform 0.2s linear; width: 48px; height: 48px;" />`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      }),
    [heading],
  )

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
        <Marker position={position} icon={rotatedIcon} />
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
          disabled //TODO
        >
          <Crosshair />
          Center on last arm position
        </Button>
      </div>
    </div>
  )
}
