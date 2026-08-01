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

  // The complexity table is rendered from the registry, not hand-written in the doc.
  await expect(page.getByRole('cell', { name: 'search' }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'O(log n)' }).first()).toBeVisible();

  // The embedded demo is steppable inline.
  await page.getByRole('button', { name: /Run In-order Traversal/ }).click();

  const timeline = page.getByRole('slider', { name: 'Trace position' }).first();
  await expect(timeline).toBeVisible();

  await timeline.focus();
  await page.keyboard.press('ArrowRight');
  await expect(timeline).toHaveAttribute('aria-valuenow', '1');

  // The deep link into Free Play carries the structure over.
  const deepLink = page.getByRole('link', { name: /Open Binary Search Tree in Free Play/ });
  await expect(deepLink).toHaveAttribute('href', '/playground?structure=binary-search-tree&seed=1');
});
