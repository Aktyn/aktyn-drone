import L, { type LatLngExpression } from "leaflet"
import { MapContainer, Marker, TileLayer } from "react-leaflet"

import "leaflet/dist/leaflet.css"

interface MapProps {
  latitude: number
  longitude: number
}

export function Map({ latitude, longitude }: MapProps) {
  const position: LatLngExpression = [latitude, longitude]

  return (
    <div className="flex-grow flex flex-col *:flex-grow *:h-full *:w-full animate-in fade-in">
      <MapContainer center={position} zoom={13} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={greenIcon} />
      </MapContainer>
    </div>
  )
}

const greenIcon = L.icon({
  iconUrl: "/drone-marker.png",

  iconSize: [48, 48],
  iconAnchor: [24, 24],
})
