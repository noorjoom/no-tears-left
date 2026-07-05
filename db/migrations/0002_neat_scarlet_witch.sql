ALTER TABLE "submissions" ALTER COLUMN "screenshot_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'VERIFIED';--> statement-breakpoint
ALTER TABLE "public"."submissions" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."submission_status";--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('VERIFIED');--> statement-breakpoint
ALTER TABLE "public"."submissions" ALTER COLUMN "status" SET DATA TYPE "public"."submission_status" USING "status"::"public"."submission_status";