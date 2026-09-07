import { Navigate, Route, Routes } from "react-router-dom"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { AlumnoLayout } from "@/components/alumno/AlumnoLayout"
import { ProfesorLayout } from "@/components/profesor/ProfesorLayout"
import { AuthProvider } from "@/context/AuthContext"
import { useAuth } from "@/context/AuthContext"
import { AcademiesPage } from "@/pages/admin/AcademiesPage"
import { AttendancePage } from "@/pages/admin/AttendancePage"
import { CalendarPage } from "@/pages/admin/CalendarPage"
import { ClassSeriesPage } from "@/pages/admin/ClassSeriesPage"
import { DashboardPage } from "@/pages/admin/DashboardPage"
import { EventsPage } from "@/pages/admin/EventsPage"
import { GastosPage } from "@/pages/admin/GastosPage"
import { GigsPage } from "@/pages/admin/GigsPage"
import { PaymentsPage } from "@/pages/admin/PaymentsPage"
import { PlansPage } from "@/pages/admin/PlansPage"
import { RetentionPage } from "@/pages/admin/RetentionPage"
import { SettingsPage } from "@/pages/admin/SettingsPage"
import { StudentsPage } from "@/pages/admin/StudentsPage"
import { TeachersPage } from "@/pages/admin/TeachersPage"
import { CalendarioPage } from "@/pages/alumno/CalendarioPage"
import { HistoricoPage } from "@/pages/alumno/HistoricoPage"
import { PerfilPage } from "@/pages/alumno/PerfilPage"
import { ReservasPage } from "@/pages/alumno/ReservasPage"
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage"
import { LoginPage } from "@/pages/LoginPage"
import { CarnetLookupPage } from "@/pages/profesor/CarnetLookupPage"
import { MisClasesPage } from "@/pages/profesor/MisClasesPage"
import { UpdatePasswordPage } from "@/pages/UpdatePasswordPage"

function InicioSegunRol() {
  const { profile } = useAuth()

  if (profile?.rol === "admin") {
    return <Navigate to="/admin/inicio" replace />
  }

  if (profile?.rol === "alumno") {
    return <Navigate to="/alumno/perfil" replace />
  }

  return <Navigate to="/profesor/asistencia" replace />
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
          <Route index element={<Navigate to="inicio" replace />} />
          <Route path="inicio" element={<DashboardPage />} />
          <Route path="asistencia" element={<AttendancePage />} />
          <Route path="calendario" element={<CalendarPage />} />
          <Route path="clases" element={<ClassSeriesPage />} />
          <Route path="eventos" element={<EventsPage />} />
          <Route path="alumnos" element={<StudentsPage />} />
          <Route path="profesores" element={<TeachersPage />} />
          <Route path="academias" element={<AcademiesPage />} />
          <Route path="planes" element={<PlansPage />} />
          <Route path="pagos" element={<PaymentsPage />} />
          <Route path="gastos" element={<GastosPage />} />
          <Route path="contratos" element={<GigsPage />} />
          <Route path="retencion" element={<RetentionPage />} />
          <Route path="ajustes" element={<SettingsPage />} />
        </Route>

        <Route
          path="/alumno"
          element={
            <ProtectedRoute rolesPermitidos={["alumno"]}>
              <AlumnoLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="perfil" replace />} />
          <Route path="perfil" element={<PerfilPage />} />
          <Route path="calendario" element={<CalendarioPage />} />
          <Route path="reservas" element={<ReservasPage />} />
          <Route path="historico" element={<HistoricoPage />} />
        </Route>

        <Route
          path="/profesor"
          element={
            <ProtectedRoute rolesPermitidos={["profesor"]}>
              <ProfesorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="asistencia" replace />} />
          <Route path="asistencia" element={<AttendancePage />} />
          <Route path="clases" element={<MisClasesPage />} />
          <Route path="carnet" element={<CarnetLookupPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
