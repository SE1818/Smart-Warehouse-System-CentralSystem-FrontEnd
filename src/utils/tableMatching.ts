/**
 * Shared table identifier normalization and matching utilities for WF-03.
 */

export function normalizeTableCode(value?: string | null): string {
  return (value || '').replace(/^Bàn\s+/i, '').trim().toLowerCase();
}

export function matchesTableIdentifier(
  table: { id?: string; tableNo?: string; name?: string },
  candidate?: string | null
): boolean {
  if (!candidate) return false;
  const trimmed = candidate.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (table.id && table.id === trimmed) return true;
  if (table.name && table.name.trim().toLowerCase() === lower) return true;
  if (table.tableNo && table.tableNo.trim().toLowerCase() === lower) return true;

  const normCandidate = normalizeTableCode(trimmed);
  if (!normCandidate) return false;

  const normName = normalizeTableCode(table.name);
  const normNo = normalizeTableCode(table.tableNo);
  return normName === normCandidate || normNo === normCandidate;
}
