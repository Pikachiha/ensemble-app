import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Member } from '../types'

export function useMember(userId: string | undefined, _userEmail?: string | undefined) {
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

    // 未リンクのメンバーをサービスロール経由でリンク（Edge Function）
    // → ここでは管理者側での手動リンクを前提とし、見つからなければ null
    setMember(null)
    setLoading(false)
  }

  return { member, loading }
}
