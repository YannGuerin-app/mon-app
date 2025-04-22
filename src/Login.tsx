// src/Login.tsx
import { useState } from 'react'
import { supabase } from './supabase'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async () => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            alert('Erreur : ' + error.message)
        }
    }

    return (
        <div className="p-4 max-w-md mx-auto">
            <h1 className="text-xl font-bold mb-4">Connexion</h1>
            <input
                className="border p-2 w-full mb-2"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                className="border p-2 w-full mb-2"
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button
                className="bg-blue-600 text-white px-4 py-2 rounded w-full"
                onClick={handleLogin}
            >
                Se connecter
            </button>
        </div>
    )
}