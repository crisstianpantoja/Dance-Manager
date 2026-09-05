import { Navigate, Route, Routes } from "react-router-dom"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { AuthProvider } from "@/context/AuthContext"
import { useAuth } from "@/context/AuthContext"
import { AcademiesPage } from "@/pages/admin/AcademiesPage"
import { AttendancePage } from "@/pages/admin/AttendancePage"
import { CalendarPage } from "@/pages/admin/CalendarPage"
import { ClassSeriesPage } from "@/pages/admin/ClassSeriesPage"
import { PaymentsPage } from "@/pages/admin/PaymentsPage"
import { PlansPage } from "@/pages/admin/PlansPage"
import { StudentsPage } from "@/pages/admin/StudentsPage"
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage"
import { LoginPage } from "@/pages/LoginPage"
import { PortalPlaceholder } from "@/pages/PortalPlaceholder"
import { StudentCalendarPage } from "@/pages/StudentCalendarPage"
import { UpdatePasswordPage } from "@/pages/UpdatePasswordPage"

function InicioSegunRol() {
  const { profile } = useAuth()

  if (profile?.rol === "admin") {
    return <Navigate to="/admin/asistencia" replace />
  }

  if (profile?.rol === "alumno") {
    return <StudentCalendarPage />
  }

  return <PortalPlaceholder />
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/olvide-password" element={<ForgotPasswordPage />} />
        <Route path="/actualizar-password" element={<UpdatePasswordPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <InicioSegunRol />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute rolesPermitidos={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="asistencia" replace />} />
          <Route path="asistencia" element={<AttendancePage />} />
          <Route path="calendario" element={<CalendarPage />} />
          <Route path="clases" element={<ClassSeriesPage />} />
          <Route path="alumnos" element={<StudentsPage />} />
          <Route path="academias" element={<AcademiesPage />} />
          <Route path="planes" element={<PlansPage />} />
          <Route path="pagos" element={<PaymentsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
