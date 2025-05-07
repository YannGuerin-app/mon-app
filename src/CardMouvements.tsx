// src/CardMouvements.tsx
import {
    Card,
    CardHeader,
    CardContent,
    List,
    ListItem,
    ListItemText,
    Button,
    Box
} from '@mui/material'

export default function CardMouvements({ movements, onViewDetails, onGenerateCalls, loading }) {
    return (
        <Card>
            <CardHeader title="💸 Mouvements (ce mois)" />
            <CardContent>
                <List dense>
                    {movements.map(m => (
                        <ListItem key={m.id}>
                            <ListItemText
                                primary={m.libelle}
                                secondary={`${m.date} – ${m.debit ?? ''}${m.credit ?? ''} €`}
                            />
                        </ListItem>
                    ))}
                </List>

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                        size="small"
                        variant="contained"
                        onClick={onViewDetails}
                    >
                        Voir détails
                    </Button>

                    <Button
                        size="small"
                        variant="outlined"
                        onClick={onGenerateCalls}
                        disabled={loading}
                    >
                        {loading ? 'Appel...' : 'Appel loyer'}
                    </Button>
                </Box>
            </CardContent>
        </Card>
    )
}
