-- Migration to add Smoke balance fields to User table
-- Run this in your database admin panel or via Prisma

-- Add smokeBalance field
ALTER TABLE "User" ADD COLUMN "smokeBalance" INTEGER NOT NULL DEFAULT 0;

-- Add useSmokeBalance field  
ALTER TABLE "User" ADD COLUMN "useSmokeBalance" BOOLEAN NOT NULL DEFAULT false;

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'User' 
AND column_name IN ('smokeBalance', 'useSmokeBalance');
