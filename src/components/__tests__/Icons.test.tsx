/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Icons } from '../Icons';

describe('Icons', () => {
  it('renders all icons without crashing', () => {
    Object.entries(Icons).forEach(([, IconComponent]) => {
      const { container } = render(<IconComponent className="test-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
      expect(svgElement).toHaveClass('test-class');
    });
  });
});
