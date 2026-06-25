import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams, useLocation } from 'react-router-dom'
import { LayoutDashboard, Plus, Settings, LogOut, Theater, ChevronDown, ChevronRight } from 'lucide-react'
import type { Organization, Production } from '../types'
import { supabase } from '../lib/supabase'
import { ProductionsContext } from '../hooks/useProductions'
import ProductionModal from '../pages/productions/ProductionModal'

const SUB_NAV: { key: string; label: string }[] = [
  { key: 'cast', label: 'キャスト' },
  { key: 'scenes', label: 'シーン' },
  { key: 'casting', label: '香盤表' },
  { key: 'schedules', label: 'スケジュール' },
  { key: 'props', label: '小道具' },
  { key: 'diagrams', label: '舞台図' },
]

type Props = {
  organization: Organization
  children: React.ReactNode
}

export default function Layout({ organization, children }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: activeProductionId } = useParams<{ id: string }>()
  const [productions, setProductions] = useState<Production[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  // 手動で開閉したproductionのid。nullは「未操作」
  const [openedId, setOpenedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => { fetchProductions() }, [])

  // アクティブな演目が変わったらアコーディオンを開く
  useEffect(() => {
    if (activeProductionId) setOpenedId(activeProductionId)
  }, [activeProductionId])

  async function fetchProductions() {
    const { data } = await supabase
      .from('productions')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
    setProductions(data ?? [])
  }

  const addProduction = (p: Production) => setProductions(prev => [p, ...prev])
  const updateProduction = (p: Production) => setProductions(prev => prev.map(x => x.id === p.id ? p : x))
  const removeProduction = (id: string) => setProductions(prev => prev.filter(x => x.id !== id))

  const handleLogout = async () => { await supabase.auth.signOut() }

  const handleProductionSaved = (production: Production) => {
    addProduction(production)
    setModalOpen(false)
    navigate(`/productions/${production.id}`)
  }

  const toggleAccordion = (id: string) => {
    setOpenedId(prev => prev === id ? null : id)
  }

  // 現在のタブをURLのsearchParamsから取得
  const currentTab = new URLSearchParams(location.search).get('tab') ?? 'cast'

  return (
    <ProductionsContext.Provider value={{ productions, addProduction, updateProduction, removeProduction }}>
      <div className="flex h-screen bg-[#FAFAFA]">
        <aside className="w-52 bg-white border-r border-[#E5E5E5] flex flex-col flex-shrink-0 h-screen sticky top-0">
          <div className="px-5 py-5 border-b border-[#E5E5E5]">
            <div className="text-base font-semibold text-[#111111]">Ensemble</div>
            <div className="text-xs text-[#666666] mt-1 truncate">{organization.name}</div>
          </div>

          <nav className="flex-1 py-3 overflow-y-auto">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-5 py-2 text-sm transition-colors ${
                  isActive ? 'text-[#111111] font-medium bg-[#F5F5F5]' : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
                }`
              }
            >
              <LayoutDashboard size={16} strokeWidth={1.5} />
              ダッシュボード
            </NavLink>

            <div className="mt-4 mb-1 px-5 flex items-center justify-between">
              <span className="text-xs font-medium text-[#999999] uppercase tracking-wide">演目</span>
              <button
                onClick={() => setModalOpen(true)}
                className="text-[#999999] hover:text-[#111111] cursor-pointer bg-transparent border-none p-0"
                title="演目を追加"
              >
                <Plus size={14} />
              </button>
            </div>

            {productions.length === 0 ? (
              <p className="px-5 py-2 text-xs text-[#999999]">演目がありません</p>
            ) : (
              productions.map(production => {
                const isActive = activeProductionId === production.id
                const isOpen = openedId === production.id
                const isHovered = hoveredId === production.id

                return (
                  <div key={production.id}>
                    {/* 演目行 */}
                    <div
                      className={`flex items-center gap-0 pr-2 group transition-colors ${
                        isActive ? 'bg-[#F5F5F5]' : 'hover:bg-[#F5F5F5]'
                      }`}
                      onMouseEnter={() => setHoveredId(production.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* 演目名（クリックでページ遷移） */}
                      <button
                        onClick={() => navigate(`/productions/${production.id}`)}
                        className={`flex items-center gap-2.5 flex-1 min-w-0 px-5 py-2 text-sm text-left cursor-pointer bg-transparent border-none transition-colors ${
                          isActive ? 'text-[#111111] font-medium' : 'text-[#666666] hover:text-[#111111]'
                        }`}
                      >
                        <Theater size={15} strokeWidth={1.5} className="shrink-0" />
                        <span className="truncate">{production.name}</span>
                      </button>

                      {/* ホバー時のみアコーディオントグルアイコンを表示 */}
                      <button
                        onClick={() => toggleAccordion(production.id)}
                        className={`shrink-0 p-1 rounded text-[#999999] hover:text-[#111111] cursor-pointer bg-transparent border-none transition-opacity ${
                          isHovered || isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                      >
                        {isOpen
                          ? <ChevronDown size={14} />
                          : <ChevronRight size={14} />
                        }
                      </button>
                    </div>

                    {/* アコーディオン：サブナビ */}
                    {isOpen && (
                      <div className="pl-8 pb-1">
                        {SUB_NAV.map(item => {
                          const isSubActive = isActive && currentTab === item.key
                          return (
                            <button
                              key={item.key}
                              onClick={() => navigate(`/productions/${production.id}?tab=${item.key}`)}
                              className={`w-full text-left px-3 py-1.5 text-sm rounded cursor-pointer bg-transparent border-none transition-colors ${
                                isSubActive
                                  ? 'text-[#111111] font-medium'
                                  : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
                              }`}
                            >
                              {item.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </nav>

          <div className="px-5 py-4 border-t border-[#E5E5E5] flex flex-col gap-2">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-2.5 text-sm transition-colors ${
                  isActive ? 'text-[#111111]' : 'text-[#666666] hover:text-[#111111]'
                }`
              }
            >
              <Settings size={16} strokeWidth={1.5} />
              設定
            </NavLink>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 text-sm text-[#666666] hover:text-[#111111] cursor-pointer bg-transparent border-none p-0"
            >
              <LogOut size={16} strokeWidth={1.5} />
              ログアウト
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto h-screen">
          {children}
        </main>

        {modalOpen && (
          <ProductionModal
            organizationId={organization.id}
            production={null}
            onSaved={handleProductionSaved}
            onClose={() => setModalOpen(false)}
          />
        )}
      </div>
    </ProductionsContext.Provider>
  )
}
