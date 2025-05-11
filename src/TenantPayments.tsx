// TenantPayments.tsx
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import {
    Container,
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    TableContainer,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    CircularProgress,
    Alert,
    Stack
} from '@mui/material'

type AccountLine = {
    id: string
    entry_date: string
    description: string
    type: string
    debit: number | null
    credit: number | null
}

export default function TenantPayments() {
    const { id: tenantId } = useParams<{ id: string }>()
    const supabase = useSupabaseClient()

    const [tenantName, setTenantName] = useState<string>('')
    const [lines, setLines] = useState<(AccountLine & { solde: number })[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')

    // Charger le nom du locataire
    useEffect(() => {
        if (!tenantId) return
        supabase
            .from('tenants')
            .select('first_name,last_name')
            .eq('id', tenantId)
            .single()
            .then(({ data }) => {
                if (data) setTenantName(`${data.first_name} ${data.last_name}`)
            })
    }, [tenantId, supabase])

    // Charger les lignes � chaque changement d'ID ou de filtre
    useEffect(() => {
        fetchLines()
    }, [tenantId, startDate, endDate])

    async function fetchLines() {
        if (!tenantId) return
        setLoading(true)
        setError(null)

        let query = supabase
            .from<AccountLine>('tenant_accounts')
            .select('id, entry_date, description, type, debit, credit')
            .eq('tenant_id', tenantId)

        if (startDate) query = query.gte('entry_date', startDate)
        if (endDate) query = query.lte('entry_date', endDate)

        const { data, error } = await query.order('entry_date', { ascending: true })

        setLoading(false)
        if (error) {
            setError(error.message)
            return
        }

        // Calcul du solde courant
        let running = 0
        const withSolde = (data || []).map(l => {
            running += (l.credit ?? 0) + (l.debit ?? 0)
            return { ...l, solde: running }
        })
        setLines(withSolde)
    }

    // Totaux et solde final
    const totalDebit = lines.reduce((sum, l) => sum + (l.debit ?? 0), 0)
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit ?? 0), 0)
    const finalBalance = lines.length > 0 ? lines[lines.length - 1].solde : 0

    return (
        <Container sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom>
                Compte locataire {tenantName || tenantId}
            </Typography>

            {/* Filtres date */}
            <Box component={Paper} sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="flex-end">
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Date début"
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Date fin"
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Button variant="contained" onClick={fetchLines} fullWidth>
                            Appliquer
                        </Button>
                    </Grid>
                </Grid>
            </Box>

            {/* R�sum� */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="subtitle2">Total charges (Débit)</Typography>
                            <Typography variant="h6">
                                {totalDebit.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="subtitle2">Total paiements (Crédit)</Typography>
                            <Typography variant="h6">
                                {totalCredit.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="subtitle2">Solde actuel</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {finalBalance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Erreur ou chargement */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Tableau des mouvements */}
            {!loading && (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell align="right">Débit</TableCell>
                                <TableCell align="right">Crédit</TableCell>
                                <TableCell align="right">Solde</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.map(p => {
                                const dateFR = new Date(p.entry_date).toLocaleDateString('fr-FR', {
                                    day: '2-digit', month: '2-digit', year: 'numeric'
                                })
                                const debitFR = p.debit != null
                                    ? p.debit.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
                                    : ''
                                const creditFR = p.credit != null
                                    ? p.credit.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
                                    : ''
                                const soldeFR = p.solde.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

                                return (
                                    <TableRow key={p.id}>
                                        <TableCell>{dateFR}</TableCell>
                                        <TableCell>
                                            {p.description}{p.type && ` (${p.type})`}
                                        </TableCell>
                                        <TableCell align="right">{debitFR}</TableCell>
                                        <TableCell align="right">{creditFR}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                            {soldeFR}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {!loading && lines.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        Aucun mouvement trouvé.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Container>
    )
}
