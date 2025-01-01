import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from "react"
import { CAMERA_RESOLUTION_KEY, CAMERA_RESOLUTIONS } from "~/lib/consts"

const SettingsContext = createContext({
  cameraResolution: CAMERA_RESOLUTIONS[0],
  setCameraResolution: (_resolution: (typeof CAMERA_RESOLUTIONS)[number]) => {},
})

export const SettingsProvider = ({ children }: PropsWithChildren) => {
  const [cameraResolution, internalSetCameraResolution] = useState(
    getCameraResolutionFromLocalStorage(),
  )

  const setCameraResolution = useCallback(
    (resolution: (typeof CAMERA_RESOLUTIONS)[number]) => {
      localStorage.setItem(CAMERA_RESOLUTION_KEY, JSON.stringify(resolution))
      internalSetCameraResolution(resolution)
    },
    [],
  )

  return (
    <SettingsContext.Provider value={{ cameraResolution, setCameraResolution }}>
      {children}
    </SettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => useContext(SettingsContext)

function getCameraResolutionFromLocalStorage() {
  try {
    const item = localStorage.getItem(CAMERA_RESOLUTION_KEY)
    if (item) {
      return JSON.parse(item)
    }
  } catch (error) {
    console.error(error)
  }
  return CAMERA_RESOLUTIONS[0]
}
