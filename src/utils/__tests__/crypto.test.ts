import { describe, it, expect } from 'vitest';
import { secureRandom } from '@/utils/crypto';

describe('secureRandom', () => {
  it('returns a number between 0 (inclusive) and 1 (exclusive)', () => {
    const result = secureRandom();
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(1);
  });

  it('produces values with cryptographic randomness (not the same)', () => {
    const results = new Set(Array.from({ length: 50 }, () => secureRandom()));
    // With 50 calls, should have significant variation (not all equal)
    expect(results.size).toBeGreaterThan(40);
  });
});
