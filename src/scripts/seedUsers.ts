import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { User } from '../models/User.model'
import { connectDB } from '../utils/database'

dotenv.config()

const dummyUsers = [
  {
    email: 'admin@localvan.com',
    password: 'admin123',
    name: 'James Smith',
    role: 'admin' as const,
    phone: '+44 7700 900123',
  },
  {
    email: 'customer@localvan.com',
    password: 'customer123',
    name: 'Emma Johnson',
    role: 'customer' as const,
    phone: '+44 7700 900456',
  },
  {
    email: 'driver@localvan.com',
    password: 'driver123',
    name: 'Oliver Williams',
    role: 'driver' as const,
    phone: '+44 7700 900789',
  },
]

const seedUsers = async () => {
  try {
    console.log('🌱 Starting user seeding...')
    
    // Connect to database
    await connectDB()
    
    // Clear existing users (optional - comment out if you want to keep existing users)
    // await User.deleteMany({})
    // console.log('🗑️  Cleared existing users')
    
    // Create users
    for (const userData of dummyUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email })
      
      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...`)
        continue
      }
      
      // Create new user (password will be hashed automatically by the model)
      const user = await User.create(userData)
      console.log(`✅ Created ${userData.role}: ${user.email}`)
    }
    
    console.log('✨ User seeding completed!')
    console.log('\n📋 Login Credentials:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👤 ADMIN:')
    console.log('   Email: admin@localvan.com')
    console.log('   Password: admin123')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👤 CUSTOMER:')
    console.log('   Email: customer@localvan.com')
    console.log('   Password: customer123')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👤 DRIVER:')
    console.log('   Email: driver@localvan.com')
    console.log('   Password: driver123')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding users:', error)
    process.exit(1)
  }
}

// Run the seed function
seedUsers()

