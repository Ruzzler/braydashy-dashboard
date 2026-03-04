import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function initApp() {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    // Dynamically inject the mock backend so GitHub pages works purely client-side
    await import('./mockBackend');
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

initApp();
