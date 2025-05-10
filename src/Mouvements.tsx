// Mouvements.tsx complet avec accordéon CAF, ventilation, validation, correction, et formulaire manuel
import React from 'react'
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
        const { data: accounts } = await supabase
            .from('tenant_accounts')
            .select('movement_id, tenant_id, amount')
            .eq('type', 'payment')

        const groupByMvt: Record<string, { tenant_id: string, amount: number }[]> = {}
        for (const row of accounts || []) {
            if (!groupByMvt[row.movement_id]) groupByMvt[row.movement_id] = []
            groupByMvt[row.movement_id].push({ tenant_id: row.tenant_id, amount: row.amount })
        }

        setMouvements(mvts || [])
        setTenants(locs || [])
        setVentilations(groupByMvt)
    }

    useEffect(() => {
        fetchData()
        const channel = supabase.channel('mouvements-realtime').on('postgres_changes', {
            event: '*', schema: 'public', table: 'mouvements_bancaires'
        }, () => fetchData()).subscribe()
        return () => supabase.removeChannel(channel)
    }, [])

    const getNomLocataire = (id: string) => {
        const loc = tenants.find(t => t.id === id)
        return loc ? `${loc.first_name} ${loc.last_name}` : id
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

        const totalVentile = insertions.reduce((acc, v) => acc + v.amount, 0)
        const credit = parseFloat(mvt.credit)

        if (totalVentile !== credit) {
            alert(`Total ventilé (${totalVentile} €) différent du montant CAF (${credit} €).`)
            return
        }

        const { error: insertError } = await supabase
            .from('tenant_accounts')
            .upsert(insertions, { onConflict: ['movement_id', 'tenant_id'] })

        if (insertError) {
            console.error('Erreur insertion ventilation :', insertError)
            alert('Erreur lors de l\'insertion dans tenant_accounts.')
            return
        }

        const { error: updateError } = await supabase.from('mouvements_bancaires').update({ ventilated: true }).eq('id', mvt.id)
        if (updateError) {
            console.error('Erreur mise à jour du mouvement :', updateError)
            alert('Erreur lors de la mise à jour du mouvement.')
            return
        }

        alert('Ventilation enregistrée.')
        setOpenAccordion(null)
        fetchData()
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
                            <TableCell>Tiers / Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {mouvements.map((m) => {
                            const isCAF = m.libelle?.toLowerCase().includes('caf 88')
                            const isOpen = openAccordion === m.id
                            const isVentile = m.ventilated || m.tenant_id || m.invoice_id
                            const resume = m.ventilated && ventilations[m.id] && ventilations[m.id].length > 0
                                ? <Typography variant="body2" fontSize={14}>
                                    <br />REPARTITION :<br />
                                    {ventilations[m.id].map(v => (
                                        <div key={v.tenant_id}>{getNomLocataire(v.tenant_id)} : {v.amount}€</div>
                                    ))}
                                </Typography>
                                : ''

                            return (
                                <React.Fragment key={m.id}>
                                    <TableRow style={{ backgroundColor: isVentile ? '#d1ecf1' : undefined }}>
                                        <TableCell>{m.date}</TableCell>
                                        <TableCell>{m.libelle}{resume}</TableCell>
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
                                                    {m.ventilated ? 'Modifier ventilation' : 'À ventiler'}
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
                                                        {(ventilations[m.id] || []).map((v, idx) => (
                                                            <TableRow key={`${m.id}-${idx}`}>
                                                                <TableCell>
                                                                    <Select
                                                                        fullWidth
                                                                        value={v.tenant_id}
                                                                        onChange={e => {
                                                                            const copie = [...(ventilations[m.id] || [])]
                                                                            copie[idx].tenant_id = e.target.value
                                                                            setVentilations({ ...ventilations, [m.id]: copie })
                                                                        }}>
                                                                        {tenants.map(t => (
                                                                            <MenuItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField
                                                                        type="number"
                                                                        value={isNaN(v.amount) ? '' : v.amount}
                                                                        onChange={e => {
                                                                            const copie = [...(ventilations[m.id] || [])]
                                                                            copie[idx].amount = parseFloat(e.target.value)
                                                                            setVentilations({ ...ventilations, [m.id]: copie })
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                                <Button onClick={() => {
                                                    setVentilations(prev => ({
                                                        ...prev,
                                                        [m.id]: [...(prev[m.id] || []), { tenant_id: '', amount: 0 }]
                                                    }))
                                                }} sx={{ mt: 1, mr: 2 }}>
                                                    + Ajouter une ligne
                                                </Button>
                                                <Button variant="contained" onClick={() => handleValiderVentilation(m)}>
                                                    Valider la ventilation
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </TableBody>
                </Table>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>Ajouter un mouvement manuel</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField type="date" fullWidth value={nouvelleLigne.date} onChange={(e) => setNouvelleLigne({ ...nouvelleLigne, date: e.target.value })} label="Date" InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField fullWidth label="Libellé" value={nouvelleLigne.libelle} onChange={(e) => setNouvelleLigne({ ...nouvelleLigne, libelle: e.target.value })} />
                </Grid>
                <Grid item xs={6} md={2}>
                    <TextField fullWidth label="Débit" type="number" value={nouvelleLigne.debit} onChange={(e) => setNouvelleLigne({ ...nouvelleLigne, debit: e.target.value })} />
                </Grid>
                <Grid item xs={6} md={2}>
                    <TextField fullWidth label="Crédit" type="number" value={nouvelleLigne.credit} onChange={(e) => setNouvelleLigne({ ...nouvelleLigne, credit: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField fullWidth label="Catégorie" value={nouvelleLigne.categorie} onChange={(e) => setNouvelleLigne({ ...nouvelleLigne, categorie: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField fullWidth label="Sous-catégorie" value={nouvelleLigne.sous_categorie} onChange={(e) => setNouvelleLigne({ ...nouvelleLigne, sous_categorie: e.target.value })} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Tiers" value={nouvelleLigne.tiers} onChange={(e) => setNouvelleLigne({ ...nouvelleLigne, tiers: e.target.value })} />
                </Grid>
            </Grid>

            <Button variant="contained" color="success" onClick={async () => {
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
                    fetchData()
                }
            }} sx={{ mb: 4 }}>
                Ajouter la ligne
            </Button>

            <Typography variant="h6" gutterBottom>Importer des mouvements (.csv)</Typography>
            <ImportCSV session={session} />
        </Box>
    )
}
