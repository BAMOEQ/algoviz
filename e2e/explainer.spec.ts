import { expect, test } from '@playwright/test';

test('the data structures index lists every registered structure and filters by category', async ({
  page,
}) => {
  await page.goto('/data-structures');

  await expect(page.getByRole('heading', { name: 'data structures' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Binary Search Tree/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Hash Table/ })).toBeVisible();

  await page.getByRole('button', { name: 'Trees' }).click();

  await expect(page.getByRole('link', { name: /Binary Search Tree/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Hash Table/ })).toHaveCount(0);
});

test('an explainer page steps its embedded demo and matches the registry complexity table', async ({
  page,
}) => {
  await page.goto('/data-structures/binary-search-tree');

  await expect(page.getByRole('heading', { name: 'Binary Search Tree' })).toBeVisible();

  // The embedded demo is steppable inline, on the slide it was written into.
  await page.getByRole('button', { name: /Run In-order Traversal/ }).click();

  const timeline = page.getByRole('slider', { name: 'Trace position' }).first();
  await expect(timeline).toBeVisible();

  await timeline.focus();
  await page.keyboard.press('ArrowRight');
  await expect(timeline).toHaveAttribute('aria-valuenow', '1');

  // The complexity table is rendered from the registry, not hand-written in the doc.
  await page.getByRole('tab', { name: 'Complexity' }).click();
  await expect(page.getByRole('cell', { name: 'search' }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'O(log n)' }).first()).toBeVisible();

  // The deep link into Free Play carries the structure over.
  await page.getByRole('tab', { name: 'Free play' }).click();
  const deepLink = page.getByRole('link', { name: /Open Binary Search Tree in Free Play/ });
  await expect(deepLink).toHaveAttribute('href', '/playground?structure=binary-search-tree&seed=1');
});

test('the explainer deck steps through its slides and links to a single one', async ({ page }) => {
  await page.goto('/data-structures/array');

  await expect(page.getByRole('tab', { name: 'What it is' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText('01 / 08')).toBeVisible();

  await page.getByRole('button', { name: 'Next slide' }).click();
  await expect(page.getByText('02 / 08')).toBeVisible();

  // Arrow keys work with nothing focused — where a reader who just arrived actually is.
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('03 / 08')).toBeVisible();

  // Each slide is addressable, and a shared link opens on it.
  await expect(page).toHaveURL(/#complexity$/);
  await page.goto('/data-structures/array#common-pitfalls');
  await expect(page.getByRole('tab', { name: 'Common pitfalls' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
