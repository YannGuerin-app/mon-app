import { createClient } from '@supabase/supabase-js'

// Remplace les 2 lignes ci-dessous par les valeurs copiées depuis Supabase
const supabaseUrl = 'https://gereynsitukigyihjemv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcmV5bnNpdHVraWd5aWhqZW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjQ2NTIsImV4cCI6MjA2MDQwMDY1Mn0.L-60DFpfYyS9yhdSPqX8SB7RhvlX-2OyVF4AYEUUeSs'

export const supabase = createClient(supabaseUrl, supabaseKey)