/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';

// main inputs
import App from '../App';
import { queryClient } from '../services/queryClient';

function Root() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>
  );
}

describe('main.tsx integration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    localStorage.clear();
    queryClient.clear();
    container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);
    const root = createRoot(container);
    expect(root).toBeDefined();
    window.history.pushState(null, '', '/login');
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  it('renders Root with StrictMode and QueryClientProvider', () => {
    // Render synchronously to exercise StrictMode + QueryClientProvider paths
    const html = renderToString(<Root />);
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(0);
  });

  it('root string is non-empty and not a fragment', () => {
    const html = renderToString(<Root />);
    expect(html).not.toBe('<!---->');
  });

  it('handles multiple QueryClientProvider clears', () => {
    queryClient.setQueryData(['test'], 1);
    expect(queryClient.getQueryData(['test'])).toBe(1);
    queryClient.clear();
    expect(queryClient.getQueryData(['test'])).toBeUndefined();
    // Should not throw on double clear
    queryClient.clear();
  });
});
