import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function Mouvements({ session }: { session: any }) {
    const [mouvements, setMouvements] = useState<any[]>([])
    const [nouvelleLigne, setNouvelleLigne] = useState({
        date: '',
        libelle: '',
        debit: '',
        credit: '',
        categorie: '',
        sous_categorie: '',
        tiers: '',
    })
    const handleChange = (champ: string, valeur: string) => {
        setNouvelleLigne(prev => ({ ...prev, [champ]: valeur }))
    }
    const ajouterMouvement = async () => {
        if (!session?.user?.id) {
            alert("Utilisateur non connecté.")
            return
        }

        const { date, libelle, debit, credit, categorie, sous_categorie, tiers } = nouvelleLigne

        const { error } = await supabase.from('mouvements_bancaires').insert([
            {
                date,
                libelle,
                debit: debit ? parseFloat(debit) : null,
                credit: credit ? parseFloat(credit) : null,
                categorie,
                sous_categorie,
                tiers,
                source: 'manuel',
                user_id: session.user.id // ✅ ici
            }
        ])

        if (error) {
            alert('Erreur : ' + error.message)
        } else {
            alert('Ligne ajoutée.')
            setNouvelleLigne({
                date: '',
                libelle: '',
                debit: '',
                credit: '',
                categorie: '',
                sous_categorie: '',
                tiers: '',
            })
            fetchData()
        }
    }

    const fetchData = async () => {
        const { data, error } = await supabase
            .from('mouvements_bancaires')
            .select('*')
            .order('date', { ascending: true })

        if (error) {
            console.error(error)
        } else {
            setMouvements(data || [])
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <div className="p-4 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Mouvements bancaires</h1>
            <table className="w-full border text-sm">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border p-2">Date</th>
                        <th className="border p-2">Libellé</th>
                        <th className="border p-2">Débit</th>
                        <th className="border p-2">Crédit</th>
                        <th className="border p-2">Catégorie</th>
                        <th className="border p-2">Sous-catégorie</th>
                        <th className="border p-2">Tiers</th>
                    </tr>
                </thead>
                <tbody>
                    {mouvements.map((m, i) => (
                        <tr key={i}>
                            <td className="border p-2">{m.date}</td>
                            <td className="border p-2">{m.libelle}</td>
                            <td className="border p-2 text-right">{m.debit ?? ''}</td>
                            <td className="border p-2 text-right">{m.credit ?? ''}</td>
                            <td className="border p-2">{m.categorie ?? ''}</td>
                            <td className="border p-2">{m.sous_categorie ?? ''}</td>
                            <td className="border p-2">{m.tiers ?? ''}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <input type="date" className="border p-2" value={nouvelleLigne.date} onChange={(e) => handleChange('date', e.target.value)} />
                <input type="text" className="border p-2" placeholder="Libellé" value={nouvelleLigne.libelle} onChange={(e) => handleChange('libelle', e.target.value)} />
                <input type="number" className="border p-2" placeholder="Débit" value={nouvelleLigne.debit} onChange={(e) => handleChange('debit', e.target.value)} />
                <input type="number" className="border p-2" placeholder="Crédit" value={nouvelleLigne.credit} onChange={(e) => handleChange('credit', e.target.value)} />
                <input type="text" className="border p-2" placeholder="Catégorie" value={nouvelleLigne.categorie} onChange={(e) => handleChange('categorie', e.target.value)} />
                <input type="text" className="border p-2" placeholder="Sous-catégorie" value={nouvelleLigne.sous_categorie} onChange={(e) => handleChange('sous_categorie', e.target.value)} />
                <input type="text" className="border p-2" placeholder="Tiers" value={nouvelleLigne.tiers} onChange={(e) => handleChange('tiers', e.target.value)} />
            </div>
            <button
                onClick={ajouterMouvement}
                className="mb-6 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
                Ajouter la ligne
            </button>

        </div>
    )

}
