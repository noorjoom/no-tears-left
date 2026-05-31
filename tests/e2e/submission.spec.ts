import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './global-setup';
import { E2E_IDS } from './seed';

const SCREENSHOT = resolve(process.cwd(), 'tests/e2e/fixtures/screenshot.png');
const FAKE_SIGNED_URL = 'https://e2e.supabase.co/storage/v1/object/upload/e2e-fake';
const FAKE_PUBLIC_URL = 'https://e2e.supabase.co/storage/v1/object/public/e2e-fake.png';

// Core competitive loop: captain submits a result (Supabase upload hop stubbed
// at the network layer), a mod verifies it, points land on the leaderboard.
test('captain submits -> mod verifies -> points on leaderboard', async ({ browser }) => {
  const matchId = 'e2e-match-bravo-001';

  // 1. Captain submits, with the signed-URL + storage PUT intercepted.
  const captain = await browser.newContext({ storageState: STORAGE_STATE.captain });
  const captainPage = await captain.newPage();

  await captainPage.route('**/api/upload-url', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { signedUrl: FAKE_SIGNED_URL, publicUrl: FAKE_PUBLIC_URL },
      }),
    });
  });
  // Intercept the direct-to-Supabase PUT so no real storage is touched.
  await captainPage.route(FAKE_SIGNED_URL, async (route) => {
    await route.fulfill({ status: 200, body: '' });
  });

  await captainPage.goto(`/tournaments/${E2E_IDS.tournB}/submit`);
  await captainPage.locator('#matchId').fill(matchId);
  await captainPage.locator('#eliminations').fill('3');
  await captainPage.locator('#placement').fill('2');
  await captainPage.locator('#screenshot').setInputFiles(SCREENSHOT);
  await captainPage.getByRole('button', { name: 'Submit result' }).click();

  await captainPage.waitForURL('**/dashboard?tab=teams');

  // 2. Mod verifies the pending submission.
  const mod = await browser.newContext({ storageState: STORAGE_STATE.mod });
  const modPage = await mod.newPage();
  await modPage.goto('/mod?tab=submissions');

  const card = modPage.getByRole('listitem').filter({ hasText: `match ${matchId}` });
  await expect(card).toBeVisible();
  // 3 elims + placement(2)=7 -> computed score 10.
  await expect(card.getByText('10')).toBeVisible();
  await card.getByRole('button', { name: 'Verify' }).click();
  await expect(card).toBeHidden();

  // 3. Verified points show on the public leaderboard for Team Bravo.
  const publicPage = await mod.newPage();
  await publicPage.goto('/leaderboard');
  const row = publicPage.getByRole('row', { name: /Team Bravo/ });
  await expect(row).toBeVisible();
  await expect(row.getByText('10')).toBeVisible();

  await captain.close();
  await mod.close();
});
