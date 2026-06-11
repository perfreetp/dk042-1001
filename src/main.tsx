import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/store';
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
