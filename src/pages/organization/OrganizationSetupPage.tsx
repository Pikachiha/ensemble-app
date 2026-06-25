import { useState } from 'react'
import { supabase } from '../../lib/supabase'

type Props = {
  onCreated: () => void
}

export default function OrganizationSetupPage({ onCreated }: Props) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('organizations').insert({
      name,
      owner_id: user.id,
    })

    if (error) {
      setError(error.message)
    } else {
      onCreated()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-[#111111] text-center mb-2">Ensemble</h1>
        <p className="text-sm text-[#666666] text-center mb-8">まず団体情報を登録してください</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">
              団体名
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：劇団〇〇"
              required
              className="w-full px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg text-[#111111] placeholder-[#999999] outline-none focus:border-[#000000]"
            />
          </div>

          {error && <p className="text-sm text-[#EF4444]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-[#333333] disabled:opacity-50 cursor-pointer"
          >
            {loading ? '登録中...' : '団体を登録して始める'}
          </button>
        </form>
      </div>
    </div>
  )
}
