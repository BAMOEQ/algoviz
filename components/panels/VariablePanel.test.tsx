import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VariablePanel } from '@/components/panels/VariablePanel';

describe('VariablePanel', () => {
  it('shows direction when there are no variables', () => {
    render(<VariablePanel vars={{}} />);
    expect(screen.getByText('No variables yet.')).toBeInTheDocument();
  });

  it('renders one row per variable in insertion order, with null rendered distinctly', () => {
    render(<VariablePanel vars={{ i: 0, j: 1, pivot: null }} />);

    expect(screen.getByText('i')).toBeInTheDocument();
    expect(screen.getByText('j')).toBeInTheDocument();
    expect(screen.getByText('pivot')).toBeInTheDocument();
    expect(screen.getByText('null')).toBeInTheDocument();

    const names = screen.getAllByText(/^(i|j|pivot)$/).map((el) => el.textContent);
    expect(names).toEqual(['i', 'j', 'pivot']);
  });

  it('does not render a call stack section when callStack is absent or empty', () => {
    const { rerender } = render(<VariablePanel vars={{ i: 0 }} />);
    expect(screen.queryByText('Call stack')).not.toBeInTheDocument();

    rerender(<VariablePanel vars={{ i: 0 }} callStack={[]} />);
    expect(screen.queryByText('Call stack')).not.toBeInTheDocument();
  });

  it('renders the call stack innermost-first with each frame label and its vars', () => {
    render(
      <VariablePanel
        vars={{ n: 4 }}
        callStack={[
          { id: 'frame-outer', label: 'quickSort(0, 4)', vars: { lo: 0, hi: 4 } },
          { id: 'frame-inner', label: 'partition(0, 4)', vars: { lo: 0, hi: 4, pivot: 2 } },
        ]}
      />,
    );

    expect(screen.getByText('Call stack')).toBeInTheDocument();
    const frameLabels = screen.getAllByText(/quickSort|partition/).map((el) => el.textContent);
    // Innermost (last pushed, "partition") appears before the outer "quickSort" frame.
    expect(frameLabels).toEqual(['partition(0, 4)', 'quickSort(0, 4)']);
  });
});
