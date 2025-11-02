import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppRouter from '@/app/guards/Router'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; 
import './index.css'
import "./styles/auth.css";
import { bootstrapAuthFromStorage } from "@/api/auth";




bootstrapAuthFromStorage();


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>
)
