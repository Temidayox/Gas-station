-- Add smokeBalance field to User table
ALTER TABLE "User" ADD COLUMN "smokeBalance" INTEGER NOT NULL DEFAULT 0;
