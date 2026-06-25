import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Member } from '../types'

export function useMember(userId: string | undefined, userEmail: string | undefined) {
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); setMember(null); return }
    setLoading(true)
    findOrLinkMember()
  }, [userId])

  async function findOrLinkMember() {
    // auth_user_id で検索
    const { data: byId } = await supabase
      .from('members')
      .select('*')
      .eq('auth_user_id', userId!)
      .maybeSingle()

    if (byId) { setMember(byId); setLoading(false); return }

    // メールアドレスで検索してauto-link
    if (userEmail) {
      const { data: byEmail } = await supabase
        .from('members')
        .select('*')
        .eq('email', userEmail)
        .is('auth_user_id', null)
        .maybeSingle()

      if (byEmail) {
        const { data: linked } = await supabase
          .from('members')
          .update({ auth_user_id: userId })
          .eq('id', byEmail.id)
          .select()
          .single()
        setMember(linked ?? byEmail)
        setLoading(false)
        return
      }
    }

    setMember(null)
    setLoading(false)
  }

  return { member, loading }
}
