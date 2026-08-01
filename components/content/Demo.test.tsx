import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';
import { Demo } from '@/components/content/Demo';

describe('Demo', () => {
  it('renders the seeded structure before any trace is run', () => {
    render(<Demo structure="array" />);

    expect(screen.getByRole('button', { name: /Run/ })).toBeInTheDocument();
  });

  // Regression: an inline `[]` fallback handed `usePlayer` a fresh array identity every render,
  // which it read as a new trace and reset against during render. StrictMode's double render —
  // on by default in `next dev` — turned that into "Too many re-renders".
  it('survives a StrictMode double render before any trace is run', () => {
    expect(() =>
      render(
        <StrictMode>
          <Demo structure="array" />
        </StrictMode>,
      ),
    ).not.toThrow();
  });

  it('renders a fallback for an unregistered structure', () => {
    render(<Demo structure="not-a-structure" />);

    expect(screen.getByText(/No structure is registered/)).toBeInTheDocument();
  });
});
