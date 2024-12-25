import L, { type LatLngExpression } from "leaflet"
import { MapContainer, Marker, TileLayer } from "react-leaflet"
import { DroneCameraPreview } from "./drone-camera-preview"

import "leaflet/dist/leaflet.css"

interface MapProps {
  latitude: number
  longitude: number
}

export function Map({ latitude, longitude }: MapProps) {
  const position: LatLngExpression = [latitude, longitude]

  return (
    <div className="flex-grow flex flex-col first:*:flex-grow first:*:h-full first:*:w-full animate-in fade-in relative">
      <MapContainer
        className="z-0"
        center={position}
        zoom={13}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={greenIcon} />
      </MapContainer>
      <DroneCameraPreview className="absolute top-0 right-0 rounded-none rounded-bl-lg aspect-[4/3] z-10 h-64 max-h-[50%] hover:opacity-25 transition-opacity" />
    </div>
  )
}

const greenIcon = L.icon({
  iconUrl: "/drone-marker.png",

  iconSize: [48, 48],
  iconAnchor: [24, 24],
})
