import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from './supabase'

type Ligne = {
  date: string
  libelle: string
  debit: number | null
  credit: number | null
  categorie: string | null
  sous_categorie: string | null
  tiers: string | null
  source: string
  user_id?: string
}

function convertirDate(dateString: string): string {
    const [jour, mois, annee] = dateString.split('/')
    return `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}` // format ISO → YYYY-MM-DD
}
function classerParMotClef(libelle: string): {
  categorie: string | null
  sous_categorie: string | null
  tiers: string | null
} {
  const texte = libelle.toLowerCase()

  if (texte.includes('loyer')) {
    return { categorie: 'Revenus', sous_categorie: 'Loyer', tiers: 'Locataire' }
  }

  if (texte.includes('abonnement')) {
    return { categorie: 'Frais bancaires', sous_categorie: 'Abonnement', tiers: 'Banque' }
  }

  if (texte.includes('garage') || texte.includes('voiture')) {
    return { categorie: 'Dépenses', sous_categorie: 'Transport', tiers: 'Garage' }
  }

  if (texte.includes('sci')) {
    return { categorie: 'Transfert', sous_categorie: 'SCI', tiers: 'SCI Carpiblique' }
  }

  return { categorie: null, sous_categorie: null, tiers: null }
}

export default function ImportCSV({ session }: { session: any }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lignes, setLignes] = useState<Ligne[]>([])

  const handleFieldChange = (index: number, field: keyof Ligne, value: string) => {
    setLignes((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      const fullText = reader.result as string
      const lines = fullText.split('\n').slice(5).join('\n')

      Papa.parse(lines, {
        header: true,
        skipEmptyLines: true,
        delimiter: ';',
        quoteChar: '"',
        complete: (results: any) => {
          const rawRows = results.data
          const cleaned: Ligne[] = []
          let current: Ligne | null = null

          const normalize = (key: string) =>
            key?.toLowerCase()?.normalize('NFD')?.replace(/[\u0300-\u036f]/g, '')?.replace(/[^a-z0-9]/g, '_')

          for (const rawRow of rawRows) {
            const row: Record<string, string> = {}
            Object.entries(rawRow).forEach(([key, value]) => {
              const normalized = normalize(key)
              row[normalized] = value
            })

            const hasDate = row['date']?.trim()

            if (hasDate) {
              if (current) {
                const { categorie, sous_categorie, tiers } = classerParMotClef(current.libelle)
                current.categorie = categorie
                current.sous_categorie = sous_categorie
                current.tiers = tiers
                cleaned.push(current)
              }

              const debit = row['debit']?.replace(',', '.').replace(/\s/g, '') || null
              const credit = row['credit']?.replace(',', '.').replace(/\s/g, '') || null
              const libelleParts = [row['nature_de_l_operation'], row['libelle_interbancaire']].filter(Boolean)

              current = {
                date: convertirDate(row['date']),
                libelle: libelleParts.join(' - ').trim(),
                debit: debit ? parseFloat(debit) : null,
                credit: credit ? parseFloat(credit) : null,
                categorie: null,
                sous_categorie: null,
                tiers: null,
                source: 'csv'
              }
            } else if (current) {
              const extra = row['nature_de_l_operation'] || row['libelle_interbancaire']
              if (extra) {
                current.libelle += ` - ${extra.trim()}`
              }
            }
          }

          if (current) {
            const { categorie, sous_categorie, tiers } = classerParMotClef(current.libelle)
            current.categorie = categorie
            current.sous_categorie = sous_categorie
            current.tiers = tiers
            cleaned.push(current)
          }

          setLignes(cleaned)
        }
      })
    }

    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    if (!session?.user?.id) {
      alert('Utilisateur non connecté.')
      return
    }
      // 1) Prépare les lignes avec user_id
    const lignesAvecUser = lignes.map((l) => ({
      ...l,
      user_id: session.user.id
    }))
      // 2) On insert et on récupère les lignes insérées via .select()
       const { data: insertedRows, error } = await supabase
         .from('mouvements_bancaires')
         .insert(lignesAvecUser)
         .select()

      // 3) Gérer les éventuelles lignes de paiements (optionnel)
   if (!error && insertedRows) {
     for (const m of insertedRows) {
       if (m.credit && m.tenant_id) {
         await supabase.from('tenant_accounts').insert({
           tenant_id: m.tenant_id,
           property_id: m.property_id,
           entry_date: m.date,
           type: 'payment',
           amount: m.credit,
           movement_id: m.id,
           description: m.libelle
         })
       }
     }
   }


      // 4) Afficher l’alerte et remettre à zéro
    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      alert('Import réussi.')
      setLignes([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="p-4">
      <label className="block mb-2 font-medium">Importer un relevé bancaire (.csv)</label>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="border p-2 mb-4"
      />

      <p className="text-sm text-gray-600 mb-2">
        Utilisateur : <span className="font-mono">{session?.user?.email ?? 'Aucun'}</span>
      </p>


      {lignes.length > 0 && (
         <>
          <table className="w-full border text-sm mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-1">Date</th>
                <th className="border p-1">Libellé</th>
                <th className="border p-1">Débit</th>
                <th className="border p-1">Crédit</th>
                <th className="border p-1">Catégorie</th>
                <th className="border p-1">Sous-catégorie</th>
                <th className="border p-1">Tiers</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i}>
                  <td className="border p-1">{l.date}</td>
                  <td className="border p-1">{l.libelle}</td>
                  <td className="border p-1 text-right">{l.debit ?? ''}</td>
                  <td className="border p-1 text-right">{l.credit ?? ''}</td>
                  <td className="border p-1">
                    <input type="text" value={l.categorie ?? ''} onChange={(e) => handleFieldChange(i, 'categorie', e.target.value)} className="w-full px-1" />
                  </td>
                  <td className="border p-1">
                    <input type="text" value={l.sous_categorie ?? ''} onChange={(e) => handleFieldChange(i, 'sous_categorie', e.target.value)} className="w-full px-1" />
                  </td>
                  <td className="border p-1">
                    <input type="text" value={l.tiers ?? ''} onChange={(e) => handleFieldChange(i, 'tiers', e.target.value)} className="w-full px-1" />
                  </td>
                </tr>
              ))}
            </tbody>
                  </table>


          <button
            onClick={handleImport}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Importer maintenant
          </button>
        </>
      )}
    </div>
  )
}