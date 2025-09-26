import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'

async function runMigration() {
  console.log('🚀 Starting Turso database migration...')
  
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    })
    
    const db = drizzle(client)
    
    console.log('✅ Connected to Turso database')
    console.log('📍 Database URL:', process.env.TURSO_DATABASE_URL)
    
    // Create all tables manually since Drizzle migrate might not work with Turso yet
    await createTables(client)
    
    console.log('✅ Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

async function createTables(client: any) {
  console.log('📝 Creating tables...')
  
  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
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
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Products table
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('สินค้าหลัก', 'สินค้าทางเลือก')),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Product prices table
    `CREATE TABLE IF NOT EXISTS product_prices (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      level TEXT NOT NULL CHECK (level IN ('ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ')),
      value REAL NOT NULL
    )`,
    
    // Sales table
    `CREATE TABLE IF NOT EXISTS sales (
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
      settled INTEGER NOT NULL DEFAULT 0 CHECK (settled IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Sale items table
    `CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      price_per_unit REAL NOT NULL,
      withdrawal INTEGER NOT NULL DEFAULT 0,
      return INTEGER NOT NULL DEFAULT 0,
      defective INTEGER NOT NULL DEFAULT 0,
      total_price REAL NOT NULL
    )`,
    
    // Requisitions table
    `CREATE TABLE IF NOT EXISTS requisitions (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cleared')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Requisition items table
    `CREATE TABLE IF NOT EXISTS requisition_items (
      id TEXT PRIMARY KEY,
      requisition_id TEXT NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL
    )`,
    
    // Inventory table
    `CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) UNIQUE,
      current_stock INTEGER NOT NULL DEFAULT 0,
      reserved_stock INTEGER NOT NULL DEFAULT 0,
      available_stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 0,
      max_stock INTEGER NOT NULL DEFAULT 1000,
      reorder_point INTEGER NOT NULL DEFAULT 10,
      reorder_quantity INTEGER NOT NULL DEFAULT 100,
      average_cost REAL NOT NULL DEFAULT 0,
      last_cost REAL NOT NULL DEFAULT 0,
      location TEXT NOT NULL DEFAULT 'main',
      last_movement TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_stock_take TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      needs_reorder INTEGER NOT NULL DEFAULT 0 CHECK (needs_reorder IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Stock movements table
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment', 'transfer', 'return', 'damage', 'expired')),
      quantity INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      reference TEXT,
      reason TEXT,
      location TEXT NOT NULL DEFAULT 'main',
      batch_number TEXT,
      expiry_date TEXT,
      user_id TEXT NOT NULL REFERENCES users(id),
      approved_by TEXT REFERENCES users(id),
      approved_at TEXT,
      is_approved INTEGER NOT NULL DEFAULT 1 CHECK (is_approved IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Suppliers table
    `CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      payment_terms TEXT NOT NULL DEFAULT 'net30' CHECK (payment_terms IN ('cash', 'net7', 'net15', 'net30', 'net60')),
      currency TEXT NOT NULL DEFAULT 'THB',
      tax_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      rating INTEGER NOT NULL DEFAULT 3,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Purchase orders table
    `CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled')),
      subtotal REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      shipping_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'THB',
      expected_date TEXT,
      received_date TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      approved_by TEXT REFERENCES users(id),
      approved_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Purchase order items table
    `CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL,
      received_quantity INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    )`,
    
    // Stock alerts table
    `CREATE TABLE IF NOT EXISTS stock_alerts (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      type TEXT NOT NULL CHECK (type IN ('low_stock', 'out_of_stock', 'overstock', 'expiry_warning')),
      message TEXT NOT NULL,
      current_stock INTEGER NOT NULL,
      threshold INTEGER NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
      is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
      read_by TEXT REFERENCES users(id),
      read_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  ]
  
  for (let i = 0; i < tables.length; i++) {
    try {
      console.log(`Creating table ${i + 1}/${tables.length}...`)
      await client.execute(tables[i])
      console.log(`✅ Table ${i + 1} created successfully`)
    } catch (error) {
      console.error(`❌ Error creating table ${i + 1}:`, error)
    }
  }
  
  console.log('📋 All tables created!')
}

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Migration completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    })
}