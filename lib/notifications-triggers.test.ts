// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, type TestDbHandle } from './db-test';
import {
  rosterApplications,
  submissions,
  teams,
  tournaments,
  users,
} from '@/db/schema';
import {
  notifyPartnerJoined,
  notifyRosterReviewed,
  notifySubmissionReviewed,
} from './notifications-triggers';
import { listNotificationsForUser } from './notifications-service';

async function seedUser(
  h: TestDbHandle,
  discordId: string,
  username: string,
): Promise<string> {
  const [u] = await h.db
    .insert(users)
    .values({ discordId, discordUsername: username })
    .returning();
  return u.id;
}

async function seedTournament(h: TestDbHandle, createdBy: string) {
  const [t] = await h.db
    .insert(tournaments)
    .values({
      name: 'Test Cup',
      registrationDeadline: new Date('2026-05-01'),
      startsAt: new Date('2026-05-02'),
      endsAt: new Date('2026-05-10'),
      status: 'OPEN',
      createdBy,
    })
    .returning();
  return t;
}

describe('notification triggers', () => {
  let h: TestDbHandle;
  beforeEach(async () => {
    h = await createTestDb();
  });
  afterEach(async () => {
    await h.close();
  });

  it('notifyRosterReviewed creates roster_approved notification', async () => {
    const userId = await seedUser(h, '1', 'alice');
    const [app] = await h.db
      .insert(rosterApplications)
      .values({
        userId,
        epicUsername: 'a',
        platform: 'PC',
        timezone: 'UTC',
        whyText: 'x',
        status: 'APPROVED',
      })
      .returning();

    await notifyRosterReviewed(h.db, app);
    const notes = await listNotificationsForUser(h.db, userId);
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe('roster_approved');
  });

  it('notifyRosterReviewed creates roster_rejected with note', async () => {
    const userId = await seedUser(h, '1', 'alice');
    const [app] = await h.db
      .insert(rosterApplications)
      .values({
        userId,
        epicUsername: 'a',
        platform: 'PC',
        timezone: 'UTC',
        whyText: 'x',
        status: 'REJECTED',
        reviewNote: 'try harder',
      })
      .returning();

    await notifyRosterReviewed(h.db, app);
    const notes = await listNotificationsForUser(h.db, userId);
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe('roster_rejected');
    expect(notes[0].message).toContain('try harder');
  });

  it('notifySubmissionReviewed VERIFIED notifies captain with computed points', async () => {
    const captainId = await seedUser(h, '1', 'cap');
    const t = await seedTournament(h, captainId);
    const [team] = await h.db
      .insert(teams)
      .values({
        tournamentId: t.id,
        captainId,
        name: 'Cool Team',
      })
      .returning();
    const [sub] = await h.db
      .insert(submissions)
      .values({
        teamId: team.id,
        tournamentId: t.id,
        matchId: 'm-1',
        eliminations: 5,
        placement: 1, // bonus 10 → total 15
        screenshotUrl: 'https://x/y',
        status: 'VERIFIED',
      })
      .returning();

    await notifySubmissionReviewed(h.db, sub);
    const notes = await listNotificationsForUser(h.db, captainId);
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe('submission_verified');
    expect(notes[0].message).toContain('15');
    expect(notes[0].message).toContain('m-1');
  });

  it('notifySubmissionReviewed REJECTED notifies captain with reviewNote', async () => {
    const captainId = await seedUser(h, '1', 'cap');
    const t = await seedTournament(h, captainId);
    const [team] = await h.db
      .insert(teams)
      .values({ tournamentId: t.id, captainId, name: 'A' })
      .returning();
    const [sub] = await h.db
      .insert(submissions)
      .values({
        teamId: team.id,
        tournamentId: t.id,
        matchId: 'm-2',
        eliminations: 3,
        placement: 5,
        screenshotUrl: 'https://x/y',
        status: 'REJECTED',
        reviewNote: 'blurry',
      })
      .returning();

    await notifySubmissionReviewed(h.db, sub);
    const notes = await listNotificationsForUser(h.db, captainId);
    expect(notes[0].type).toBe('submission_rejected');
    expect(notes[0].message).toContain('blurry');
  });

  it('notifyPartnerJoined notifies captain with partner username', async () => {
    const captainId = await seedUser(h, '1', 'cap');
    const partnerId = await seedUser(h, '2', 'partnerbob');
    const t = await seedTournament(h, captainId);
    const [team] = await h.db
      .insert(teams)
      .values({
        tournamentId: t.id,
        captainId,
        partnerId,
        name: 'Cool Team',
      })
      .returning();

    await notifyPartnerJoined(h.db, team);
    const notes = await listNotificationsForUser(h.db, captainId);
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe('partner_joined');
    expect(notes[0].message).toContain('partnerbob');
    expect(notes[0].message).toContain('Cool Team');
    // Partner does NOT receive a notification
    const partnerNotes = await listNotificationsForUser(h.db, partnerId);
    expect(partnerNotes).toHaveLength(0);
  });

  it('notifyPartnerJoined no-ops when team has no partner', async () => {
    const captainId = await seedUser(h, '1', 'cap');
    const t = await seedTournament(h, captainId);
    const [team] = await h.db
      .insert(teams)
      .values({ tournamentId: t.id, captainId, name: 'A' })
      .returning();
    await notifyPartnerJoined(h.db, team);
    const notes = await listNotificationsForUser(h.db, captainId);
    expect(notes).toHaveLength(0);
  });
});
