// Mock database for testing when Turso is not available
import { createId } from '@paralleldrive/cuid2'

// In-memory storage for testing
const mockStorage = {
  users: new Map(),
  products: new Map(),
  productPrices: new Map(),
  sales: new Map(),
  saleItems: new Map(),
  requisitions: new Map(),
  requisitionItems: new Map(),
  inventory: new Map(),
  stockMovements: new Map(),
  suppliers: new Map(),
  purchaseOrders: new Map(),
  purchaseOrderItems: new Map(),
  stockAlerts: new Map(),
}

// Initialize with sample data
export function initializeMockData() {
  const now = new Date().toISOString()
  
  // Add admin user
  const adminId = createId()
  mockStorage.users.set(adminId, {
    id: adminId,
    username: 'admin',
    email: 'admin@example.com',
    password: '$2a$12$LQKvKZz4yYxH5KF1vJF8l.WF.6qT5o3K6J8J5F7j4T4fYd2H9K8mS', // admin123
    name: 'Admin User',
    position: 'Manager',
    phone: '123-456-7890',
    role: 'admin',
    priceLevel: 'ราคาพนักงาน',
    creditLimit: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })
  
  // Add employee user
  const employeeId = createId()
  mockStorage.users.set(employeeId, {
    id: employeeId,
    username: 'employee1',
    email: 'employee1@example.com',
    password: '$2a$12$LQKvKZz4yYxH5KF1vJF8l.WF.6qT5o3K6J8J5F7j4T4fYd2H9K8mS', // emp123
    name: 'Employee One',
    position: 'Sales',
    phone: '098-765-4321',
    role: 'employee',
    priceLevel: 'ราคาปกติ',
    creditLimit: 50000,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })
  
  // Add sample products
  const product1Id = createId()
  const product2Id = createId()
  
  mockStorage.products.set(product1Id, {
    id: product1Id,
    name: 'สินค้าตัวอย่าง 1',
    category: 'สินค้าหลัก',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })
  
  mockStorage.products.set(product2Id, {
    id: product2Id,
    name: 'สินค้าตัวอย่าง 2',
    category: 'สินค้าทางเลือก',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })
  
  // Add product prices
  const priceTypes = ['ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ']
  const basePrices = [100, 80, 70, 60]
  
  priceTypes.forEach((level, index) => {
    // Product 1 prices
    const price1Id = createId()
    mockStorage.productPrices.set(price1Id, {
      id: price1Id,
      productId: product1Id,
      level,
      value: basePrices[index],
    })
    
    // Product 2 prices
    const price2Id = createId()
    mockStorage.productPrices.set(price2Id, {
      id: price2Id,
      productId: product2Id,
      level,
      value: basePrices[index] * 1.5,
    })
  })
  
  console.log('✅ Mock database initialized with sample data')
  console.log(`📊 Data summary:
   - Users: ${mockStorage.users.size}
   - Products: ${mockStorage.products.size}
   - Price levels: ${mockStorage.productPrices.size}`)
}

// Mock database interface
export const mockDb = {
  select: () => ({
    from: (table: string) => ({
      where: (condition: any) => ({
        limit: (num: number) => {
          const tableName = table.split('.').pop() || table
          const storage = mockStorage[tableName as keyof typeof mockStorage]
          if (storage instanceof Map) {
            return Array.from(storage.values()).slice(0, num)
          }
          return []
        }
      }),
      // For queries without where clause
      then: (callback: (result: any[]) => any) => {
        const tableName = table.split('.').pop() || table
        const storage = mockStorage[tableName as keyof typeof mockStorage]
        if (storage instanceof Map) {
          return callback(Array.from(storage.values()))
        }
        return callback([])
      }
    })
  }),
  
  insert: (table: any) => ({
    values: (data: any) => ({
      returning: () => {
        const id = data.id || createId()
        const record = { ...data, id }
        const tableName = table.name || 'users' // Default to users for testing
        const storage = mockStorage[tableName as keyof typeof mockStorage]
        if (storage instanceof Map) {
          storage.set(id, record)
        }
        return [record]
      }
    })
  }),
  
  update: (table: any) => ({
    set: (data: any) => ({
      where: (condition: any) => ({
        returning: () => {
          // Mock update - just return the data
          return [{ ...data, id: 'mock-id' }]
        }
      })
    })
  }),
  
  delete: (table: any) => ({
    where: (condition: any) => {
      // Mock delete
      return Promise.resolve()
    }
  })
}

export default mockDb