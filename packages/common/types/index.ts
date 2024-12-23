// Common types for the drone project
export interface DroneState {
  connected: boolean;
  battery?: number;
  armed?: boolean;
}
