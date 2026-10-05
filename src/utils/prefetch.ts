/**
 * Prefetch helper: Triggers dynamic chunk downloads in the background on hover / focus
 * before the user actually clicks, reducing perceived page load latency to 0ms.
 */
const prefetchedSet = new Set<string>();

export function prefetchComponent(key: string, importFn: () => Promise<any>): void {
  if (prefetchedSet.has(key)) return;
  prefetchedSet.add(key);

  // Prefetch with low priority / idle callback if available
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      importFn().catch(() => {
        prefetchedSet.delete(key);
      });
    });
  } else {
    setTimeout(() => {
      importFn().catch(() => {
        prefetchedSet.delete(key);
      });
    }, 100);
  }
}
