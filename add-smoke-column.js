process.env.DATABASE_URL = 'postgresql://postgres.fsastsbfpruynhsnmvul:Temidayo2014@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
p.$executeRawUnsafe('ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "smokeUsed" INTEGER NOT NULL DEFAULT 0')
  .then(() => { console.log('✅ smokeUsed column added'); process.exit() })
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
