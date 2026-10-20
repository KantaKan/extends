import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Boot } from './ui/Boot'
import './ui/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
)
