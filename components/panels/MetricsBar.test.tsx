import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricsBar } from '@/components/panels/MetricsBar';

describe('MetricsBar', () => {
  it('shows all four counters with their current values', () => {
    render(<MetricsBar metrics={{ comparisons: 3, swaps: 1, reads: 8, writes: 2 }} />);

    expect(screen.getByText('cmp')).toBeInTheDocument();
    expect(screen.getByText('swap')).toBeInTheDocument();
    expect(screen.getByText('read')).toBeInTheDocument();
    expect(screen.getByText('write')).toBeInTheDocument();

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('reflects updated metrics on rerender', () => {
    const { rerender } = render(<MetricsBar metrics={{ comparisons: 0, swaps: 0, reads: 0, writes: 0 }} />);
    expect(screen.getAllByText('0')).toHaveLength(4);

    rerender(<MetricsBar metrics={{ comparisons: 5, swaps: 0, reads: 0, writes: 0 }} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
