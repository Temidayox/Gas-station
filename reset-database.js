const { PrismaClient } = require('@prisma/client')
const { generateMultipleCylinderCodes } = require('./lib/cylinderGenerator.js')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetAndReseed() {
  console.log('🔄 Resetting and reseeding database...')
  
  try {
    // Step 1: Delete all existing cylinders
    await prisma.cylinder.deleteMany()
    console.log('🗑️ Deleted all existing cylinders')
    
    // Step 2: Generate 100 new random cylinder codes
    const cylinderCodes = generateMultipleCylinderCodes(100)
    console.log('🎲 Generated 100 new random codes:', cylinderCodes.slice(0, 10))
    
    // Step 3: Create cylinders with proper sizes
    const cylinders = cylinderCodes.map((code, index) => ({
      id: code,
      size: [6, 12.5, 25, 37.5, 50][index % 5], // Rotate through all sizes
      isLinked: false,
      ownerId: null
    }))
    
    await prisma.cylinder.createMany({ data: cylinders })
    console.log('✅ Created 100 new cylinders with proper sizes')
    
    // Step 4: Link first 4 cylinders to demo users
    const demoUsers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      take: 4
    })
    
    if (demoUsers.length >= 4) {
      for (let i = 0; i < 4; i++) {
        await prisma.cylinder.update({
          where: { id: cylinderCodes[i] },
          data: { 
            ownerId: demoUsers[i].id,
            isLinked: true,
            size: [12.5, 25, 12.5, 6][i] // Different sizes for demo users
          }
        })
      }
      console.log('✅ Linked first 4 cylinders to demo users')
    }
    
    // Step 5: Create some sample transactions
    const linkedCylinders = await prisma.cylinder.findMany({
      where: { isLinked: true },
      take: 4
    })
    
    if (linkedCylinders.length > 0) {
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
      
      for (let i = 0; i < 20; i++) {
        const cylinder = linkedCylinders[Math.floor(Math.random() * linkedCylinders.length)]
        const naira = [1000, 2000, 3000, 5000][Math.floor(Math.random() * 4)]
        const d = new Date()
        d.setDate(d.getDate() - Math.floor(Math.random() * 30))
        
        await prisma.transaction.create({
          data: {
            outletId: 1,
            naira,
            kg: parseFloat((naira / 1150).toFixed(3)),
            cylinderSize: cylinder.size,
            paymentMethod: 'CASH',
            cylinderId: cylinder.id,
            staffId: admin.id,
            isAnonymous: false,
            createdAt: d
          }
        })
      }
      console.log('✅ Created sample transactions')
    }
    
    console.log('🎉 Database reset and reseed completed successfully!')
    console.log(`📊 Total cylinders: ${cylinderCodes.length}`)
    console.log(`📊 Sample cylinder codes: ${cylinderCodes.slice(0, 10).join(', ')}`)
    
  } catch (error) {
    console.error('❌ Error during reset:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetAndReseed()
