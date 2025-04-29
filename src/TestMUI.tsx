// src/TestMUI.tsx
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Container from '@mui/material/Container'

export default function TestMUI() {
    return (
        <Container sx={{ mt: 4 }}>
            <Stack spacing={4}>
                <Typography variant="h3" component="h1">
                    🎨 Material UI Demo
                </Typography>

                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="h5">Projet Immobilier</Typography>
                        <Typography color="text.secondary">Appartement T2 • 45 m² • Lyon</Typography>
                        <Button sx={{ mt: 2 }} variant="contained" color="primary">
                            Voir le dossier
                        </Button>
                    </CardContent>
                </Card>

                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="h5">Locataire</Typography>
                        <Typography color="text.secondary">Nina Schlienger</Typography>
                        <Button sx={{ mt: 2 }} variant="contained" color="secondary">
                            Voir les paiements
                        </Button>
                    </CardContent>
                </Card>

                {/* Tableau simple */}
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Derniers mouvements
                        </Typography>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {['Date', 'Libellé', 'Débit', 'Crédit'].map(h => (
                                        <th
                                            key={h}
                                            style={{
                                                borderBottom: '1px solid rgba(0,0,0,0.12)',
                                                textAlign: h === 'Libellé' ? 'left' : 'right',
                                                padding: '8px',
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: 8 }}>05/04/2025</td>
                                    <td style={{ padding: 8 }}>Facture électricité</td>
                                    <td style={{ padding: 8, textAlign: 'right' }}>78,00 €</td>
                                    <td style={{ padding: 8, textAlign: 'right' }}>–</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 8 }}>03/04/2025</td>
                                    <td style={{ padding: 8 }}>Loyer Nina</td>
                                    <td style={{ padding: 8, textAlign: 'right' }}>–</td>
                                    <td style={{ padding: 8, textAlign: 'right' }}>530,00 €</td>
                                </tr>
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                <Stack direction="row" spacing={2}>
                    <Button variant="contained">Ajouter un mouvement</Button>
                </Stack>
            </Stack>
        </Container>
    )
}
