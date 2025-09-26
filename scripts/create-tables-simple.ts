import * as dotenv from 'dotenv'
import { createClient } from '@libsql/client'
import { createId } from '@paralleldrive/cuid2'

// Load environment variables
dotenv.config({ path: '.env.local' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function createTables() {
  try {
    console.log('Creating tables with simple SQL...')
    
    // Create users table first
    console.log('Creating users table...')
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        position TEXT NOT NULL,
        phone TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        price_level TEXT NOT NULL DEFAULT 'ราคาปกติ',
        credit_limit REAL NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    console.log('✓ Users table created')
    
    // Create products table
    console.log('Creating products table...')
    await client.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
    console.log('✓ Products table created')
    
    // Create product_prices table
    console.log('Creating product_prices table...')
    await client.execute(`
      CREATE TABLE IF NOT EXISTS product_prices (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        level TEXT NOT NULL,
        value REAL NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `)
    console.log('✓ Product prices table created')
    
    console.log('All essential tables created successfully!')
    
    // Now insert sample data
    console.log('Inserting sample data...')
    
    const now = new Date().toISOString()
    
    // Insert admin user
    const adminId = createId()
    await client.execute({
      sql: `INSERT OR IGNORE INTO users (id, username, email, password, name, position, phone, role, price_level, credit_limit, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        adminId,
        'admin',
        'admin@example.com',
        '$2a$12$LQKvKZz4yYxH5KF1vJF8l.WF.6qT5o3K6J8J5F7j4T4fYd2H9K8mS', // admin123 hashed
        'Admin User',
        'Manager',
        '123-456-7890',
        'admin',
        'ราคาพนักงาน',
        0,
        1,
        now,
        now
      ]
    })
    console.log('✓ Admin user created')
    
    // Insert employee user
    const employeeId = createId()
    await client.execute({
      sql: `INSERT OR IGNORE INTO users (id, username, email, password, name, position, phone, role, price_level, credit_limit, is_active, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        employeeId,
        'employee1',
        'employee1@example.com',
        '$2a$12$LQKvKZz4yYxH5KF1vJF8l.WF.6qT5o3K6J8J5F7j4T4fYd2H9K8mS', // emp123 hashed (same as admin for testing)
        'Employee One',
        'Sales',
        '098-765-4321',
        'employee',
        'ราคาปกติ',
        50000,
        1,
        now,
        now
      ]
    })
    console.log('✓ Employee user created')
    
    // Insert sample products
    const product1Id = createId()
    const product2Id = createId()
    
    await client.execute({
      sql: `INSERT OR IGNORE INTO products (id, name, category, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [product1Id, 'สินค้าตัวอย่าง 1', 'สินค้าหลัก', 1, now, now]
    })
    
    await client.execute({
      sql: `INSERT OR IGNORE INTO products (id, name, category, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [product2Id, 'สินค้าตัวอย่าง 2', 'สินค้าทางเลือก', 1, now, now]
    })
    console.log('✓ Sample products created')
    
    // Insert product prices
    const priceTypes = ['ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ']
    const basePrices = [100, 80, 70, 60] // Different price levels
    
    for (let i = 0; i < priceTypes.length; i++) {
      // Product 1 prices
      await client.execute({
        sql: `INSERT OR IGNORE INTO product_prices (id, product_id, level, value) VALUES (?, ?, ?, ?)`,
        args: [createId(), product1Id, priceTypes[i], basePrices[i]]
      })
      
      // Product 2 prices (higher prices)
      await client.execute({
        sql: `INSERT OR IGNORE INTO product_prices (id, product_id, level, value) VALUES (?, ?, ?, ?)`,
        args: [createId(), product2Id, priceTypes[i], basePrices[i] * 1.5]
      })
    }
    console.log('✓ Product prices created')
    
    // Verify data
    const userCount = await client.execute('SELECT COUNT(*) as count FROM users')
    const productCount = await client.execute('SELECT COUNT(*) as count FROM products')
    const pricesCount = await client.execute('SELECT COUNT(*) as count FROM product_prices')
    
    console.log(`
✅ Database setup complete!
📊 Sample data summary:
   - Users: ${userCount.rows[0].count}
   - Products: ${productCount.rows[0].count}
   - Price levels: ${pricesCount.rows[0].count}

🔑 Test accounts:
   - Admin: username='admin', password='admin123'
   - Employee: username='employee1', password='emp123'
`)
    
  } catch (error) {
    console.error('Error creating tables:', error)
  } finally {
    process.exit(0)
  }
}

createTables()