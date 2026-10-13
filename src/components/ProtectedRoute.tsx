import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('authToken');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  if (!user || typeof user !== 'object') {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user.role || '').toLowerCase();
    const isAllowed = allowedRoles.some((r) => {
      const allowed = r.toLowerCase();
      if (allowed === userRole) return true;
      if (allowed === 'technical' || allowed === 'technician') {
        return (
          userRole.includes('tech') ||
          userRole.includes('engineer') ||
          userRole === 'admin' ||
          userRole === 'superadmin'
        );
      }
      if (allowed === 'admin') {
        return userRole === 'admin' || userRole === 'superadmin';
      }
      if (allowed === 'staff') {
        return (
          userRole.includes('staff') ||
          userRole.includes('waiter') ||
          userRole.includes('kds') ||
          userRole.includes('kitchen') ||
          userRole.includes('phucvu') ||
          userRole === 'admin' ||
          userRole === 'superadmin'
        );
      }
      return false;
    });

    if (!isAllowed) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
