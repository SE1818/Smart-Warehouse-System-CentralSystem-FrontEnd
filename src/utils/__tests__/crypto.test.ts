import { describe, it, expect } from 'vitest';
import { secureRandom } from '@/utils/crypto';

describe('secureRandom', () => {
  it('returns a number', () => {
    const result = secureRandom();
    expect(typeof result).toBe('number');
  });

  it('returns a value between 0 (inclusive) and 1 (exclusive)', () => {
    const result = secureRandom();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(1);
  });

  it('returns different values across multiple calls', () => {
    const results = Array.from({ length: 30 }, () => secureRandom());
    const uniqueResults = new Set(results);
    expect(uniqueResults.size).toBeGreaterThan(25);
  });
});
