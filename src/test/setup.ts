import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock sql.js WebAssembly loader for JSDOM test environment
vi.mock('sql.js', () => ({
  default: vi.fn().mockResolvedValue({
    Database: class MockDatabase {
      run = vi.fn();
      exec = vi.fn().mockReturnValue([]);
      export = vi.fn().mockReturnValue(new Uint8Array());
      close = vi.fn();
    }
  })
}));
