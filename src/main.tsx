// src/main.tsx
import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from './supabase'
import App from './App'
import { BrowserRouter } from 'react-router-dom'

// MUI
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

// Création du thème Material UI
const theme = createTheme({
    palette: {
        primary: { main: '#1976d2' },
        secondary: { main: '#9c27b0' },
    },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <SessionContextProvider supabaseClient={supabase}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                    <BrowserRouter>
                        <App />
                    </BrowserRouter>
            </ThemeProvider>
        </SessionContextProvider>
    </React.StrictMode>
)
