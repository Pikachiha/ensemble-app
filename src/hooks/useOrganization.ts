import { useEffect, useState } from 'react'
import type { Organization } from '../types'
import { supabase } from '../lib/supabase'

export function useOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrganization()
  }, [])

  async function fetchOrganization() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setOrganization(null); setLoading(false); return }
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()
    setOrganization(data)
    setLoading(false)
  }

  return { organization, loading, refetch: fetchOrganization }
}
