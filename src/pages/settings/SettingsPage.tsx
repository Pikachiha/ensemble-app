import { useState } from 'react'
import { useOrganization } from '../../hooks/useOrganization'
import OrganizationSettings from './OrganizationSettings'
import MembersSettings from './MembersSettings'

type Tab = 'organization' | 'members'

const TABS: { key: Tab; label: string }[] = [
  { key: 'organization', label: '団体情報' },
  { key: 'members', label: 'メンバー' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('organization')
  const { organization, refetch } = useOrganization()

  if (!organization) return null

  return (
    <div className="p-8 max-w-[800px]">
      <h2 className="text-xl font-semibold text-[#111111] mb-6">設定</h2>

      <div className="flex border-b border-[#E5E5E5] mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px cursor-pointer bg-transparent transition-colors ${
              activeTab === tab.key
                ? 'border-[#111111] text-[#111111]'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'organization' && (
        <OrganizationSettings organization={organization} onUpdated={refetch} />
      )}
      {activeTab === 'members' && (
        <MembersSettings organization={organization} />
      )}
    </div>
  )
}
