import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

import db from '../lib/database'
import { UserModel } from '../lib/models/User'
import { hashPassword } from '../lib/auth'

async function seedDatabase() {
  try {
    console.log('Connected to Turso database')

    console.log('Creating admin user...')
    const adminPassword = await hashPassword('admin123')
    try {
      await UserModel.create({
        username: 'admin',
        email: 'admin@example.com',
        password: adminPassword,
        name: 'Admin User',
        position: 'Manager',
        phone: '123-456-7890',
        role: 'admin',
        priceLevel: 'ราคาพนักงาน',
        isActive: true,
      })
      console.log('Admin user created successfully!')
    } catch (error) {
      console.log('Admin user might already exist, skipping...')
    }

    console.log('Creating employee user...')
    const employeePassword = await hashPassword('emp123')
    try {
      await UserModel.create({
        username: 'employee1',
        email: 'employee1@example.com',
        password: employeePassword,
        name: 'Employee One',
        position: 'Sales',
        phone: '098-765-4321',
        role: 'employee',
        priceLevel: 'ราคาปกติ',
        isActive: true,
      })
      console.log('Employee user created successfully!')
    } catch (error) {
      console.log('Employee user might already exist, skipping...')
    }

    console.log('Database seeded successfully!')
  } catch (error) {
    console.error('Error seeding database:', error)
  } finally {
    process.exit(0)
  }
}

seedDatabase()
