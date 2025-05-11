// src/Dashboard.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'

import CardLocataires from './CardLocataires'
import CardMouvements from './CardMouvements'


// MUI
import {
    Grid, Card, CardHeader, CardContent,
    List, ListItem, ListItemText, ListItemSecondaryAction, Button,
    Typography, Divider, Box, Container,
    Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Select,
    MenuItem, IconButton, ListItemButton
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'

export default function Dashboard() {
    const navigate = useNavigate()
    // données principales
    const [properties, setProperties] = useState<any[]>([])
    const [tenants, setTenants] = useState<any[]>([])
    const [movements, setMovements] = useState<any[]>([])
    const [invoices, setInvoices] = useState<any[]>([])
    const [docs, setDocs] = useState<any[]>([])
    const [rents, setRents] = useState<any[]>([])
    const [accounts, setAccounts] = useState<any[]>([])

    // dialog « Ajouter un bien »
    const [openProps, setOpenProps] = useState(false)
    const [newProperty, setNewProperty] = useState({
        name: '', type: '', surface: '', address: ''
    })

    // dialog « Gérer les locataires »
    const [openTenants, setOpenTenants] = useState(false)
    const [newTenant, setNewTenant] = useState({
        property_id: '',
        first_name: '',
        last_name: '',
        start_date: '',
        insurance: '',
        charges: ''
    })

    // appel mensuel
    const [loadingCalls, setLoadingCalls] = useState(false)

    useEffect(() => {
        fetchProperties()
        fetchRents()
        fetchTenants()
        fetchMovements()
        fetchInvoices()
        fetchDocs()
        fetchAccounts()
    }, [])

    // dialog « Gérer les loyers »
    const [openRentDialog, setOpenRentDialog] = useState(false)
    const [newRent, setNewRent] = useState({
        property_id: '',
        date_valeur: '',
        loyer_nu: ''
    })


    async function fetchRents() {
        const { data, error } = await supabase
            .from('rent')                // nom de ta table
            .select('property_id, loyer_nu, created_at')
            .order('created_at', { ascending: false })
        if (error) console.error(error)
        else {
            setRents(data || [])
        }
    }

    async function fetchProperties() {
        const { data } = await supabase
            .from('properties')
            .select('*')
            .order('name')
        setProperties(data ?? [])
    }

    async function fetchTenants() {
        const { data } = await supabase
            .from('tenants')
            .select('*')
            .order('last_name')
        setTenants(data ?? [])
    }

    async function fetchMovements() {
        const start = new Date(); start.setDate(1)
        const end = new Date(start); end.setMonth(end.getMonth() + 1)
        const { data } = await supabase
            .from('mouvements_bancaires')
            .select('*')
            .gte('date', start.toISOString().slice(0, 10))
            .lt('date', end.toISOString().slice(0, 10))
            .order('date', { ascending: false })
        setMovements(data ?? [])
    }

    async function fetchInvoices() {
        const { data } = await supabase
            .from('invoices')
            .select('*')
            .order('due_date')
        setInvoices(data ?? [])
    }

    async function fetchDocs() {
        const { data } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false })
        setDocs(data ?? [])
    }


    async function fetchAccounts() {
        const { data, error } = await supabase
            .from('tenant_accounts')
            .select('*')

        if (error) console.error(error)
        else setAccounts(data ?? [])
    }



    // génération des appels mensuels
    const generateMonthlyCalls = async () => {
        setLoadingCalls(true)
        try {
            const dt = new Date()
            dt.setDate(1)
            const entry_date = dt.toISOString().slice(0, 10)
            const calls: any[] = []

            for (const t of tenants) {
                // dernier loyer nu
                const { data: rentData, error: rentErr } = await supabase
                    .from('rent')
                    .select('loyer_nu, created_at')
                    .eq('property_id', t.property_id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                if (rentErr) throw rentErr

                const loyer_nu = rentData?.[0]?.loyer_nu
                const majDate = rentData?.[0]?.created_at
                    ? rentData[0].created_at.split('T')[0]
                    : ''
                if (loyer_nu != null) {
                    calls.push({
                        tenant_id: t.id,
                        property_id: t.property_id,
                        entry_date,
                        type: 'rent_charge',
                        amount: -loyer_nu,
                        description: `Appel loyer ${entry_date.slice(5)}(maj ${majDate?.slice(0, 10)})`
                    })
            }

            // charges depuis tenants.charges
            const charges = parseFloat(t.charges ?? '0')
            calls.push({
                tenant_id: t.id,
                property_id: t.property_id,
                entry_date,
                type: 'charges_charge',
                amount: -charges,
                description: `Appel charges ${entry_date.slice(5)}`
                })
    }

    if (calls.length) {
        const { error } = await supabase
            .from('tenant_accounts')
            .upsert(calls, {
                onConflict: ['tenant_id', 'entry_date', 'description']
            })
        if (error) throw error
    }

    alert('Appels mensuels générés.')
    fetchMovements()
} catch (err: any) {
    console.error(err)
    alert('Erreur : ' + err.message)
} finally {
    setLoadingCalls(false)
}
    }


// ajouter un bien
const handleAddProperty = async () => {
    const { name, type, surface, address } = newProperty
    const { error } = await supabase
        .from('properties')
        .insert([{ name, type, surface: parseInt(surface), address }])
    if (error) {
        alert('Erreur : ' + error.message)
    } else {
        setNewProperty({ name: '', type: '', surface: '', address: '' })
        fetchProperties()
        setOpenProps(false)
    }
}

// ajouter un locataire
const handleAddTenant = async () => {
    const { property_id, first_name, last_name, start_date, insurance, charges } = newTenant
    const { error } = await supabase
        .from('tenants')
        .insert([{
            property_id,
            first_name,
            last_name,
            start_date,
            insurance,
            charges: parseFloat(charges)
        }])
    if (error) {
        alert('Erreur : ' + error.message)
    } else {
        setNewTenant({
            property_id: '', first_name: '', last_name: '',
            start_date: '', insurance: '', charges: ''
        })
        fetchTenants()
    }
}

const handleDeleteTenant = async (id: string) => {
    if (!confirm('Supprimer ce locataire ?')) return
    const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id)
    if (error) {
        alert('Erreur : ' + error.message)
    } else {
        fetchTenants()
    }
}

// ajouter ou modifier un loyer
const handleSaveRent = async () => {
    const { property_id, date_valeur, loyer_nu } = newRent
    if (!property_id || !date_valeur || !loyer_nu) {
        alert('Tous les champs sont requis.')
        return
    }

    const { error } = await supabase
        .from('rent')
        .upsert([
            {
                property_id,
                date_valeur,
                loyer_nu: parseFloat(loyer_nu)
            }
        ], {
            onConflict: ['property_id', 'date_valeur']
        })

    if (error) {
        alert('Erreur : ' + error.message)
    } else {
        alert('Loyer enregistré.')
        fetchRents()
        setOpenRentDialog(false)
        setNewRent({ property_id: '', date_valeur: '', loyer_nu: '' })
    }
}

// Ajouter facture
const [openInvoiceDialog, setOpenInvoiceDialog] = useState(false)
const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
const [selectedInvoiceUrl, setSelectedInvoiceUrl] = useState<string | null>(null)
const [newInvoice, setNewInvoice] = useState({
    number: '', due_date: '', amount: '', entreprise: '', status: ''
})

const handleUploadInvoice = async () => {
    if (!invoiceFile) return alert('Veuillez choisir un fichier.')
    const filePath = `invoices /${Date.now()}-${invoiceFile.name}`
const { error: uploadError } = await supabase.storage.from('invoices').upload(filePath, invoiceFile)
if (uploadError) {
    console.error(uploadError)
    return alert('Erreur de téléversement.')
}


    const { error } = await supabase.from('invoices').insert([{ ...newInvoice, document_url: filePath }])
if (error) {
    console.error(error)
    return alert("Erreur lors de l'insertion.")
}

alert('Facture enregistrée.')
setOpenInvoiceDialog(false)
setInvoiceFile(null)
setNewInvoice({ number: '', due_date: '', amount: '', entreprise: '', status: '' })
fetchInvoices()
    }

    const handlePreviewInvoice = async (path: string) => {
        const { data, error } = await supabase.storage.from('invoices').createSignedUrl(path, 60 * 5)
        if (error) {
            alert('Erreur : prévisualisation impossible')
        } else {
            setSelectedInvoiceUrl(data.signedUrl)
        }
    }

return (
    <Container sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
            Tableau de bord
        </Typography>

        <Grid container spacing={3}>
            {/* Biens Immobiliers */}
            <Grid item xs={12} md={6}>
                <Card>
                    <CardHeader title="🏠 Biens immobiliers" />
                    <CardContent>
                        <List dense>
                            {properties.map(p => {
                                // on prend le premier loyer dont property_id === p.id
                                const rec = rents.find(r => r.property_id === p.id)
                                const currentRent = rec?.loyer_nu ?? '—'
                                const majDate = rec?.created_at?.slice(0, 10) ?? '—'
                                return (
                                    <ListItem key={p.id}>
                                        <ListItemText
                                            primary={p.name}
                                            secondary={
                                                `${p.type} • ${p.surface} m² + • Loyer actuel : ${currentRent} € (maj : ${majDate})`
                                                }
                                            />
                                    </ListItem>
                                )
                            })}
                        </List>
                        <Button
                            size="small"
                            variant="contained"
                            sx={{ mt: 2 }}
                            onClick={() => setOpenProps(true)}
                        >
                            Ajouter un bien
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1, ml: 1 }}
                            onClick={() => setOpenRentDialog(true)}
                        >
                            IRL / Modification loyer
                        </Button>
                    </CardContent>
                </Card>
            </Grid>

            {/* Locataires */}
            <Grid item xs={12} md={6}>
                <CardLocataires
                    tenants={tenants}
                    properties={properties}
                    rents={rents}
                    accounts={accounts}
                    onOpenTenants={() => setOpenTenants(true)}
                />
            </Grid>

            {/* Derniers mouvements du mois */}
            <Grid item xs={12} md={6}>
                <CardMouvements
                    movements={movements}
                    onViewDetails={() => navigate('/mouvements')}
                    onGenerateCalls={generateMonthlyCalls}
                    loading={loadingCalls}
                />
            </Grid>

            {/* Factures */}
            <Grid item xs={12} md={6}>
                <Card>
                    <CardHeader title="📄 Factures" />
                    <CardContent>
                        <List dense>
                            {invoices.map(inv => (
                                <ListItemButton key={inv.id} onClick={() => handlePreviewInvoice(inv.document_url)}>
                                    <ListItemText
                                        primary={inv.number}
                                        secondary={`Due: ${inv.due_date} – ${inv.amount} €`}
                                        />
                                </ListItemButton>
                            ))}
                        </List>
                        <Button size="small" variant="contained" sx={{ mt: 2 }}>
                            Gérer les factures
                        </Button>
                        <Button size="small" variant="outlined" sx={{ mt: 2 }} onClick={() => setOpenInvoiceDialog(true)}>
                            ➕ Nouvelle facture
                        </Button>
                    </CardContent>
                </Card>
            </Grid>

            {/* Documents */}
            <Grid item xs={12}>
                <Card>
                    <CardHeader title="📁 Documents" />
                    <CardContent>
                        <List dense>
                            {docs.map(doc => (
                                <ListItem key={doc.id}>
                                    <ListItemText
                                        primary={doc.name}
                                        secondary={new Date(doc.created_at).toLocaleDateString()}
                                    />
                                </ListItem>
                            ))}
                        </List>
                        <Button size="small" variant="contained" sx={{ mt: 2 }}>
                            Gérer les documents
                        </Button>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>

        {/* Dialog « Ajouter un bien » */}
        <Dialog
            open={openProps}
            onClose={() => setOpenProps(false)}
            fullWidth maxWidth="sm"
        >
            <DialogTitle>Ajouter un bien immobilier</DialogTitle>
            <DialogContent>
                <Box component="form" sx={{ display: 'grid', gap: 2 }}>
                    <TextField
                        label="Nom du bien"
                        value={newProperty.name}
                        onChange={e => setNewProperty({ ...newProperty, name: e.target.value })}
                    />
                    <TextField
                        label="Type (Appartement, Garage…) "
                        value={newProperty.type}
                        onChange={e => setNewProperty({ ...newProperty, type: e.target.value })}
                    />
                    <TextField
                        label="Surface (m²)"
                        type="number"
                        value={newProperty.surface}
                        onChange={e => setNewProperty({ ...newProperty, surface: e.target.value })}
                    />
                    <TextField
                        label="Adresse"
                        value={newProperty.address}
                        onChange={e => setNewProperty({ ...newProperty, address: e.target.value })}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenProps(false)}>Annuler</Button>
                <Button variant="contained" onClick={handleAddProperty}>Ajouter</Button>
            </DialogActions>
        </Dialog>

        {/* Dialog « Ajouter / Modifier loyer » */}
        <Dialog open={openRentDialog} onClose={() => setOpenRentDialog(false)} fullWidth maxWidth="sm">
            <DialogTitle>IRL / Modifier un loyer</DialogTitle>
            <DialogContent sx={{ display: 'grid', gap: 2, mt: 1 }}>
                <Select
                    value={newRent.property_id}
                    onChange={e => setNewRent({ ...newRent, property_id: e.target.value })}
                    displayEmpty
                >
                    <MenuItem value="" disabled>Sélectionner un bien</MenuItem>
                    {properties.map(p => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                    ))}
                </Select>
                <TextField
                    label="Date valeur"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={newRent.date_valeur}
                    onChange={e => setNewRent({ ...newRent, date_valeur: e.target.value })}
                />
                <TextField
                    label="Loyer (€)"
                    type="number"
                    value={newRent.loyer_nu}
                    onChange={e => setNewRent({ ...newRent, loyer_nu: e.target.value })}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenRentDialog(false)}>Annuler</Button>
                <Button variant="contained" onClick={handleSaveRent}>Enregistrer</Button>
            </DialogActions>
        </Dialog>


        {/* Dialog « Gérer les locataires » */}
        <Dialog
            open={openTenants}
            onClose={() => setOpenTenants(false)}
            fullWidth maxWidth="sm"
        >
            <DialogTitle>Gérer les locataires</DialogTitle>
            <DialogContent>
                <Typography variant="subtitle1" gutterBottom>
                    ➕ Ajouter un locataire
                </Typography>
                <Box component="form" sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                    <Select
                        value={newTenant.property_id}
                        onChange={e => setNewTenant({ ...newTenant, property_id: e.target.value })}
                        displayEmpty
                    >
                        <MenuItem value="" disabled>Sélectionner un bien</MenuItem>
                        {properties.map(p => (
                            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                        ))}
                    </Select>
                    <TextField
                        label="Prénom"
                        value={newTenant.first_name}
                        onChange={e => setNewTenant({ ...newTenant, first_name: e.target.value })}
                    />
                    <TextField
                        label="Nom"
                        value={newTenant.last_name}
                        onChange={e => setNewTenant({ ...newTenant, last_name: e.target.value })}
                    />
                    <TextField
                        label="Date entrée"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={newTenant.start_date}
                        onChange={e => setNewTenant({ ...newTenant, start_date: e.target.value })}
                    />
                    <TextField
                        label="Assurance"
                        value={newTenant.insurance}
                        onChange={e => setNewTenant({ ...newTenant, insurance: e.target.value })}
                    />
                    <TextField
                        label="Charges (€)"
                        type="number"
                        value={newTenant.charges}
                        onChange={e => setNewTenant({ ...newTenant, charges: e.target.value })}
                    />
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle1" gutterBottom>
                    🗑️ Supprimer un locataire
                </Typography>
                <List dense>
                    {tenants.map(t => (
                        <ListItem
                            key={t.id}
                            secondaryAction={
                                <IconButton edge="end" onClick={() => handleDeleteTenant(t.id)}>
                                    <DeleteIcon color="error" />
                                </IconButton>
                            }
                        >
                            <ListItemText
                                primary={`${t.first_name} ${t.last_name}`}
                                secondary={`Entrée : ${t.start_date ?? '-'} • Charges : ${t.charges ?? 0} €`}
                                />
                        </ListItem>
                    ))}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenTenants(false)}>Annuler</Button>
                <Button variant="contained" onClick={handleAddTenant}>Ajouter</Button>
            </DialogActions>
        </Dialog>

        {/* Dialog « Ajouter une facture » */}
        <Dialog open={openInvoiceDialog} onClose={() => setOpenInvoiceDialog(false)} fullWidth maxWidth="sm">
            <DialogTitle>Ajouter une facture</DialogTitle>
            <DialogContent sx={{ display: 'grid', gap: 2 }}>
                <TextField label="Numéro" value={newInvoice.number} onChange={e => setNewInvoice({ ...newInvoice, number: e.target.value })} fullWidth />
                <TextField label="Date d'échéance" type="date" InputLabelProps={{ shrink: true }} value={newInvoice.due_date} onChange={e => setNewInvoice({ ...newInvoice, due_date: e.target.value })} fullWidth />
                <TextField label="Montant (€)" type="number" value={newInvoice.amount} onChange={e => setNewInvoice({ ...newInvoice, amount: e.target.value })} fullWidth />
                <TextField label="Entreprise" value={newInvoice.entreprise} onChange={e => setNewInvoice({ ...newInvoice, entreprise: e.target.value })} fullWidth />
                <TextField label="Statut" value={newInvoice.status} onChange={e => setNewInvoice({ ...newInvoice, status: e.target.value })} fullWidth />
                <input type="file" onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)} />
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenInvoiceDialog(false)}>Annuler</Button>
                <Button variant="contained" onClick={handleUploadInvoice}>Enregistrer</Button>
            </DialogActions>
        </Dialog>

        {/* Dialog « previsualiser une facture » */}
        <Dialog open={!!selectedInvoiceUrl} onClose={() => setSelectedInvoiceUrl(null)} fullWidth maxWidth="md">
            <DialogTitle>📄 Aperçu de la facture</DialogTitle>
            <DialogContent sx={{ height: '80vh', p: 0 }}>
                {selectedInvoiceUrl ? (
                    <iframe
                        src={selectedInvoiceUrl}
                        title="Facture"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                ) : (
                    <Typography sx={{ p: 2 }}>Aucun document sélectionné.</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setSelectedInvoiceUrl(null)}>Fermer</Button>
            </DialogActions>
        </Dialog>

    </Container>
)
}