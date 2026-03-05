const { PrismaClient } = require('@prisma/client');
const { generateMultipleCylinderCodes } = require('./lib/cylinderGenerator.js');

const prisma = new PrismaClient();

async function seedNewCylinders() {
  try {
    console.log('🔄 Seeding new random cylinder codes...');
    
    // Delete all existing cylinders
    await prisma.cylinder.deleteMany();
    console.log('🗑️  Deleted all existing cylinders');
    
    // Generate 100 new random cylinder codes
    const cylinderCodes = generateMultipleCylinderCodes(100);
    console.log('🎲 Generated 100 new random cylinder codes');
    
    // Create new cylinders with random codes
    const cylinders = cylinderCodes.map((code, index) => ({
      id: code,
      size: [6, 12.5, 25, 37.5, 50][index % 5], // Rotate through sizes
      isLinked: false,
      ownerId: null
    }));
    
    // Insert all new cylinders
    await prisma.cylinder.createMany({
      data: cylinders
    });
    
    console.log('✅ Successfully created 100 new cylinders with random codes');
    console.log('📊 Sample cylinder codes:', cylinderCodes.slice(0, 10));
    
  } catch (error) {
    console.error('❌ Error seeding cylinders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedNewCylinders();
