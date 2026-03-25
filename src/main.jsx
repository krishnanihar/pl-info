import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../post-listener-visual.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
