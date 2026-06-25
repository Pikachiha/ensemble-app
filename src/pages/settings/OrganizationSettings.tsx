import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Organization } from '../../types'

type Props = {
  organization: Organization
  onUpdated: () => void
}

export default function OrganizationSettings({ organization, onUpdated }: Props) {
  const [name, setName] = useState(organization.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)

    const { error } = await supabase
      .from('organizations')
      .update({ name })
      .eq('id', organization.id)

    if (error) {
      setError(error.message)
    } else {
      onUpdated()
      setSaved(true)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-[#111111] mb-1.5">団体名</label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setSaved(false) }}
          required
          className="w-full px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg text-[#111111] outline-none focus:border-[#000000]"
        />
      </div>

      {error && <p className="text-sm text-[#EF4444]">{error}</p>}
      {saved && <p className="text-sm text-[#666666]">保存しました</p>}

      <div>
        <button
          type="submit"
          disabled={loading || name === organization.name}
          className="px-4 py-2.5 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-[#333333] disabled:opacity-50 cursor-pointer"
        >
          {loading ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}
