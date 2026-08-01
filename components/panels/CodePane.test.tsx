import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CodePane } from '@/components/panels/CodePane';

describe('CodePane', () => {
  it('renders the empty-state direction when there is no pseudocode', () => {
    render(<CodePane pseudocode={[]} activeLine={null} />);
    expect(screen.getByText('Run an algorithm to see its code.')).toBeInTheDocument();
  });

  it('marks the active line with both the gutter marker and aria-current', () => {
    const pseudocode = ['for i = 0 to n-1', '  for j = 0 to n-i-2', '    if a[j] > a[j+1]'];
    render(<CodePane pseudocode={pseudocode} activeLine={1} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);

    const activeItem = items[1];
    expect(activeItem).toHaveAttribute('aria-current', 'step');
    expect(activeItem).toHaveTextContent('▸');
    expect(activeItem).toHaveTextContent('for j = 0 to n-i-2');

    const inactiveItem = items[0];
    expect(inactiveItem).not.toHaveAttribute('aria-current');
    // Inactive lines show their 1-based line number instead of the marker.
    expect(inactiveItem).toHaveTextContent('1');
    expect(inactiveItem).not.toHaveTextContent('▸');
  });

  it('marks no line active when activeLine is null', () => {
    render(<CodePane pseudocode={['a', 'b']} activeLine={null} />);
    const items = screen.getAllByRole('listitem');
    for (const item of items) {
      expect(item).not.toHaveAttribute('aria-current');
    }
  });
});
