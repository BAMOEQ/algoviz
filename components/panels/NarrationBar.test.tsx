import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NarrationBar } from '@/components/panels/NarrationBar';

describe('NarrationBar', () => {
  it('renders the narration inside an accessible live region', () => {
    render(<NarrationBar narration="Compare 2 and 9 — already in order." />);

    const text = screen.getByText('Compare 2 and 9 — already in order.');
    expect(text).toBeInTheDocument();

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    expect(liveRegion).toContainElement(text);
  });

  it('does not show a truncation notice by default', () => {
    render(<NarrationBar narration="Pushed 4 onto the stack." />);
    expect(screen.queryByText(/Trace truncated/)).not.toBeInTheDocument();
  });

  it('shows the truncation notice only when flagged', () => {
    render(<NarrationBar narration="Continuing." truncated />);
    expect(
      screen.getByText('Trace truncated at 5000 steps — reduce the input size.'),
    ).toBeInTheDocument();
  });
});
