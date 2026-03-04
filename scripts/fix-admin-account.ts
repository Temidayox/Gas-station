// Script to fix admin account role
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixAdminAccount() {
  const adminEmail = 'dtemidayo825@gmail.com'
  
  try {
    // Find existing user
    const user = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase() }
    })
    
    if (!user) {
      console.log('❌ Admin account not found')
      return
    }
    
    console.log('🔍 Current admin account:', { id: user.id, email: user.email, role: user.role })
    
    // Update role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' }
    })
    
    console.log('✅ Admin account updated:', { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role })
    
  } catch (error) {
    console.error('❌ Error fixing admin account:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAdminAccount()
