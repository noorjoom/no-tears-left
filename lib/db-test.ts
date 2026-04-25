import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from '@/db/schema';

export type TestDb = PgliteDatabase<typeof schema>;

export interface TestDbHandle {
  db: TestDb;
  client: PGlite;
  close: () => Promise<void>;
}

const SCHEMA_SQL = `
CREATE TYPE "role" AS ENUM('MEMBER', 'MOD', 'ADMIN');
CREATE TYPE "platform" AS ENUM('PC', 'CONSOLE');
CREATE TYPE "application_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "tournament_status" AS ENUM('DRAFT', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'ARCHIVED');
CREATE TYPE "submission_status" AS ENUM('PENDING', 'VERIFIED', 'REJECTED');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "discord_id" text NOT NULL UNIQUE,
  "discord_username" text NOT NULL,
  "discord_avatar" text,
  "role" "role" DEFAULT 'MEMBER' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "roster_applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "epic_username" text NOT NULL,
  "platform" "platform" NOT NULL,
  "timezone" text NOT NULL,
  "why_text" text NOT NULL,
  "vod_url" text,
  "status" "application_status" DEFAULT 'PENDING' NOT NULL,
  "reviewed_by" uuid REFERENCES "users"("id"),
  "review_note" text,
  "reviewed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "tournaments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "registration_deadline" timestamp NOT NULL,
  "starts_at" timestamp NOT NULL,
  "ends_at" timestamp NOT NULL,
  "max_teams" integer,
  "status" "tournament_status" DEFAULT 'DRAFT' NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id"),
  "captain_id" uuid NOT NULL REFERENCES "users"("id"),
  "partner_id" uuid REFERENCES "users"("id"),
  "name" text NOT NULL,
  "invite_token" text UNIQUE,
  "invite_expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "teams"("id"),
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id"),
  "match_id" text NOT NULL,
  "eliminations" integer NOT NULL,
  "placement" integer NOT NULL,
  "screenshot_url" text NOT NULL,
  "status" "submission_status" DEFAULT 'PENDING' NOT NULL,
  "reviewed_by" uuid REFERENCES "users"("id"),
  "review_note" text,
  "reviewed_at" timestamp,
  "submitted_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "unique_match_team" ON "submissions" ("match_id", "team_id");

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "type" text NOT NULL,
  "message" text NOT NULL,
  "read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "prize_pool_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "goal_amount" integer DEFAULT 0 NOT NULL,
  "current_amount" integer DEFAULT 0 NOT NULL,
  "ko_fi_url" text,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id")
);
`;

export async function createTestDb(): Promise<TestDbHandle> {
  const client = new PGlite();
  await client.exec(SCHEMA_SQL);
  const db = drizzle(client, { schema });
  return {
    db,
    client,
    close: async () => {
      await client.close();
    },
  };
}
