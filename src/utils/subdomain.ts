/**
 * Store Edge Subdomain & Hostname Resolution Utility
 */

export function getTenantSubdomain(): string {
  if (typeof window === 'undefined') return 'launuong-saigon';

  // 1. Check query parameter ?subdomain=...
  try {
    const params = new URLSearchParams(window.location.search);
    const subParam = params.get('subdomain');
    if (subParam) return subParam;
  } catch {}

  // 2. Extract from hostname (<subdomain>.local or <subdomain>.smartwarehouse.vn)
  const host = window.location.hostname;
  if (host) {
    const parts = host.split('.');
    if (
      parts.length >= 2 &&
      !['localhost', '127', 'www'].includes(parts[0]) &&
      !/^\d+$/.test(parts[0])
    ) {
      return parts[0];
    }
  }

  // 3. Environment variable fallback
  if (import.meta.env.VITE_SUBDOMAIN) {
    return import.meta.env.VITE_SUBDOMAIN;
  }

  // 4. Stored user session fallback
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.subdomain) return parsed.subdomain;
    }
  } catch {}

  return 'launuong-saigon';
}

export function getLocalEdgeUrl(subdomain?: string, port = 3200): string {
  const sub = subdomain || getTenantSubdomain();
  return `http://${sub}.local:${port}`;
}
