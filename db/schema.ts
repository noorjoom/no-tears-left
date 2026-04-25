import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['MEMBER', 'MOD', 'ADMIN']);
export const platformEnum = pgEnum('platform', ['PC', 'CONSOLE']);
export const applicationStatusEnum = pgEnum('application_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);
export const tournamentStatusEnum = pgEnum('tournament_status', [
  'DRAFT',
  'OPEN',
  'IN_PROGRESS',
  'CLOSED',
  'ARCHIVED',
]);
export const submissionStatusEnum = pgEnum('submission_status', [
  'PENDING',
  'VERIFIED',
  'REJECTED',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  discordId: text('discord_id').notNull().unique(),
  discordUsername: text('discord_username').notNull(),
  discordAvatar: text('discord_avatar'),
  role: roleEnum('role').notNull().default('MEMBER'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rosterApplications = pgTable('roster_applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  epicUsername: text('epic_username').notNull(),
  platform: platformEnum('platform').notNull(),
  timezone: text('timezone').notNull(),
  whyText: text('why_text').notNull(),
  vodUrl: text('vod_url'),
  status: applicationStatusEnum('status').notNull().default('PENDING'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewNote: text('review_note'),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tournaments = pgTable('tournaments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  registrationDeadline: timestamp('registration_deadline').notNull(),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  maxTeams: integer('max_teams'),
  status: tournamentStatusEnum('status').notNull().default('DRAFT'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id')
    .notNull()
    .references(() => tournaments.id),
  captainId: uuid('captain_id')
    .notNull()
    .references(() => users.id),
  partnerId: uuid('partner_id').references(() => users.id),
  name: text('name').notNull(),
  inviteToken: text('invite_token').unique(),
  inviteExpiresAt: timestamp('invite_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id),
    matchId: text('match_id').notNull(),
    eliminations: integer('eliminations').notNull(),
    placement: integer('placement').notNull(),
    screenshotUrl: text('screenshot_url').notNull(),
    status: submissionStatusEnum('status').notNull().default('PENDING'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewNote: text('review_note'),
    reviewedAt: timestamp('reviewed_at'),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  },
  (t) => ({
    uniqueMatchTeam: uniqueIndex('unique_match_team').on(t.matchId, t.teamId),
  }),
);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  type: text('type').notNull(),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const prizePoolConfig = pgTable('prize_pool_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  goalAmount: integer('goal_amount').notNull().default(0),
  currentAmount: integer('current_amount').notNull().default(0),
  koFiUrl: text('ko_fi_url'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RosterApplication = typeof rosterApplications.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type PrizePoolConfig = typeof prizePoolConfig.$inferSelect;
