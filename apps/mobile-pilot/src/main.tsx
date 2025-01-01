import "./index.css"

import { createRoot } from "react-dom/client"
import { ConnectionProvider } from "~/providers/connection-provider.tsx"
import App from "./App.tsx"
import { SettingsProvider } from "./providers/settings-provider"

createRoot(document.getElementById("root") as HTMLElement).render(
  <ConnectionProvider>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </ConnectionProvider>,
)
