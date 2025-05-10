// Mouvements.tsx complet avec accordéon CAF, ventilation, validation, et formulaire manuel
import {
    Box,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TextField,
    Button,
    Grid,
    Paper,
    Select,
    MenuItem
} from '@mui/material'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import ImportCSV from './ImportCSV'

export default function Mouvements({ session }: { session: any }) {
    const [mouvements, setMouvements] = useState<any[]>([])
    const [tenants, setTenants] = useState<any[]>([])
    const [openAccordion, setOpenAccordion] = useState<string | null>(null)
    const [ventilations, setVentilations] = useState<Record<string, { tenant_id: string, amount: number }[]>>({})
    const [nouvelleLigne, setNouvelleLigne] = useState({
        date: '', libelle: '', debit: '', credit: '', categorie: '', sous_categorie: '', tiers: ''
    })

    const fetchData = async () => {
        const { data: mvts } = await supabase.from('mouvements_bancaires').select('*').order('date')
        const { data: locs } = await supabase.from('tenants').select('*')
        setMouvements(mvts || [])
        setTenants(locs || [])
    }

    useEffect(() => {
        fetchData()
        const channel = supabase.channel('mouvements-realtime').on('postgres_changes', {
            event: '*', schema: 'public', table: 'mouvements_bancaires'
        }, () => fetchData()).subscribe()
        return () => supabase.removeChannel(channel)
    }, [])

    const handleChange = (champ: string, valeur: string) => {
        setNouvelleLigne(prev => ({ ...prev, [champ]: valeur }))
    }

    const ajouterMouvement = async () => {
        const { error } = await supabase.from('mouvements_bancaires').insert([{
            ...nouvelleLigne,
            debit: nouvelleLigne.debit ? parseFloat(nouvelleLigne.debit) : null,
            credit: nouvelleLigne.credit ? parseFloat(nouvelleLigne.credit) : null,
            source: 'manuel',
            user_id: session.user.id
        }])
        if (!error) {
            alert('Ligne ajoutée.')
            setNouvelleLigne({ date: '', libelle: '', debit: '', credit: '', categorie: '', sous_categorie: '', tiers: '' })
        }
    }

    const handleAddVentilation = (mvtId: string) => {
        setVentilations(prev => ({ ...prev, [mvtId]: [...(prev[mvtId] || []), { tenant_id: '', amount: 0 }] }))
    }

    const handleUpdateVentilation = (mvtId: string, index: number, field: 'tenant_id' | 'amount', value: any) => {
        setVentilations(prev => {
            const copie = [...(prev[mvtId] || [])]
            copie[index] = { ...copie[index], [field]: value }
            return { ...prev, [mvtId]: copie }
        })
    }

    const handleValiderVentilation = async (mvt: any) => {
        const lignes = ventilations[mvt.id] || []
        const tenantProps: Record<string, string> = {}

        for (const v of lignes) {
            if (!tenantProps[v.tenant_id]) {
                const { data } = await supabase.from('tenants').select('property_id').eq('id', v.tenant_id).maybeSingle()
                tenantProps[v.tenant_id] = data?.property_id || ''
            }
        }

        const insertions = lignes.filter(v => v.tenant_id && !isNaN(v.amount) && tenantProps[v.tenant_id])
            .map(v => ({
                tenant_id: v.tenant_id,
                property_id: tenantProps[v.tenant_id],
                entry_date: mvt.date,
                type: 'payment',
                amount: v.amount,
                movement_id: mvt.id,
                description: 'Part CAF ventilée'
            }))

        if (insertions.length === 0) return alert('Aucune ligne valide.')

        const { error } = await supabase.from('tenant_accounts').insert(insertions)
        if (!error) {
            await supabase.from('mouvements_bancaires').update({ ventilated: true }).eq('id', mvt.id)
            alert('Ventilation enregistrée.')
            fetchData()
        } else {
            alert('Erreur insertion.'); console.error(error)
        }
    }

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>Mouvements bancaires</Typography>
            <Paper sx={{ overflow: 'auto', mb: 3 }}>
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
                        {mouvements.map(m => {
                            const isCAF = m.libelle?.toLowerCase().includes('caf 88')
                            const isOpen = openAccordion === m.id
                            const isAssigned = !!m.tenant_id || !!m.invoice_id
                            return (
                                <>
                                    <TableRow key={m.id} style={{ backgroundColor: isAssigned ? '#d1ecf1' : undefined }}>
                                        <TableCell>{m.date}</TableCell>
                                        <TableCell>{m.libelle}</TableCell>
                                        <TableCell align="right">{m.debit}</TableCell>
                                        <TableCell align="right">{m.credit}</TableCell>
                                        <TableCell>{m.categorie}</TableCell>
                                        <TableCell>{m.sous_categorie}</TableCell>
                                        <TableCell>
                                            {isCAF && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => setOpenAccordion(isOpen ? null : m.id)}>
                                                    {m.ventilated ? 'Ventilé ✅' : 'À ventiler'}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>

                                    {isOpen && (
                                        <TableRow>
                                            <TableCell colSpan={7} style={{ backgroundColor: '#f0f2f5' }}>
                                                <Typography variant="subtitle2" sx={{ mb: 1 }}>Ventilation CAF</Typography>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>Locataire</TableCell>
                                                            <TableCell>Montant</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {(ventilations[m.id] || []).map((v, i) => (
                                                            <TableRow key={`${m.id}-${i}`}>
                                                                <TableCell>
                                                                    <Select
                                                                        fullWidth
                                                                        value={v.tenant_id}
                                                                        onChange={e => handleUpdateVentilation(m.id, i, 'tenant_id', e.target.value)}>
                                                                        {tenants.map(t => (
                                                                            <MenuItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField
                                                                        type="number"
                                                                        value={isNaN(v.amount) ? '' : v.amount}
                                                                        onChange={e => handleUpdateVentilation(m.id, i, 'amount', parseFloat(e.target.value))}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                                <Button onClick={() => handleAddVentilation(m.id)} sx={{ mt: 1, mr: 2 }}>
                                                    + Ajouter une ligne
                                                </Button>
                                                <Button variant="contained" onClick={() => handleValiderVentilation(m)}>
                                                    Valider la ventilation
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            )
                        })}
                    </TableBody>
                </Table>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>Ajouter un mouvement manuel</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField type="date" fullWidth value={nouvelleLigne.date} onChange={(e) => handleChange('date', e.target.value)} label="Date" InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField fullWidth label="Libellé" value={nouvelleLigne.libelle} onChange={(e) => handleChange('libelle', e.target.value)} />
                </Grid>
                <Grid item xs={6} md={2}>
                    <TextField fullWidth label="Débit" type="number" value={nouvelleLigne.debit} onChange={(e) => handleChange('debit', e.target.value)} />
                </Grid>
                <Grid item xs={6} md={2}>
                    <TextField fullWidth label="Crédit" type="number" value={nouvelleLigne.credit} onChange={(e) => handleChange('credit', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField fullWidth label="Catégorie" value={nouvelleLigne.categorie} onChange={(e) => handleChange('categorie', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField fullWidth label="Sous-catégorie" value={nouvelleLigne.sous_categorie} onChange={(e) => handleChange('sous_categorie', e.target.value)} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Tiers" value={nouvelleLigne.tiers} onChange={(e) => handleChange('tiers', e.target.value)} />
                </Grid>
            </Grid>

            <Button variant="contained" color="success" onClick={ajouterMouvement} sx={{ mb: 4 }}>
                Ajouter la ligne
            </Button>

            <Typography variant="h6" gutterBottom>Importer des mouvements (.csv)</Typography>
            <ImportCSV session={session} />
        </Box>
    )
}
