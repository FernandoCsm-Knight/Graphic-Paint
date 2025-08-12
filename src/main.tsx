import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PaintProvider from './providers/PaintProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PaintProvider>
      <App />
    </PaintProvider>
  </StrictMode>,
)
