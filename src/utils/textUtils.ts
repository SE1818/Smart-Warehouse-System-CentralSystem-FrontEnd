/**
 * Utility functions for text processing, UTF-8 JWT decoding,
 * and Mojibake auto-recovery for Vietnamese diacritics.
 */

export function decodeJwtPayload(token: string): any {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to decode JWT with UTF-8:', err);
    try {
      const parts = token.split('.');
      return JSON.parse(atob(parts[1]));
    } catch {
      return null;
    }
  }
}

export function fixMojibake(str: string): string {
  if (!str) return str;

  let cleaned = str
    .replace(/LÃº/g, 'Lê')
    .replace(/LÃª/g, 'Lê')
    .replace(/Tuáº¥n/g, 'Tuấn')
    .replace(/Khoa/g, 'Khoa');

  try {
    if (/[\u00C0-\u00FF]/.test(cleaned)) {
      const isByteString = [...cleaned].every((c) => c.charCodeAt(0) <= 255);
      if (isByteString) {
        const bytes = new Uint8Array([...cleaned].map((c) => c.charCodeAt(0)));
        const decoded = new TextDecoder('utf-8').decode(bytes);
        if (!decoded.includes('\uFFFD') && decoded.length > 0) {
          cleaned = decoded;
        }
      }
    }
  } catch {
    // Keep current cleaned if decoder fails
  }

  return cleaned.trim();
}

export function getUserInitials(fullName: string): string {
  if (!fullName) return 'NV';
  const clean = fixMojibake(fullName).trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'NV';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  const first = words[0].charAt(0);
  const last = words[words.length - 1].charAt(0);
  return (first + last).toUpperCase();
}
