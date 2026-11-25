import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for the Bookmarks page (`src/pages/bookmarks.tsx`).
 *
 * Bookmarks are stored in localStorage under the `bookmarks` key by the
 * floating BookmarkButton (see `src/hooks/useBookmarks.ts`), so these flows
 * need a real browser.
 */

const DOC_PATH = '/docs/patterns/hello-world';
const SECOND_DOC_PATH = '/docs/patterns/overview';

async function seedBookmarks(page: Page, paths: string[]): Promise<void> {
  await page.goto('/bookmarks');
  await page.evaluate((value) => localStorage.setItem('bookmarks', JSON.stringify(value)), paths);
  await page.reload();
}

function bookmarkList(page: Page) {
  return page.getByRole('main').getByRole('listitem');
}

test.describe('Bookmarks page', () => {
  test('renders the empty state when nothing is bookmarked', async ({ page }) => {
    await page.goto('/bookmarks');

    await expect(page.getByRole('heading', { name: 'Bookmarks', level: 1 })).toBeVisible();
    await expect(page.getByText('You have not bookmarked any pages yet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear all bookmarks' })).toHaveCount(0);
  });

  test('a bookmark added from a doc page appears on the bookmarks page', async ({ page }) => {
    // Wait for hydration so the click reaches the React handler.
    await page.goto(DOC_PATH, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Add bookmark' }).click();
    await expect(page.getByRole('button', { name: 'Remove bookmark' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.goto('/bookmarks');

    await expect(bookmarkList(page)).toHaveCount(1);
    await expect(
      page.getByRole('main').getByRole('link', { name: new RegExp(`^${DOC_PATH}/?$`) }),
    ).toBeVisible();
  });

  test('removing a bookmark removes it from the list and persists', async ({ page }) => {
    await seedBookmarks(page, [DOC_PATH, SECOND_DOC_PATH]);
    await expect(bookmarkList(page)).toHaveCount(2);

    await bookmarkList(page)
      .filter({ hasText: DOC_PATH })
      .getByRole('button', { name: 'Remove', exact: true })
      .click();

    await expect(bookmarkList(page)).toHaveCount(1);
    await expect(page.getByRole('main').getByRole('link', { name: DOC_PATH })).toHaveCount(0);

    await page.reload();
    await expect(bookmarkList(page)).toHaveCount(1);
    await expect(page.getByRole('main').getByRole('link', { name: SECOND_DOC_PATH })).toBeVisible();
  });

  test('"Clear all bookmarks" empties the list', async ({ page }) => {
    await seedBookmarks(page, [DOC_PATH, SECOND_DOC_PATH]);
    await expect(bookmarkList(page)).toHaveCount(2);

    await page.getByRole('button', { name: 'Clear all bookmarks' }).click();

    await expect(bookmarkList(page)).toHaveCount(0);
    await expect(page.getByText('You have not bookmarked any pages yet.')).toBeVisible();

    await page.reload();
    await expect(page.getByText('You have not bookmarked any pages yet.')).toBeVisible();
  });
});
