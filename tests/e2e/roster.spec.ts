import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './global-setup';

// Full roster review loop in one ordered test (apply must precede approve).
// Uses two browser contexts: the fresh applicant, then a mod.
test('roster apply -> mod approve -> appears on public roster', async ({ browser }) => {
  const epicUsername = 'FreshFreddyEpic';

  // 1. Applicant submits a roster application.
  const applicant = await browser.newContext({
    storageState: STORAGE_STATE.freshApplicant,
  });
  const applicantPage = await applicant.newPage();
  await applicantPage.goto('/roster/apply');

  await applicantPage.locator('#epicUsername').fill(epicUsername);
  await applicantPage.locator('#platform').selectOption('PC');
  await applicantPage.locator('#timezone').fill('America/Chicago');
  await applicantPage.locator('#whyText').fill('I want to compete in NTL ZB events.');
  await applicantPage.getByRole('button', { name: /Submit application/ }).click();

  await applicantPage.waitForURL('**/dashboard?tab=application');
  await expect(applicantPage.getByText('PENDING')).toBeVisible();

  // 2. Mod approves the pending application.
  const mod = await browser.newContext({ storageState: STORAGE_STATE.mod });
  const modPage = await mod.newPage();
  await modPage.goto('/mod?tab=roster');

  const card = modPage.getByRole('listitem').filter({ hasText: 'Fresh Freddy' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Approve' }).click();

  // Card is removed from the pending queue after approval.
  await expect(card).toBeHidden();

  // 3. Approved applicant now appears on the public roster.
  const publicPage = await mod.newPage();
  await publicPage.goto('/roster');
  await expect(publicPage.getByText(epicUsername)).toBeVisible();

  await applicant.close();
  await mod.close();
});
