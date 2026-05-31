import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './global-setup';

// Validates that minted session cookies decode on the server and that role
// gating works. If these fail, every authed spec below is unreliable — treat
// this as the canary.
test.describe('auth smoke', () => {
  test('captain cookie reaches the dashboard', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.captain });
    const page = await ctx.newPage();
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    await ctx.close();
  });

  test('mod cookie reaches the moderator queue', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.mod });
    const page = await ctx.newPage();
    await page.goto('/mod');
    await expect(
      page.getByRole('heading', { name: 'Moderator queue', level: 1 }),
    ).toBeVisible();
    await ctx.close();
  });

  test('member is forbidden from the moderator queue', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.captain });
    const page = await ctx.newPage();
    await page.goto('/mod');
    // Middleware redirects non-mods to '/'.
    await expect(page).toHaveURL('/');
    await ctx.close();
  });

  test('unauthenticated user is redirected off the dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/');
  });
});
