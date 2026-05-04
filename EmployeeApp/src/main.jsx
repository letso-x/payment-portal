import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import EmployeePortal from './EmployeePortal.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EmployeePortal />
  </StrictMode>,
)
