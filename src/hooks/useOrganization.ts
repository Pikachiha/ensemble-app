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
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .single()
    setOrganization(data)
    setLoading(false)
  }

  return { organization, loading, refetch: fetchOrganization }
}
