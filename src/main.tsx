import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppRouter from '@/app/guards/Router'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; 
import './index.css'




createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>
)
