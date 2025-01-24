import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
} from "react"
import { defaultSettings, SETTINGS_KEY } from "~/lib/consts"
import { useGlobalState } from "../hooks/useGlobalState"

type SettingsValueSetter = <KeyType extends keyof typeof defaultSettings>(
  key: KeyType,
  value: (typeof defaultSettings)[KeyType],
) => void

const SettingsContext = createContext<{
  settings: typeof defaultSettings
  setSettingsValue: SettingsValueSetter
}>({
  settings: defaultSettings,
  setSettingsValue: (_key, _value) => {},
})

export const SettingsProvider = ({ children }: PropsWithChildren) => {
  const [settings, internalSetSettings] = useGlobalState(
    SETTINGS_KEY,
    defaultSettings,
    localStorage,
  )

  const setSettingsValue = useCallback<SettingsValueSetter>(
    (key, value) => {
      internalSetSettings((prev) => ({ ...prev, [key]: value }))
    },
    [internalSetSettings],
  )

  return (
    <SettingsContext.Provider
      value={{
        settings: settings ?? defaultSettings,
        setSettingsValue,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => useContext(SettingsContext)
