import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { robotService } from '@/services';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const isSuperAdminUser = (user: any): boolean => {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const role = (user.role || '').toLowerCase().replace(/[-_\s]/g, '');
  return role === 'superadmin' || role === 'admin';
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('authToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const userStr = localStorage.getItem('user');
  const [edgeAccessDenied, setEdgeAccessDenied] = useState<string | null>(null);

  if ((!token && !refreshToken) || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  if (!user || typeof user !== 'object') {
    return <Navigate to="/login" replace />;
  }

  // 🛡️ Edge Node Tenant Verification
  useEffect(() => {
    let isMounted = true;
    robotService.getEdgeNodeInfo().then((info) => {
      if (!isMounted) return;
      if (info && info.isEdgeNode && info.subdomain) {
        const isSuperAdmin = isSuperAdminUser(user);
        const userSub = (user.subdomain || '').toLowerCase().trim();
        const edgeSub = info.subdomain.toLowerCase().trim();
        if (!isSuperAdmin && userSub !== edgeSub) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setEdgeAccessDenied(
            `Truy cập bị từ chối: Thiết bị Edge Box này thuộc quán '${info.restaurantName || edgeSub}'. Tài khoản của bạn thuộc quán '${userSub || 'khác'}'.`
          );
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (edgeAccessDenied) {
    return <Navigate to="/login" replace state={{ accessDeniedReason: edgeAccessDenied }} />;
  }

  // Block access if restaurant/tenant is suspended
  if (user.isSuspended || user.tenantStatus?.toLowerCase() === 'suspended' || user.tenantStatus?.toLowerCase() === 'terminated') {
    return <Navigate to="/unauthorized" replace />;
  }

  // Super Admin / System Admin has universal pass to access ANY route (staff, technical, etc.)
  if (isSuperAdminUser(user)) {
    return <>{children}</>;
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
          userRole === 'superadmin' ||
          userRole === 'super_admin'
        );
      }
      if (allowed === 'admin') {
        return userRole === 'admin' || userRole === 'superadmin' || userRole === 'super_admin';
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
          userRole === 'superadmin' ||
          userRole === 'super_admin'
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
