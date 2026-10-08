import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import Departments from './pages/superadmin/Departments';
import DeptAdmins from './pages/superadmin/DeptAdmins';
import ExamStaff from './pages/superadmin/ExamStaff';
import AcademicTerms from './pages/superadmin/AcademicTerms';
import Settings from './pages/superadmin/Settings';
import Classes from './pages/deptadmin/Classes';
import ClassDetails from './pages/deptadmin/ClassDetails';
import Subjects from './pages/deptadmin/Subjects';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes: Super Admin */}
          <Route
            path="/superadmin"
            element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} title="Super Admin Dashboard" />}
          >
            <Route index element={<SuperAdminDashboard />} />
            <Route path="departments" element={<Departments />} />
            <Route path="admins" element={<DeptAdmins />} />
            <Route path="exam-staff" element={<ExamStaff />} />
            <Route path="academic-terms" element={<AcademicTerms />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Protected Routes: Department Admin */}
          <Route
            path="/deptadmin"
            element={<ProtectedRoute allowedRoles={['DEPARTMENT_ADMIN']} title="Department Dashboard" />}
          >
            <Route index element={<div className="p-6 text-text-900">Department Dashboard (Coming Soon)</div>} />
            <Route path="classes" element={<Classes />} />
            <Route path="classes/:id" element={<ClassDetails />} />
            <Route path="subjects" element={<Subjects />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;