/**
 * Cryptographically secure replacement for Math.random()
 * to satisfy SonarQube security rules.
 */
export function secureRandom(): number {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] / 4294967296; // 2^32
}
