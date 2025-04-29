import './index.css'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from './supabase'
import App from './App'
import ReactDOM from 'react-dom/client'
import React from 'react'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <SessionContextProvider supabaseClient={supabase}>
            <App />
        </SessionContextProvider>
    </React.StrictMode>
)