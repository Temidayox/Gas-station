-- Add smokeBalance and useSmokeBalance fields to User table
ALTER TABLE "User" ADD COLUMN "smokeBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "useSmokeBalance" BOOLEAN NOT NULL DEFAULT false;
