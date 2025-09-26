import * as dotenv from 'dotenv'
import { createClient } from '@libsql/client'

// Load environment variables
dotenv.config({ path: '.env.local' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function createTables() {
  try {
    console.log('Creating tables...')
    
    // Create users table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        position TEXT NOT NULL,
        phone TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
        price_level TEXT NOT NULL DEFAULT 'ราคาปกติ' CHECK (price_level IN ('ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ')),
        credit_limit REAL NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create products table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('สินค้าหลัก', 'สินค้าทางเลือก')),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create product_prices table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS product_prices (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        level TEXT NOT NULL CHECK (level IN ('ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ')),
        value REAL NOT NULL
      )
    `)
    
    // Create sales table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL REFERENCES users(id),
        employee_name TEXT NOT NULL,
        sale_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        type TEXT NOT NULL CHECK (type IN ('เบิก', 'คืน')),
        total_amount REAL NOT NULL DEFAULT 0,
        notes TEXT,
        paid_amount REAL NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'customer_pending')),
        pending_amount REAL NOT NULL DEFAULT 0,
        cash_amount REAL NOT NULL DEFAULT 0,
        transfer_amount REAL NOT NULL DEFAULT 0,
        customer_pending REAL NOT NULL DEFAULT 0,
        expense_amount REAL NOT NULL DEFAULT 0,
        awaiting_transfer REAL NOT NULL DEFAULT 0,
        settled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create sale_items table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        product_name TEXT NOT NULL,
        price_per_unit REAL NOT NULL,
        withdrawal INTEGER NOT NULL DEFAULT 0,
        return_qty INTEGER NOT NULL DEFAULT 0,
        defective INTEGER NOT NULL DEFAULT 0,
        total_price REAL NOT NULL
      )
    `)
    
    // Create requisitions table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS requisitions (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cleared')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create requisition_items table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS requisition_items (
        id TEXT PRIMARY KEY,
        requisition_id TEXT NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL
      )
    `)
    
    console.log('Tables created successfully!')
    
  } catch (error) {
    console.error('Error creating tables:', error)
  } finally {
    process.exit(0)
  }
}

createTables()