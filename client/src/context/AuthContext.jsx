import { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Attempt to load session from sessionStorage on mount
    const token = sessionStorage.getItem('nexus_token');
    const savedUser = sessionStorage.getItem('nexus_user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        sessionStorage.removeItem('nexus_token');
        sessionStorage.removeItem('nexus_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    sessionStorage.setItem('nexus_token', token);
    sessionStorage.setItem('nexus_user', JSON.stringify(userData));
    
    // Route based on role
    const routes = {
      SUPER_ADMIN: '/superadmin',
      DEPARTMENT_ADMIN: '/deptadmin',
      TEACHER: '/teacher',
      STUDENT: '/student',
      PARENT: '/parent',
      EXAM_STAFF: '/examstaff'
    };
    
    navigate(routes[userData.role] || '/login');
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('nexus_token');
    sessionStorage.removeItem('nexus_user');
    navigate('/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-50">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
