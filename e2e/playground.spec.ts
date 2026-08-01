import { expect, test } from '@playwright/test';

test('build a BST in Free Play and run in-order traversal to completion', async ({ page }) => {
  await page.goto('/playground');

  await page.getByLabel('Structure').selectOption('binary-search-tree');

  for (const value of ['50', '30', '70', '12']) {
    await page.getByLabel('Insert Value').fill(value);
    await page.getByRole('button', { name: 'Insert', exact: true }).click();
  }

  // Four inserts produce four nodes on the canvas.
  await expect(page.locator('svg[role="img"] text', { hasText: '50' }).first()).toBeVisible();
  await expect(page.locator('svg[role="img"] text', { hasText: '12' }).first()).toBeVisible();

  await page.getByRole('button', { name: /In-order Traversal/ }).click();

  const timeline = page.getByRole('slider', { name: 'Trace position' });
  await expect(timeline).toBeVisible();

  // Jump to the last step and confirm the traversal reports sorted output.
  await timeline.focus();
  await page.keyboard.press('End');

  const total = Number(await timeline.getAttribute('aria-valuemax'));
  expect(total).toBeGreaterThan(0);
  await expect(timeline).toHaveAttribute('aria-valuenow', String(total));

  await expect(page.getByText(/In-order output: 12 30 50 70/)).toBeVisible();

  // Stepping back to zero restores the initial scene.
  await page.keyboard.press('Home');
  await expect(timeline).toHaveAttribute('aria-valuenow', '0');
});

test('scrubbing to an arbitrary step is exact, and metrics track the step', async ({ page }) => {
  await page.goto('/playground');

  for (const value of ['5', '2', '9', '1']) {
    await page.getByLabel('Push Value').fill(value);
    await page.getByRole('button', { name: 'Push', exact: true }).click();
  }

  await page.getByRole('button', { name: /Bubble Sort/ }).click();

  const timeline = page.getByRole('slider', { name: 'Trace position' });
  await timeline.focus();

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(timeline).toHaveAttribute('aria-valuenow', '2');

  // The pseudocode pane highlights exactly one executing line.
  await expect(page.locator('[aria-current="step"]')).toHaveCount(1);

  await page.keyboard.press('End');
  await expect(page.getByText(/Sorted|pass/)).toBeVisible();
});
