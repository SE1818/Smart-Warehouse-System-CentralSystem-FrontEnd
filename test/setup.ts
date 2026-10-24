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

const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

const localStorageMock = createStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

const sessionStorageMock = createStorageMock();
Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
    configurable: true,
  });
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
