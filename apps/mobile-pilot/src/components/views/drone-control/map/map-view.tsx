import { type LatLngExpression } from "leaflet"
import { Crosshair, TriangleAlert } from "lucide-react"
import { useCallback, useRef } from "react"
import { type MapRef } from "react-leaflet/MapContainer"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { DroneCameraPreview } from "../drone-camera-preview.js"

import "leaflet/dist/leaflet.css"
import { DEFAULT_ZOOM, Map } from "./map.js"
import { useHomePoint } from "~/hooks/useHomePoint.js"

interface MapProps {
  latitude: number
  longitude: number
  satellites: number
  heading: number
}

export function MapView({
  latitude,
  longitude,
  satellites,
  heading = 0,
}: MapProps) {
  const mapRef = useRef<MapRef>(null)
  const position: LatLngExpression = [latitude, longitude]

  const homePoint = useHomePoint()

  const centerAt = useCallback((position: LatLngExpression) => {
    mapRef.current?.setView(
      position,
      mapRef.current?.getZoom() ?? DEFAULT_ZOOM,
      {
        animate: true,
        duration: 0.4,
      },
    )
  }, [])

  return (
    <div className="flex-grow flex flex-col *:first:flex-grow *:first:h-full *:first:w-full animate-in fade-in relative">
      <Map
        ref={mapRef}
        className="z-0"
        center={position}
        homePoint={homePoint}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        heading={heading}
      />
      <DroneCameraPreview
        className="absolute top-0 right-0 rounded-none rounded-bl-lg z-10 h-64 max-h-[50%] hover:opacity-25 transition-opacity"
        hideNoPreviewInfo
      />
      <div className="absolute bottom-2 right-2 flex flex-col gap-y-2 [&>button]:bg-background/50 [&>button]:backdrop-blur-md bg-background/50 backdrop-blur-md rounded-lg p-4 border">
        <div className="flex flex-row items-center text-lg text-foreground [text-shadow:0_0_2px_var(--background)] whitespace-nowrap">
          Satellites:&nbsp;<strong>{satellites}</strong>&nbsp;
          <span
            className={cn(
              "bg-orange-500 p-2 rounded-full inline-flex items-center justify-center transition-opacity",
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
