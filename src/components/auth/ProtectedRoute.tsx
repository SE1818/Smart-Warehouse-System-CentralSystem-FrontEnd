import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('authToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const userStr = localStorage.getItem('user');

  if ((!token && !refreshToken) || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  if (!user || typeof user !== 'object') {
    return <Navigate to="/login" replace />;
  }

  // Block access if restaurant/tenant is suspended
  if (user.isSuspended || user.tenantStatus?.toLowerCase() === 'suspended' || user.tenantStatus?.toLowerCase() === 'terminated') {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user.role || '').toLowerCase();
    // Normalize diacritics (e.g. "Phục Vụ Bàn" -> "phuc vu ban")
    const cleanRole = userRole.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const isAllowed = allowedRoles.some((r) => {
      const allowed = r.toLowerCase();
      if (allowed === userRole || allowed === cleanRole) return true;
      if (allowed === 'technical' || allowed === 'technician') {
        return (
          cleanRole.includes('tech') ||
          cleanRole.includes('engineer') ||
          cleanRole.includes('ky thuat') ||
          userRole === 'admin' ||
          userRole === 'superadmin'
        );
      }
      if (allowed === 'admin') {
        return userRole === 'admin' || userRole === 'superadmin';
      }
      if (allowed === 'staff') {
        return (
          cleanRole.includes('staff') ||
          cleanRole.includes('waiter') ||
          cleanRole.includes('kds') ||
          cleanRole.includes('kitchen') ||
          cleanRole.includes('phuc vu') ||
          cleanRole.includes('phucvu') ||
          cleanRole.includes('bep') ||
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
