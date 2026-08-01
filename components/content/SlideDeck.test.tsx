import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SlideDeck } from '@/components/content/SlideDeck';

// The deck opens on the slide named in the URL, and jsdom carries the URL from one test to the
// next — so every test starts from a clean one.
beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

/** The shape `remarkSectionize` hands the deck: plain sections carrying a label. */
function sections(): ReactElement {
  return (
    <>
      <section id="what-it-is" data-label="What it is">
        <p>An array is a block of memory.</p>
      </section>
      <section id="complexity" data-label="Complexity">
        <p>Indexing is O(1).</p>
      </section>
    </>
  );
}

function renderDeck(slug = 'array') {
  return render(<SlideDeck slug={slug}>{sections()}</SlideDeck>);
}

describe('SlideDeck', () => {
  it('builds a rail from the sections and appends the registry slides', () => {
    renderDeck();

    expect(screen.getByRole('tab', { name: 'What it is' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Complexity' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'In code' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pseudocode' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Free play' })).toBeInTheDocument();
  });

  it('shows only the first slide, and reports its position in the trace', () => {
    renderDeck();

    expect(screen.getByText('An array is a block of memory.')).toBeVisible();
    expect(screen.queryByText('Indexing is O(1).')).not.toBeVisible();
    expect(screen.getByText('01 / 05')).toBeInTheDocument();
  });

  it('moves to a slide when its rail tab is clicked', async () => {
    const user = userEvent.setup();
    renderDeck();

    await user.click(screen.getByRole('tab', { name: 'Complexity' }));

    expect(screen.getByText('Indexing is O(1).')).toBeVisible();
    expect(screen.queryByText('An array is a block of memory.')).not.toBeVisible();
    expect(screen.getByRole('tab', { name: 'Complexity' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('steps with the arrow keys once the rail has focus', async () => {
    const user = userEvent.setup();
    renderDeck();

    await user.click(screen.getByRole('tab', { name: 'What it is' }));
    await user.keyboard('{ArrowRight}');

    expect(screen.getByText('Indexing is O(1).')).toBeVisible();

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Free play' })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Home}');
    expect(screen.getByText('An array is a block of memory.')).toBeVisible();
  });

  it('steps with the deck controls, which stop at both ends', async () => {
    const user = userEvent.setup();
    renderDeck();

    const back = screen.getByRole('button', { name: 'Previous slide' });
    const forward = screen.getByRole('button', { name: 'Next slide' });

    expect(back).toBeDisabled();

    await user.click(forward);
    expect(screen.getByText('Indexing is O(1).')).toBeVisible();
    expect(back).toBeEnabled();

    await user.click(forward);
    await user.click(forward);
    await user.click(forward);
    expect(forward).toBeDisabled();
  });

  it('keeps the arrow keys working after a deck control was clicked', async () => {
    const user = userEvent.setup();
    renderDeck();

    await user.click(screen.getByRole('button', { name: 'Next slide' }));
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'In code' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('leaves the arrow keys to the slide content that binds them', async () => {
    const user = userEvent.setup();
    render(
      <SlideDeck slug="array">
        <section id="a" data-label="What it is">
          <input aria-label="scratch" />
        </section>
        <section id="b" data-label="Complexity">
          <p>Indexing is O(1).</p>
        </section>
      </SlideDeck>,
    );

    await user.click(screen.getByRole('textbox', { name: 'scratch' }));
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'What it is' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('opens each slide at its top, however far the last one was scrolled', async () => {
    const user = userEvent.setup();
    const { container } = renderDeck();

    const panels = container.querySelector<HTMLElement>('[data-slide-panels]');
    panels!.scrollTop = 240;

    await user.click(screen.getByRole('tab', { name: 'Complexity' }));

    expect(panels!.scrollTop).toBe(0);
  });

  it('names the slide the reader is about to reach', () => {
    renderDeck();

    expect(screen.getByText(/next: Complexity/)).toBeInTheDocument();
  });

  it('renders the registry slides from the structure, not from the doc', async () => {
    const user = userEvent.setup();
    renderDeck();

    await user.click(screen.getByRole('tab', { name: 'Pseudocode' }));
    expect(screen.getByRole('heading', { name: 'Bubble Sort' })).toBeVisible();

    await user.click(screen.getByRole('tab', { name: 'Free play' }));
    expect(screen.getByRole('link', { name: /Open Array in Free Play/ })).toHaveAttribute(
      'href',
      '/playground?structure=array&seed=1',
    );
  });

  it('opens on the slide named in the url', () => {
    window.history.replaceState(null, '', '#complexity');
    renderDeck();

    expect(screen.getByText('Indexing is O(1).')).toBeVisible();
  });

  it('writes the current slide back to the url so a slide can be linked to', async () => {
    const user = userEvent.setup();
    renderDeck();

    await user.click(screen.getByRole('tab', { name: 'Pseudocode' }));

    expect(window.location.hash).toBe('#pseudocode');
  });

  it('falls back to the doc alone when the slug is not registered', () => {
    renderDeck('not-a-structure');

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByText('01 / 02')).toBeInTheDocument();
  });
});
