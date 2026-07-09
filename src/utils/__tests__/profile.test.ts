import { describe, it, expect } from 'vitest';
import { getFullName } from '@/types/profile';

describe('getFullName', () => {
  it('returns first and last name when both exist', () => {
    expect(getFullName({ id: '1', username: 'u', email: 'e', role: 'r', isActive: true, createdAt: '2024', firstName: 'John', lastName: 'Doe' })).toBe('John Doe');
  });

  it('returns firstName only', () => {
    expect(getFullName({ id: '1', username: 'u', email: 'e', role: 'r', isActive: true, createdAt: '2024', firstName: 'John' })).toBe('John');
  });

  it('returns lastName only', () => {
    expect(getFullName({ id: '1', username: 'u', email: 'e', role: 'r', isActive: true, createdAt: '2024', lastName: 'Doe' })).toBe('Doe');
  });

  it('falls back to username', () => {
    expect(getFullName({ id: '1', username: 'johndoe', email: 'e', role: 'r', isActive: true, createdAt: '2024' })).toBe('johndoe');
  });

  it('falls back to email when no username', () => {
    expect(getFullName({ id: '1', username: '', email: 'john@test.com', role: 'r', isActive: true, createdAt: '2024' })).toBe('john@test.com');
  });
});
