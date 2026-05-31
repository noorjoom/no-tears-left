import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './global-setup';
import { E2E_IDS } from './seed';

// Captain creates a team in the open tournament, copies the generated invite
// token, and the partner joins via that token. Two contexts, ordered.
test('captain creates team -> partner joins via invite token', async ({ browser }) => {
  const tournamentUrl = `/tournaments/${E2E_IDS.tournA}`;

  // 1. Captain creates the team.
  const captain = await browser.newContext({ storageState: STORAGE_STATE.captain });
  const captainPage = await captain.newPage();
  await captainPage.goto(tournamentUrl);

  await captainPage.getByRole('button', { name: 'Create team' }).click();
  await captainPage.locator('#team-name').fill('Frost Giants');
  await captainPage.getByRole('button', { name: 'Create', exact: true }).click();

  // After creation the detail page shows the team with an open seat + invite box.
  await expect(captainPage.getByRole('heading', { name: 'Frost Giants' })).toBeVisible();
  const inviteCode = captainPage.locator('code');
  await expect(inviteCode).toBeVisible();

  const inviteUrl = (await inviteCode.innerText()).trim();
  const token = new URL(inviteUrl).searchParams.get('token');
  expect(token, 'invite url should carry a token').toBeTruthy();

  // 2. Partner joins via the invite token.
  const partner = await browser.newContext({ storageState: STORAGE_STATE.partner });
  const partnerPage = await partner.newPage();
  await partnerPage.goto(`/teams/join?token=${token}`);
  await partnerPage.getByRole('button', { name: 'Join team' }).click();
  await partnerPage.waitForURL('**/dashboard?tab=teams');
  await expect(partnerPage.getByRole('heading', { name: 'Frost Giants' })).toBeVisible();

  // 3. Team now reads as Full on the tournament detail page.
  await captainPage.reload();
  await expect(captainPage.getByText('Full')).toBeVisible();

  await captain.close();
  await partner.close();
});
