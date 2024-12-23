import './index.css'

import { createRoot } from 'react-dom/client'
import { ConnectionProvider } from '~/providers/connection-provider.tsx'
import App from './App.tsx'

createRoot(document.getElementById('root') as HTMLElement).render(
  <ConnectionProvider>
    <App />
  </ConnectionProvider>,
)
