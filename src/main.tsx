import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PaintProvider from './providers/PaintProvider.tsx'
import ReplacementProvider from './providers/ReplacementProvider.tsx'
import SettingsProvider from './providers/SettingsProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PaintProvider>
      <ReplacementProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </ReplacementProvider>
    </PaintProvider>
  </StrictMode>,
)
