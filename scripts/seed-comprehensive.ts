import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

import { UserModel } from '../lib/models/User'
import { ProductModel } from '../lib/models/Product'
import { hashPassword } from '../lib/auth'
import { createId } from '@paralleldrive/cuid2'

async function seedComprehensive() {
  try {
    console.log('🌱 Starting comprehensive database seeding...')

    // Create admin user
    console.log('👤 Creating admin user...')
    const adminPassword = await hashPassword('admin123')
    try {
      await UserModel.create({
        username: 'admin',
        email: 'admin@example.com',
        password: adminPassword,
        name: 'ผู้ดูแลระบบ',
        position: 'ผู้จัดการ',
        phone: '123-456-7890',
        role: 'admin',
        priceLevel: 'ราคาพนักงาน',
        creditLimit: 100000,
        isActive: true,
      })
      console.log('✅ Admin user created!')
    } catch (error) {
      console.log('ℹ️ Admin user already exists')
    }

    // Create employee user
    console.log('👤 Creating employee user...')
    const employeePassword = await hashPassword('emp123')
    try {
      await UserModel.create({
        username: 'employee1',
        email: 'employee1@example.com',
        password: employeePassword,
        name: 'พนักงานขาย',
        position: 'พนักงาน',
        phone: '098-765-4321',
        role: 'employee',
        priceLevel: 'ราคาปกติ',
        creditLimit: 5000,
        isActive: true,
      })
      console.log('✅ Employee user created!')
    } catch (error) {
      console.log('ℹ️ Employee user already exists')
    }

    // Create sample products
    console.log('📦 Creating sample products...')
    
    const sampleProducts = [
      {
        name: 'สินค้า A1',
        category: 'สินค้าหลัก' as const,
        prices: [
          { level: 'ราคาปกติ' as const, value: 100 },
          { level: 'ราคาตัวแทน' as const, value: 90 },
          { level: 'ราคาพนักงาน' as const, value: 80 },
          { level: 'ราคาพิเศษ' as const, value: 75 }
        ]
      },
      {
        name: 'สินค้า A2',
        category: 'สินค้าหลัก' as const,
        prices: [
          { level: 'ราคาปกติ' as const, value: 150 },
          { level: 'ราคาตัวแทน' as const, value: 135 },
          { level: 'ราคาพนักงาน' as const, value: 120 },
          { level: 'ราคาพิเศษ' as const, value: 110 }
        ]
      },
      {
        name: 'สินค้า B1',
        category: 'สินค้าทางเลือก' as const,
        prices: [
          { level: 'ราคาปกติ' as const, value: 200 },
          { level: 'ราคาตัวแทน' as const, value: 180 },
          { level: 'ราคาพนักงาน' as const, value: 160 },
          { level: 'ราคาพิเศษ' as const, value: 150 }
        ]
      },
      {
        name: 'สินค้า B2',
        category: 'สินค้าทางเลือก' as const,
        prices: [
          { level: 'ราคาปกติ' as const, value: 250 },
          { level: 'ราคาตัวแทน' as const, value: 225 },
          { level: 'ราคาพนักงาน' as const, value: 200 },
          { level: 'ราคาพิเศษ' as const, value: 190 }
        ]
      },
      {
        name: 'สินค้า C1',
        category: 'สินค้าหลัก' as const,
        prices: [
          { level: 'ราคาปกติ' as const, value: 300 },
          { level: 'ราคาตัวแทน' as const, value: 270 },
          { level: 'ราคาพนักงาน' as const, value: 240 },
          { level: 'ราคาพิเศษ' as const, value: 220 }
        ]
      }
    ]

    for (const productData of sampleProducts) {
      try {
        const product = await ProductModel.create(productData)
        console.log(`✅ Product "${productData.name}" created!`)
      } catch (error) {
        console.log(`ℹ️ Product "${productData.name}" might already exist`)
      }
    }

    // Check final results
    console.log('📊 Database summary:')
    const users = await UserModel.find({})
    const products = await ProductModel.find({})
    
    console.log(`👥 Users: ${users.length}`)
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.role}) - ${user.username}`)
    })
    
    console.log(`📦 Products: ${products.length}`)
    products.forEach(product => {
      console.log(`  - ${product.name} (${product.category}) - ${product.prices.length} price levels`)
    })

    console.log('✅ Comprehensive seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error during seeding:', error)
  } finally {
    process.exit(0)
  }
}

seedComprehensive()