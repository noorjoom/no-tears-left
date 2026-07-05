import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './global-setup';
import { E2E_IDS } from './seed';

// Core competitive loop: mod enters a match result (already reviewed on
// Discord), points land on the leaderboard immediately.
test('mod enters a result -> points on leaderboard', async ({ browser }) => {
  const matchId = 'e2e-match-bravo-001';

  const mod = await browser.newContext({ storageState: STORAGE_STATE.mod });
  const modPage = await mod.newPage();
  await modPage.goto('/mod?tab=submissions');

  await modPage.getByLabel('Tournament').selectOption(E2E_IDS.tournB);
  await modPage.getByLabel('Team').selectOption(E2E_IDS.teamB);
  await modPage.getByLabel('Match ID').fill(matchId);
  await modPage.getByLabel('Eliminations').fill('3');
  await modPage.getByLabel('Placement').fill('2');
  await modPage.getByRole('button', { name: 'Add result' }).click();

  await expect(modPage.getByText('Submission added.')).toBeVisible();

  // 3 elims + placement(2)=7 -> computed score 10.
  await modPage.goto('/mod?tab=history');
  const row = modPage.getByRole('listitem').filter({ hasText: `match ${matchId}` });
  await expect(row).toBeVisible();
  await expect(row.getByText('10 pts')).toBeVisible();

  // Verified points show on the public leaderboard for Team Bravo.
  const publicPage = await mod.newPage();
  await publicPage.goto('/leaderboard');
  const leaderboardRow = publicPage.getByRole('row', { name: /Team Bravo/ });
  await expect(leaderboardRow).toBeVisible();
  await expect(leaderboardRow.getByText('10')).toBeVisible();

  await mod.close();
});
