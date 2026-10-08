import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SuperAdminDashboard from './pages/superadmin/Dashboard';

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
            {/* Additional superadmin routes go here */}
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;