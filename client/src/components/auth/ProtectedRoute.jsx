import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppShell from '../layout/AppShell';

export default function ProtectedRoute({ allowedRoles, title }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If authenticated but wrong role, redirect to their proper dashboard
    const roleRoutes = {
      SUPER_ADMIN: '/superadmin',
      DEPARTMENT_ADMIN: '/deptadmin',
      TEACHER: '/teacher',
      STUDENT: '/student',
      PARENT: '/parent',
      EXAM_STAFF: '/examstaff'
    };
    return <Navigate to={roleRoutes[user.role] || '/'} replace />;
  }

  return <AppShell role={user.role} title={title} />;
}
