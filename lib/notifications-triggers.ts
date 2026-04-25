import { eq } from 'drizzle-orm';
import { teams, tournaments, users } from '@/db/schema';
import type { RosterApplication, Submission, Team } from '@/db/schema';
import type { RosterDb } from './roster-service';
import { calcMatchScore } from './scoring';
import {
  buildPartnerJoinedMessage,
  buildRosterApprovedMessage,
  buildRosterRejectedMessage,
  buildSubmissionRejectedMessage,
  buildSubmissionVerifiedMessage,
  createNotification,
} from './notifications-service';

/**
 * Triggers run AFTER the parent mutation has succeeded.
 * Failures must NOT bubble up to the caller — log and swallow.
 */

export async function notifyRosterReviewed(
  db: RosterDb,
  app: RosterApplication,
): Promise<void> {
  try {
    if (app.status === 'APPROVED') {
      await createNotification(db, {
        userId: app.userId,
        type: 'roster_approved',
        message: buildRosterApprovedMessage(),
      });
    } else if (app.status === 'REJECTED') {
      await createNotification(db, {
        userId: app.userId,
        type: 'roster_rejected',
        message: buildRosterRejectedMessage(app.reviewNote),
      });
    }
  } catch (err) {
    console.error('notifyRosterReviewed failed', err);
  }
}

export async function notifySubmissionReviewed(
  db: RosterDb,
  submission: Submission,
): Promise<void> {
  try {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, submission.teamId))
      .limit(1);
    if (!team) return;

    const [tourney] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, submission.tournamentId))
      .limit(1);
    if (!tourney) return;

    if (submission.status === 'VERIFIED') {
      const points = calcMatchScore(
        submission.eliminations,
        submission.placement,
      );
      await createNotification(db, {
        userId: team.captainId,
        type: 'submission_verified',
        message: buildSubmissionVerifiedMessage({
          tournamentName: tourney.name,
          matchId: submission.matchId,
          points,
        }),
      });
    } else if (submission.status === 'REJECTED') {
      await createNotification(db, {
        userId: team.captainId,
        type: 'submission_rejected',
        message: buildSubmissionRejectedMessage({
          tournamentName: tourney.name,
          matchId: submission.matchId,
          reviewNote: submission.reviewNote,
        }),
      });
    }
  } catch (err) {
    console.error('notifySubmissionReviewed failed', err);
  }
}

export async function notifyPartnerJoined(
  db: RosterDb,
  team: Team,
): Promise<void> {
  try {
    if (!team.partnerId) return;

    const [partner] = await db
      .select()
      .from(users)
      .where(eq(users.id, team.partnerId))
      .limit(1);
    if (!partner) return;

    const [tourney] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, team.tournamentId))
      .limit(1);
    if (!tourney) return;

    await createNotification(db, {
      userId: team.captainId,
      type: 'partner_joined',
      message: buildPartnerJoinedMessage({
        teamName: team.name,
        partnerDiscordUsername: partner.discordUsername,
        tournamentName: tourney.name,
      }),
    });
  } catch (err) {
    console.error('notifyPartnerJoined failed', err);
  }
}
