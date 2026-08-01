import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { InitCode, LANGUAGE_STORAGE_KEY, splitInlineCode } from '@/components/content/InitCode';

beforeEach(() => {
  localStorage.clear();
});

describe('InitCode', () => {
  it('opens in Python and builds the same instance the demo is seeded with', () => {
    render(<InitCode slug="array" />);

    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('python');
    expect(screen.getByText(/values = \[5, 2, 9, 1, 7, 3\]/)).toBeInTheDocument();
  });

  it('swaps the snippet and its note when another language is picked', async () => {
    const user = userEvent.setup();
    render(<InitCode slug="array" />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'cpp');

    expect(screen.getByText(/std::vector<int> values/)).toBeInTheDocument();
    expect(screen.getByText(/contiguous storage/)).toBeInTheDocument();
  });

  it('remembers the language, so it carries across structures', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<InitCode slug="array" />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'java');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('java');

    unmount();
    render(<InitCode slug="stack" />);

    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('java');
    expect(screen.getByText(/Deque<Character> stack/)).toBeInTheDocument();
  });

  it('ignores a stored value that is no longer a language it offers', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'cobol');
    render(<InitCode slug="array" />);

    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('python');
  });

  it('sets the identifiers in a note as code rather than printing backticks', () => {
    render(<InitCode slug="binary-heap" />);

    expect(screen.getByText('heapq', { selector: 'code' })).toBeInTheDocument();
    expect(screen.queryByText(/`heapq`/)).not.toBeInTheDocument();
  });

  it('splits a note into plain and code runs', () => {
    expect(splitInlineCode('use `at()` here')).toEqual([
      { code: false, text: 'use ' },
      { code: true, text: 'at()' },
      { code: false, text: ' here' },
    ]);
    expect(splitInlineCode('no code at all')).toEqual([{ code: false, text: 'no code at all' }]);
  });

  it('says so plainly when a structure has no snippet yet', () => {
    render(<InitCode slug="skip-list" />);

    expect(screen.getByText(/has not been written yet/)).toBeInTheDocument();
  });
});
