import { describe, it, expect } from 'vitest';
import { queryClient } from '@/services/queryClient';

describe('queryClient', () => {
  it('has staleTime of 5 minutes', () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(5 * 60 * 1000);
  });

  it('has gcTime of 10 minutes', () => {
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(10 * 60 * 1000);
  });

  it('does not refetch on window focus', () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });

  it('retries once on failure', () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(1);
  });
});
