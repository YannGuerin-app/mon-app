import {
    Box,
    Button,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TextField,
    Paper
} from '@mui/material'    

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from './supabase'
import md5 from 'md5'

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

const getPropertyIdForTenant = async (tenantId: string) => {
    const { data, error } = await supabase
        .from('tenants')
        .select('property_id')
        .eq('id', tenantId)
        .single()

    if (error) {
        console.error(`Erreur en récupérant le property_id pour le locataire ${tenantId}`, error)
        return null
    }

    return data?.property_id
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

      const tenantMappings: Record<string, string> = {
          'SCHLIENGER': '226da70f-0f7e-4e5e-a04e-1b135b6ca0f1',
          'RODRIGUEZ': 'a646b7d9-6a1a-4dde-8a15-21f9421840f3',
          'SAIZY': 'b86046a6-bd28-4276-bdfa-214404c0af1a',
          'ROLLIN': '5cb4ba9f-d4a8-4a3f-8a2f-a1ec6790822a',
          'ROHDE': '58e5f5cb-4d22-4794-aa7f-eec994de68db',
          'JOLLY': '19f924ca-ef2b-4e9a-bb03-c4e4aeaa90c7',
          'HARAND': '953fca80-bd4c-4bf2-bdc9-7222cc2ecc51',
          'LAURENT': '46767f2e-7a84-4cf8-85cc-943f32e4a281'
      }

      const lignesAvecUser = lignes.map((l) => {
          const libelle = l.libelle.toLowerCase()
          let tenant_id = null

          for (const motcle of Object.keys(tenantMappings)) {
              if (libelle.includes(motcle.toLowerCase())) {
                  tenant_id = tenantMappings[motcle]
                  break
              }
          }

          // 🧠 Génère le hash pour empêcher les doublons
          const hash = md5(`${l.date}|${l.libelle.trim()}|${l.credit ?? ''}|${l.debit ?? ''}`)

          return {
              ...l,
              user_id: session.user.id,
              tenant_id,
              unique_hash: hash
          }
      })
      type MouvementInsert = {
          date: string
          libelle: string
          debit: number | null
          credit: number | null
          categorie: string | null
          sous_categorie: string | null
          tiers: string | null
          source: string
          user_id: string
          tenant_id?: string
          unique_hash: string
      }

      const { data: insertedRows, error: insertError } = await supabase
          .from('mouvements_bancaires')
          .upsert<MouvementInsert>(lignesAvecUser, { onConflict: ['unique_hash'], ignoreDuplicates: true })
          .select()

      console.log('🧾 Lignes envoyées à Supabase :', lignesAvecUser.length)
      console.log('📥 Lignes insérées retournées :', insertedRows?.length)
      

      if (insertError) {
          alert('Erreur : ' + insertError.message)
          return
      }

      for (let m of insertedRows) {
          if (m.credit && m.tenant_id) {
              const property_id = await getPropertyIdForTenant(m.tenant_id)
              if (!property_id) {
                  console.warn(`⚠️ Aucune propriété trouvée pour le locataire ${m.tenant_id}, paiement ignoré.`)
                  return
              }

              console.log(`💰 Paiement détecté : ${m.credit} € de ${m.tenant_id} sur ${m.date}`)

              const { error } = await supabase.from('tenant_accounts').upsert([{
                  tenant_id: m.tenant_id,
                  property_id,
                  entry_date: m.date,
                  type: 'payment',
                  debit: m.debit ?? null,
                  credit: m.credit ?? null,
                  movement_id: m.id,
                  description: m.libelle
              }], {
                  onConflict: ['movement_id'],
                  ignoreDuplicates: true
              })

              if (error) {
                  console.error(`❌ Erreur lors de l'insertion du paiement (mvt ${m.id}) :`, error)
              }

          } else if (m.debit && m.tenant_id) {
              const property_id = await getPropertyIdForTenant(m.tenant_id)
              if (!property_id) {
                  console.warn(`⚠️ Aucune propriété trouvée pour le locataire ${m.tenant_id}, remboursement ignoré.`)
                  return
              }

              console.log(`💸 Remboursement détecté : ${m.debit} € de ${m.tenant_id} sur ${m.date}`)

              const { error } = await supabase.from('tenant_accounts').upsert([{
                  tenant_id: m.tenant_id,
                  property_id,
                  entry_date: m.date,
                  type: 'refund',
                  debit: m.debit ?? null,
                  credit: m.credit ?? null,
                  movement_id: m.id,
                  description: m.libelle
              }], {
                  onConflict: ['movement_id'],
                  ignoreDuplicates: true
              })

              if (error) {
                  console.error(`❌ Erreur lors de l'insertion du remboursement (mvt ${m.id}) :`, error)
              }
          }
      }

      alert('Import réussi.')
      setLignes([])
      if (fileInputRef.current) fileInputRef.current.value = ''


      
  }

    return (
    
    <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
            Importer un relevé bancaire (.csv)
        </Typography>

        <Button variant="contained" component="label" sx={{ mb: 2 }}>
            Choisir un fichier
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                hidden
                onChange={handleFile}
            />
        </Button>

        <Typography variant="body2" color="textSecondary" gutterBottom>
            Utilisateur : <code>{session?.user?.email ?? 'Aucun'}</code>
        </Typography>

        {lignes.length > 0 && (
            <>
                <Paper sx={{ overflow: 'auto', mb: 2 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Libellé</TableCell>
                                <TableCell align="right">Débit</TableCell>
                                <TableCell align="right">Crédit</TableCell>
                                <TableCell>Catégorie</TableCell>
                                <TableCell>Sous-catégorie</TableCell>
                                <TableCell>Tiers</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lignes.map((l, i) => (
                                <TableRow key={i}>
                                    <TableCell>{l.date}</TableCell>
                                    <TableCell>{l.libelle}</TableCell>
                                    <TableCell align="right">{l.debit ?? ''}</TableCell>
                                    <TableCell align="right">{l.credit ?? ''}</TableCell>
                                    <TableCell>
                                        <TextField
                                            variant="standard"
                                            fullWidth
                                            value={l.categorie ?? ''}
                                            onChange={(e) => handleFieldChange(i, 'categorie', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            variant="standard"
                                            fullWidth
                                            value={l.sous_categorie ?? ''}
                                            onChange={(e) => handleFieldChange(i, 'sous_categorie', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            variant="standard"
                                            fullWidth
                                            value={l.tiers ?? ''}
                                            onChange={(e) => handleFieldChange(i, 'tiers', e.target.value)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>

                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleImport}
                >
                    Importer maintenant
                </Button>
            </>
        )}
    </Box>

  )
}