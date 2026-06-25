import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useOrganization } from './hooks/useOrganization'
import { useMember } from './hooks/useMember'
import Layout from './components/Layout'
import LoginPage from './pages/auth/LoginPage'
import OrganizationSetupPage from './pages/organization/OrganizationSetupPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ProductionDetailPage from './pages/productions/ProductionDetailPage'
import ScheduleDetailPage from './pages/schedules/ScheduleDetailPage'
import SettingsPage from './pages/settings/SettingsPage'
import MemberPage from './pages/member/MemberPage'
import SceneDetailPage from './pages/scenes/SceneDetailPage'

function AppRoutes() {
  const { session, loading: authLoading } = useAuth()
  const { organization, loading: orgLoading, refetch } = useOrganization()

  // 団体が見つからない場合のみメンバーチェックを行う（管理者には不要）
  const checkMember = !orgLoading && !organization
  const { member, loading: memberLoading } = useMember(
    checkMember ? session?.user.id : undefined,
    checkMember ? session?.user.email : undefined,
  )

  if (authLoading || orgLoading || (checkMember && memberLoading)) {
    return <div className="p-8 text-sm text-[#666666]">読み込み中...</div>
  }

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  // メンバーとしてログイン（管理者でない場合）
  if (!organization && member) {
    return (
      <Routes>
        <Route path="*" element={<MemberPage member={member} />} />
      </Routes>
    )
  }

  // 管理者：団体未設定
  if (!organization) {
    return <OrganizationSetupPage onCreated={refetch} />
  }

  // 管理者
  return (
    <Layout organization={organization}>
      <Routes>
        <Route path="/" element={<DashboardPage organization={organization} />} />
        <Route path="/productions/:id" element={<ProductionDetailPage />} />
        <Route path="/productions/:id/schedules/:scheduleId" element={<ScheduleDetailPage />} />
        <Route path="/productions/:id/scenes/:sceneId" element={<SceneDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
