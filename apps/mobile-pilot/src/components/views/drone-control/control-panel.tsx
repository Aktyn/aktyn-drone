import { DroneCameraPreview } from "./drone-camera-preview"
import { DroneOrientationWidget } from "./drone-orientation-widget"

export function ControlPanel() {
  return (
    <div className="flex-grow flex items-center justify-center overflow-hidden max-h-full animate-in fade-in">
      <DroneOrientationWidget />
      <DroneCameraPreview />
    </div>
  )
}
