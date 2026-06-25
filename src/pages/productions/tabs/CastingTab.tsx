import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { printCastingTable } from '../../../lib/printCastingTable'
import type { Member, Production, Scene, SceneCast } from '../../../types'

type Props = { production: Production }

type CastMap = Record<string, Record<string, SceneCast | null>>
// castMap[scene_id][member_id] = SceneCast | null

export default function CastingTab({ production }: Props) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [castMap, setCastMap] = useState<CastMap>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: sc } = await supabase
      .from('scenes').select('*').eq('production_id', production.id).order('order_index')

    const { data: pm } = await supabase
      .from('production_members').select('member_id').eq('production_id', production.id)

    const sceneIds = (sc ?? []).map(s => s.id)
    const { data: casts } = sceneIds.length > 0
      ? await supabase.from('scene_casts').select('*').in('scene_id', sceneIds)
      : { data: [] }

    const memberIds = (pm ?? []).map(p => p.member_id)
    const { data: memberData } = memberIds.length > 0
      ? await supabase.from('members').select('*').in('id', memberIds).order('created_at')
      : { data: [] }

    const sceneList: Scene[] = sc ?? []
    const memberList: Member[] = memberData ?? []
    const castList: SceneCast[] = casts ?? []

    const map: CastMap = {}
    for (const scene of sceneList) {
      map[scene.id] = {}
      for (const member of memberList) {
        map[scene.id][member.id] = null
      }
    }
    for (const cast of castList) {
      if (map[cast.scene_id]) {
        map[cast.scene_id][cast.member_id] = cast
      }
    }

    setScenes(sceneList)
    setMembers(memberList)
    setCastMap(map)
    setLoading(false)
  }

  const toggle = async (sceneId: string, memberId: string) => {
    const existing = castMap[sceneId]?.[memberId]
    if (existing) {
      await supabase.from('scene_casts').delete().eq('id', existing.id)
      setCastMap(prev => ({
        ...prev,
        [sceneId]: { ...prev[sceneId], [memberId]: null },
      }))
    } else {
      const { data } = await supabase
        .from('scene_casts')
        .insert({ scene_id: sceneId, member_id: memberId, role_name: null })
        .select()
        .single()
      if (data) {
        setCastMap(prev => ({
          ...prev,
          [sceneId]: { ...prev[sceneId], [memberId]: data },
        }))
      }
    }
  }


  if (loading) return <p className="text-sm text-[#666666]">読み込み中...</p>

  if (scenes.length === 0 || members.length === 0) {
    return (
      <div className="border border-[#E5E5E5] rounded-lg p-12 text-center">
        <p className="text-sm text-[#666666]">
          {scenes.length === 0 ? 'シーンを先に登録してください' : 'メンバーを先に追加してください'}
        </p>
      </div>
    )
  }

  return (
    <div>
    <div className="flex justify-end mb-3">
      <button
        onClick={() => printCastingTable(production.name, scenes, members, castMap)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#666666] border border-[#E5E5E5] rounded-lg hover:bg-[#F5F5F5] bg-white cursor-pointer"
      >
        <Printer size={14} />
        PDF出力
      </button>
    </div>
    <div className="w-full overflow-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
      <table className="border-collapse text-sm" style={{ width: '100%', minWidth: `${members.length * 100 + 160}px` }}>
        <thead>
          <tr>
            <th className="text-left px-3 py-2.5 text-xs font-medium text-[#666666] border-b border-r border-[#E5E5E5] bg-[#FAFAFA] sticky left-0 top-0 z-30 min-w-[140px]">
              シーン
            </th>
            {members.map(member => (
              <th
                key={member.id}
                className="px-3 py-2.5 text-xs font-medium text-[#666666] border-b border-r border-[#E5E5E5] bg-[#FAFAFA] text-center min-w-[88px] sticky top-0 z-20"
              >
                {member.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scenes.map((scene, si) => (
            <tr key={scene.id} className={si % 2 === 0 ? '' : 'bg-[#FAFAFA]'}>
              <td className="px-3 py-2.5 border-b border-r border-[#E5E5E5] sticky left-0 z-10 bg-white font-medium text-[#111111]">
                <div>{scene.name}</div>
                {scene.scene_type && (
                  <div className="text-xs text-[#999999] mt-0.5">{scene.scene_type}</div>
                )}
              </td>
              {members.map(member => {
                const cast = castMap[scene.id]?.[member.id]
                return (
                  <td
                    key={member.id}
                    className="border-b border-r border-[#E5E5E5] text-center p-1"
                  >
                    {cast ? (
                      <button
                        onClick={() => toggle(scene.id, member.id)}
                        className="w-full min-h-[32px] flex flex-col items-center justify-center gap-0.5 cursor-pointer bg-[#F5F5F5] border border-[#E5E5E5] rounded hover:bg-[#FEE2E2] hover:border-[#FECACA] px-1 py-1 group"
                        title="クリック：出演解除"
                      >
                        <span className="text-[#111111] text-xs leading-none group-hover:text-[#EF4444]">●</span>
                        {cast.role_name && (
                          <span className="text-[#555555] text-[10px] leading-none group-hover:text-[#EF4444]">{cast.role_name}</span>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => toggle(scene.id, member.id)}
                        className="w-full min-h-[32px] flex items-center justify-center cursor-pointer bg-transparent border border-[#E5E5E5] rounded hover:border-[#999999] hover:bg-[#F5F5F5]"
                        title="クリック：出演登録"
                      >
                        <span className="text-[#CCCCCC] text-xs">+</span>
                      </button>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-xs text-[#999999]">
        クリックで出演登録 / 出演中のセルをクリックで解除
      </p>
    </div>
    </div>
  )
}
