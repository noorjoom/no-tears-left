import { test, expect } from '@playwright/test';
import { E2E_ROSTER_EPIC, E2E_LEADERBOARD_TEAM_NAME } from './seed';

// Public, unauthenticated browsing. No storageState — the default context has
// no session cookie.
test.describe('public browsing', () => {
  test('landing page renders hero and nav', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/competitive home of/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tournaments', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Leaderboard', exact: true })).toBeVisible();
  });

  test('roster lists an approved member', async ({ page }) => {
    await page.goto('/roster');
    await expect(page.getByRole('heading', { name: 'Roster', level: 1 })).toBeVisible();
    await expect(page.getByText(E2E_ROSTER_EPIC)).toBeVisible();
  });

  test('leaderboard shows the seeded verified result', async ({ page }) => {
    await page.goto('/leaderboard');
    await expect(
      page.getByRole('heading', { name: 'Leaderboard', level: 1 }),
    ).toBeVisible();
    const row = page.getByRole('row', { name: new RegExp(E2E_LEADERBOARD_TEAM_NAME) });
    await expect(row).toBeVisible();
    // 5 elims + placement(1)=10 -> 15 points.
    await expect(row.getByText('15')).toBeVisible();
  });

  test('tournaments list shows non-draft tournaments and links to detail', async ({
    page,
  }) => {
    await page.goto('/tournaments');
    const card = page.getByRole('link', { name: /E2E Open Cup \(Teams\)/ });
    await expect(card).toBeVisible();
    await card.click();
    await expect(
      page.getByRole('heading', { name: 'E2E Open Cup (Teams)', level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Teams', level: 2 })).toBeVisible();
  });
});
