import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import {
    Container, Typography, List, ListItem, ListItemText, ListItemSecondaryAction,
    Divider
} from '@mui/material'

type Payment = {
    id: string
    entry_date: string
    description: string
    amount: number
    type: string
}

type Tenant = {
    first_name: string
    last_name: string
}
export default function TenantPayments() {
    const { id } = useParams<{ id: string }>()
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [payments, setPayments] = useState<Payment[]>([])

    useEffect(() => {
        if (!id) return

        // 1) fetch locataire pour avoir son nom
        supabase
            .from<Tenant>('tenants')
            .select('first_name, last_name')
            .eq('id', id)
            .single()
            .then(({ data }) => {
                if (data) setTenant(data)
            })

        // 2) fetch paiements
        supabase
            .from<Payment>('tenant_accounts')
            .select('*')
            .eq('tenant_id', id)
            .order('entry_date', { ascending: false })
            .then(({ data }) => {
                if (data) setPayments(data)
            })
    }, [id])

    return (
        <Container sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom>
                Paiements de {tenant
                    ? `${tenant.first_name} ${tenant.last_name}`
                    : id}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <List>
                {payments.map(p => {
                    // formater la date en FR
                    const dateFR = new Date(p.entry_date)
                        .toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        })

                    // formater le montant en €
                    const montantFR = p.amount.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                    })

                    return (
                        <ListItem key={p.id} divider>
                            <ListItemText
                                primary={p.description}
                                secondary={dateFR}
                            />
                            <ListItemSecondaryAction>
                                <Typography
                                    variant="body2"
                                    color={p.type === 'rent_charge' ? 'textPrimary' : 'textSecondary'}
                                >
                                    {montantFR}
                                </Typography>
                            </ListItemSecondaryAction>
                        </ListItem>
                    )
                })}
            </List>
        </Container>
    )
}