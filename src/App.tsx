// src/App.tsx
import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { Routes, Route, Navigate } from 'react-router-dom'

import Login from './Login'
import Dashboard from './Dashboard'
import TenantPayments from './TenantPayments'
import ImportCSV from './ImportCSV'
import Mouvements from './Mouvements'


import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import LogoutIcon from '@mui/icons-material/Logout'

export default function App() {
    const [session, setSession] = useState<any>(null)

    useEffect(() => {
        // Récupère la session existante
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })
        // Écoute les changements de session (login/logout)
        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setSession(null)
    }

    return (
        <>
            {/* Barre de navigation */}
            <AppBar position="static" color="primary">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Application de gestion SCI Carpiblique
                    </Typography>

                    {session && (
                        <>
                            <Typography variant="body2" sx={{ mr: 2 }}>
                                Connecté en tant que <strong>{session.user.email}</strong>
                            </Typography>
                            <IconButton color="inherit" onClick={handleLogout}>
                                <LogoutIcon />
                            </IconButton>
                        </>
                    )}
                </Toolbar>
            </AppBar>

            {/* Contenu principal */}
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Routes>
                    {/* dashboard */}
                    {/* si pas connecté, redirige vers /login */}
                    <Route
                        path="/"
                        element={
                            session
                                ? <Dashboard />
                                : <Navigate to="/login" replace />
                        }
                    />
                    {/* login */}
                    <Route
                        path="/login"
                        element={
                            session
                                ? <Navigate to="/" replace />
                                : <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                                    <Login />
                                </Box>
                        }
                    />
                    {/* page mouvements + import */}
                    <Route
                        path="/movements"
                        element={
                            session
                             ? <>
                                <ImportCSV session={session} />
                                <Mouvements session={session} />
                               </>
                               : <Navigate to="/login" replace />
                        }
                    />
                    {/* paiements locataire */}
                    <Route
                        path="/tenants/:id/payments"
                        element={
                            session
                                ? <TenantPayments />
                                : <Navigate to="/login" replace />
                        }
                    />

                    {/* catch-all, renvoie au dashboard si connecté, ou login sinon */}
                    <Route
                        path="*"
                        element={<Navigate to={session ? "/" : "/login"} replace />}
                    />
                </Routes>
            </Container>
        </>
    )
}