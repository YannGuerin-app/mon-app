// src/CardLocataires.tsx
import {
    Card,
    CardHeader,
    CardContent,
    List,
    ListItem,
    ListItemText,
    Button,
    Typography,
    Box
} from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function CardLocataires({ tenants, properties, rents, accounts, onOpenTenants }) {
    const navigate = useNavigate()

    function calculerSolde(tenantId: string) {
        return accounts
            .filter(c => c.tenant_id === tenantId)
            .reduce((acc, c) => (c.type === 'payment' ? acc + c.amount : acc - c.amount), 0)
    }

    function couleurSolde(solde: number) {
        return solde >= 0 ? 'green' : 'red'
    }

    return (
        <Card>
            <CardHeader title="👤 Locataires" />
            <CardContent>
                <List dense>
                    {tenants.map(t => {
                        const log = properties.find(p => p.id === t.property_id)
                        const rec = rents.find(r => r.property_id === t.property_id)
                        const solde = calculerSolde(t.id)
                        const couleur = couleurSolde(solde)

                        return (
                            <ListItem key={t.id} alignItems="flex-start">
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="subtitle1">{`${t.first_name} ${t.last_name}`}</Typography>
                                    <Typography variant="body2" component="div">
                                        Logement : {log?.name ?? '-'}<br />
                                        Loyer : {rec?.loyer_nu ?? '-'} €<br />
                                        Charges : {t.charges ?? 0} €<br />
                                        Solde : <span style={{ color: couleur }}>{solde.toFixed(2)} €</span>
                                    </Typography>
                                </Box>
                                <Box sx={{ mt: 2 }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => navigate(`/tenants/${t.id}/payments`)}
                                    >
                                        Voir les paiements
                                    </Button>
                                </Box>
                            </ListItem>
                        )
                    })}
                </List>

                <Button variant="contained" sx={{ mt: 2 }} onClick={onOpenTenants}>
                    Gérer les locataires
                </Button>
            </CardContent>
        </Card>
    )
}
