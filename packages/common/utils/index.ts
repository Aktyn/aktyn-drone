// Common utilities for the drone project
export function isValidDroneState(state: unknown): boolean {
  if (typeof state !== "object" || state === null) {
    return false;
  }

  return "connected" in state && typeof state.connected === "boolean";
}
