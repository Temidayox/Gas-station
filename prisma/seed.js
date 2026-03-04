const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding...')
  const hash = (pw) => bcrypt.hashSync(pw, 10)

  // Outlets — with tank data
  for (const o of [
    { id: 1, name: 'Lagos Island',  location: 'Lagos Island, Lagos',  dailyTarget: 500000, tankCapacityKg: 2000, tankCurrentKg: 1240 },
    { id: 2, name: 'Surulere',      location: 'Surulere, Lagos',      dailyTarget: 400000, tankCapacityKg: 1500, tankCurrentKg: 320  },
    { id: 3, name: 'Ikeja',         location: 'Ikeja, Lagos',         dailyTarget: 450000, tankCapacityKg: 2000, tankCurrentKg: 890  },
    { id: 4, name: 'Lekki Phase 1', location: 'Lekki Phase 1, Lagos', dailyTarget: 600000, tankCapacityKg: 3000, tankCurrentKg: 2700 },
  ]) {
    await prisma.outlet.upsert({ where: { id: o.id }, update: {}, create: o })
  }

  // Users
  const admin = await prisma.user.upsert({ where: { email: 'admin@gasstation.ng' }, update: {}, create: { email: 'admin@gasstation.ng', name: 'Admin User', password: hash('Admin@2026'), role: 'ADMIN' } })
  await prisma.user.upsert({ where: { email: 'outlet1@gasstation.ng' }, update: {}, create: { email: 'outlet1@gasstation.ng', name: 'Emeka Obi',      password: hash('Outlet1@26'), role: 'OUTLET_STAFF', outletId: 1 } })
  await prisma.user.upsert({ where: { email: 'outlet2@gasstation.ng' }, update: {}, create: { email: 'outlet2@gasstation.ng', name: 'Fatima Bello',   password: hash('Outlet2@26'), role: 'OUTLET_STAFF', outletId: 2 } })
  await prisma.user.upsert({ where: { email: 'outlet3@gasstation.ng' }, update: {}, create: { email: 'outlet3@gasstation.ng', name: 'Chidi Eze',      password: hash('Outlet3@26'), role: 'OUTLET_STAFF', outletId: 3 } })
  await prisma.user.upsert({ where: { email: 'outlet4@gasstation.ng' }, update: {}, create: { email: 'outlet4@gasstation.ng', name: 'Aisha Suleiman', password: hash('Outlet4@26'), role: 'OUTLET_STAFF', outletId: 4 } })
  const custA = await prisma.user.upsert({ where: { email: 'demo.a@gasstation.ng' }, update: {}, create: { email: 'demo.a@gasstation.ng', name: 'Adaeze Okonkwo',  phone: '08012345001', password: hash('Demo@001'), role: 'CUSTOMER' } })
  const custB = await prisma.user.upsert({ where: { email: 'demo.b@gasstation.ng' }, update: {}, create: { email: 'demo.b@gasstation.ng', name: 'Babatunde Lawal', phone: '08012345002', password: hash('Demo@002'), role: 'CUSTOMER' } })
  const custC = await prisma.user.upsert({ where: { email: 'demo.c@gasstation.ng' }, update: {}, create: { email: 'demo.c@gasstation.ng', name: 'Chioma Eze',      phone: '08012345003', password: hash('Demo@003'), role: 'CUSTOMER' } })

  // Cylinders
  for (const cyl of [
    { id: 'GS00001', size: 12.5, ownerId: custA.id, isLinked: true },
    { id: 'GS00002', size: 5,    ownerId: custB.id, isLinked: true },
    { id: 'GS00003', size: 12.5, ownerId: custC.id, isLinked: true },
    { id: 'GS00004', size: 25,   ownerId: custC.id, isLinked: true },
    // GS00005–GS00020: unlinked stickers available to hand out
    ...Array.from({ length: 16 }, (_, i) => ({ id: `GS${String(i+5).padStart(5,'0')}`, size: 0, isLinked: false })),
    // GS00021+: additional stock
    ...Array.from({ length: 30 }, (_, i) => ({ id: `GS${String(i+21).padStart(5,'0')}`, size: 0, isLinked: false })),
  ]) {
    await prisma.cylinder.upsert({ where: { id: cyl.id }, update: {}, create: cyl })
  }

  // Price
  const rate = await prisma.priceRate.findFirst()
  if (!rate) await prisma.priceRate.create({ data: { pricePerKg: 1150, setBy: admin.id } })

  // Transactions
  if ((await prisma.transaction.count()) === 0) {
    const cylIds   = ['GS00001','GS00002','GS00003','GS00004',null,null,null]
    const payments = ['CASH','CASH','TRANSFER','POS_TERMINAL']
    const sizes    = [3,5,10,12.5,25]
    for (let day = 29; day >= 0; day--) {
      for (let outlet = 1; outlet <= 4; outlet++) {
        const n = 8 + Math.floor(Math.random() * 12)
        for (let t = 0; t < n; t++) {
          const naira = [1000,2000,3000,5000,6000,10000,12000,15000][Math.floor(Math.random()*8)]
          const d = new Date(); d.setDate(d.getDate()-day); d.setHours(7+Math.floor(Math.random()*13), Math.floor(Math.random()*60), 0, 0)
          const cid = cylIds[Math.floor(Math.random()*cylIds.length)]
          await prisma.transaction.create({ data: { outletId: outlet, naira, kg: parseFloat((naira/1150).toFixed(3)), cylinderSize: sizes[Math.floor(Math.random()*sizes.length)], paymentMethod: payments[Math.floor(Math.random()*payments.length)], cylinderId: cid, staffId: admin.id, isAnonymous: !cid, createdAt: d } })
        }
      }
    }
  }
  console.log('Done.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
