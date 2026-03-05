process.env.DATABASE_URL = 'postgresql://postgres.fsastsbfpruynhsnmvul:Temidayo2014@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
p.user.findMany({
  where: { role: 'CUSTOMER' },
  select: { id: true, name: true, smokeBalance: true }
}).then(u => {
  console.log(JSON.stringify(u, null, 2))
  process.exit()
})
