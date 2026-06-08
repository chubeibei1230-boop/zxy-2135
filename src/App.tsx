import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import TypeList from '@/pages/admin/TypeList'
import FieldConfig from '@/pages/admin/FieldConfig'
import Apply from '@/pages/executor/Apply'
import ApplicationList from '@/pages/executor/ApplicationList'
import ApplicationDetail from '@/pages/executor/ApplicationDetail'
import ApprovalList from '@/pages/supervisor/ApprovalList'
import ApprovalDetail from '@/pages/supervisor/ApprovalDetail'
import Export from '@/pages/supervisor/Export'
import { useAuthStore } from '@/store'

function RoleGuard({ children, role }: { children: React.ReactNode; role: string }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/admin/types" element={<RoleGuard role="admin"><TypeList /></RoleGuard>} />
          <Route path="/admin/types/:id/fields" element={<RoleGuard role="admin"><FieldConfig /></RoleGuard>} />
          <Route path="/executor/apply" element={<RoleGuard role="executor"><Apply /></RoleGuard>} />
          <Route path="/executor/applications" element={<RoleGuard role="executor"><ApplicationList /></RoleGuard>} />
          <Route path="/executor/applications/:id" element={<RoleGuard role="executor"><ApplicationDetail /></RoleGuard>} />
          <Route path="/supervisor/applications" element={<RoleGuard role="supervisor"><ApprovalList /></RoleGuard>} />
          <Route path="/supervisor/applications/:id" element={<RoleGuard role="supervisor"><ApprovalDetail /></RoleGuard>} />
          <Route path="/supervisor/export" element={<RoleGuard role="supervisor"><Export /></RoleGuard>} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}
