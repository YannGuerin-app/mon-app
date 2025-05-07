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
    Paper
} from '@mui/material'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'


import ImportCSV from './ImportCSV'


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

        const channel = supabase
            .channel('mouvements-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'mouvements_bancaires'
            }, payload => {
                console.log('Changement détecté :', payload)
                fetchData()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    return ( 
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
                Mouvements bancaires
            </Typography>

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
                        {mouvements.map((m, i) => (
                            <TableRow key={i}>
                                <TableCell>{m.date}</TableCell>
                                <TableCell>{m.libelle}</TableCell>
                                <TableCell align="right">{m.debit ?? ''}</TableCell>
                                <TableCell align="right">{m.credit ?? ''}</TableCell>
                                <TableCell>{m.categorie ?? ''}</TableCell>
                                <TableCell>{m.sous_categorie ?? ''}</TableCell>
                                <TableCell>{m.tiers ?? ''}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
                Ajouter un mouvement manuel
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        type="date"
                        fullWidth
                        value={nouvelleLigne.date}
                        onChange={(e) => handleChange('date', e.target.value)}
                        label="Date"
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        fullWidth
                        label="Libellé"
                        value={nouvelleLigne.libelle}
                        onChange={(e) => handleChange('libelle', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6} md={2}>
                    <TextField
                        fullWidth
                        label="Débit"
                        type="number"
                        value={nouvelleLigne.debit}
                        onChange={(e) => handleChange('debit', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6} md={2}>
                    <TextField
                        fullWidth
                        label="Crédit"
                        type="number"
                        value={nouvelleLigne.credit}
                        onChange={(e) => handleChange('credit', e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        fullWidth
                        label="Catégorie"
                        value={nouvelleLigne.categorie}
                        onChange={(e) => handleChange('categorie', e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        fullWidth
                        label="Sous-catégorie"
                        value={nouvelleLigne.sous_categorie}
                        onChange={(e) => handleChange('sous_categorie', e.target.value)}
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField
                        fullWidth
                        label="Tiers"
                        value={nouvelleLigne.tiers}
                        onChange={(e) => handleChange('tiers', e.target.value)}
                    />
                </Grid>
            </Grid>

            <Button
                variant="contained"
                color="success"
                onClick={ajouterMouvement}
                sx={{ mb: 4 }}
            >
                Ajouter la ligne
            </Button>

            <Typography variant="h6" gutterBottom>
                Importer des mouvements (.csv)
            </Typography>
            <ImportCSV session={session} />
        </Box>
    )

} 
