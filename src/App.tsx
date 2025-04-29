import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import Mouvements from './Mouvements'
import ImportCSV from './ImportCSV'


function App() {
    const [session, setSession] = useState<any>(null)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setSession(null)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {session ? (
                <>
                    <div className="flex justify-between items-center p-4 bg-white shadow">
                        <span className="text-sm text-gray-600">
                            Connecté en tant que {session.user.email}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                        >
                            Se déconnecter
                        </button>
                    </div>
                    <ImportCSV session={session} />
                    <Mouvements session={session} />
                </>
            ) : (
                <Login />
            )}
        </div>
    )
}

export default App
