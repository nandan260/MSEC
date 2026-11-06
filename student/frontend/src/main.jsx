import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme/tokens.css'
import './theme/components.css'
import './theme/motion.css'
import './index.css'
import App from './App.jsx'
import { installFetchAuth } from './api'

installFetchAuth()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
