import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  position: text('position').notNull(),
  phone: text('phone').notNull(),
  role: text('role', { enum: ['admin', 'employee'] }).notNull().default('employee'),
  priceLevel: text('price_level', { 
    enum: ['ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ'] 
  }).notNull().default('ราคาปกติ'),
  creditLimit: real('credit_limit').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// Products table
export const products = sqliteTable('products', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  category: text('category', { enum: ['สินค้าหลัก', 'สินค้าทางเลือก'] }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// Product prices (separate table for JSON-like behavior)
export const productPrices = sqliteTable('product_prices', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  level: text('level', { 
    enum: ['ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ'] 
  }).notNull(),
  value: real('value').notNull(),
})

// Sales table
export const sales = sqliteTable('sales', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  employeeId: text('employee_id').notNull().references(() => users.id),
  employeeName: text('employee_name').notNull(),
  saleDate: text('sale_date').notNull().default(sql`CURRENT_TIMESTAMP`),
  type: text('type', { enum: ['เบิก', 'คืน'] }).notNull(),
  totalAmount: real('total_amount').notNull().default(0),
  notes: text('notes'),
  paidAmount: real('paid_amount').notNull().default(0),
  paymentMethod: text('payment_method', { 
    enum: ['cash', 'transfer', 'customer_pending'] 
  }).notNull().default('cash'),
  pendingAmount: real('pending_amount').notNull().default(0),
  cashAmount: real('cash_amount').notNull().default(0),
  transferAmount: real('transfer_amount').notNull().default(0),
  customerPending: real('customer_pending').notNull().default(0),
  expenseAmount: real('expense_amount').notNull().default(0),
  awaitingTransfer: real('awaiting_transfer').notNull().default(0),
  settled: integer('settled', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// Sale items table
export const saleItems = sqliteTable('sale_items', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  saleId: text('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  pricePerUnit: real('price_per_unit').notNull(),
  withdrawal: integer('withdrawal').notNull().default(0),
  return: integer('return').notNull().default(0),
  defective: integer('defective').notNull().default(0),
  totalPrice: real('total_price').notNull(),
})

// Requisitions table
export const requisitions = sqliteTable('requisitions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  employeeId: text('employee_id').notNull().references(() => users.id),
  status: text('status', { enum: ['open', 'cleared'] }).notNull().default('open'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// Requisition items table
export const requisitionItems = sqliteTable('requisition_items', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  requisitionId: text('requisition_id').notNull().references(() => requisitions.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
})

// Inventory table
export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  productId: text('product_id').notNull().references(() => products.id).unique(),
  currentStock: integer('current_stock').notNull().default(0),
  reservedStock: integer('reserved_stock').notNull().default(0),
  availableStock: integer('available_stock').notNull().default(0),
  minStock: integer('min_stock').notNull().default(0),
  maxStock: integer('max_stock').notNull().default(1000),
  reorderPoint: integer('reorder_point').notNull().default(10),
  reorderQuantity: integer('reorder_quantity').notNull().default(100),
  averageCost: real('average_cost').notNull().default(0),
  lastCost: real('last_cost').notNull().default(0),
  location: text('location').notNull().default('main'),
  lastMovement: text('last_movement').notNull().default(sql`CURRENT_TIMESTAMP`),
  lastStockTake: text('last_stock_take'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  needsReorder: integer('needs_reorder', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// Stock movements table
export const stockMovements = sqliteTable('stock_movements', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  productId: text('product_id').notNull().references(() => products.id),
  type: text('type', { 
    enum: ['purchase', 'sale', 'adjustment', 'transfer', 'return', 'damage', 'expired'] 
  }).notNull(),
  quantity: integer('quantity').notNull(),
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  unitCost: real('unit_cost').notNull().default(0),
  totalCost: real('total_cost').notNull().default(0),
  reference: text('reference'),
  reason: text('reason'),
  location: text('location').notNull().default('main'),
  batchNumber: text('batch_number'),
  expiryDate: text('expiry_date'),
  userId: text('user_id').notNull().references(() => users.id),
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: text('approved_at'),
  isApproved: integer('is_approved', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// Suppliers table
export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  code: text('code').unique(),
  contactPerson: text('contact_person'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'), // JSON string for address object
  paymentTerms: text('payment_terms', { 
    enum: ['cash', 'net7', 'net15', 'net30', 'net60'] 
  }).notNull().default('net30'),
  currency: text('currency').notNull().default('THB'),
  taxId: text('tax_id'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  rating: integer('rating').notNull().default(3),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// Purchase orders table
export const purchaseOrders = sqliteTable('purchase_orders', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  orderNumber: text('order_number').notNull().unique(),
  supplierId: text('supplier_id').notNull().references(() => suppliers.id),
  status: text('status', { 
    enum: ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'] 
  }).notNull().default('draft'),
  subtotal: real('subtotal').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  shippingAmount: real('shipping_amount').notNull().default(0),
  totalAmount: real('total_amount').notNull().default(0),
  currency: text('currency').notNull().default('THB'),
  expectedDate: text('expected_date'),
  receivedDate: text('received_date'),
  createdBy: text('created_by').notNull().references(() => users.id),
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: text('approved_at'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// Purchase order items table
export const purchaseOrderItems = sqliteTable('purchase_order_items', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  purchaseOrderId: text('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitCost: real('unit_cost').notNull(),
  totalCost: real('total_cost').notNull(),
  receivedQuantity: integer('received_quantity').notNull().default(0),
  notes: text('notes'),
})

// Stock alerts table
export const stockAlerts = sqliteTable('stock_alerts', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  productId: text('product_id').notNull().references(() => products.id),
  type: text('type', { 
    enum: ['low_stock', 'out_of_stock', 'overstock', 'expiry_warning'] 
  }).notNull(),
  message: text('message').notNull(),
  currentStock: integer('current_stock').notNull(),
  threshold: integer('threshold').notNull(),
  severity: text('severity', { enum: ['info', 'warning', 'critical'] }).notNull().default('warning'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  readBy: text('read_by').references(() => users.id),
  readAt: text('read_at'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

// Type exports for TypeScript inference
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type ProductPrice = typeof productPrices.$inferSelect
export type NewProductPrice = typeof productPrices.$inferInsert
export type Sale = typeof sales.$inferSelect
export type NewSale = typeof sales.$inferInsert
export type SaleItem = typeof saleItems.$inferSelect
export type NewSaleItem = typeof saleItems.$inferInsert
export type Requisition = typeof requisitions.$inferSelect
export type NewRequisition = typeof requisitions.$inferInsert
export type RequisitionItem = typeof requisitionItems.$inferSelect
export type NewRequisitionItem = typeof requisitionItems.$inferInsert
export type Inventory = typeof inventory.$inferSelect
export type NewInventory = typeof inventory.$inferInsert
export type StockMovement = typeof stockMovements.$inferSelect
export type NewStockMovement = typeof stockMovements.$inferInsert
export type Supplier = typeof suppliers.$inferSelect
export type NewSupplier = typeof suppliers.$inferInsert
export type PurchaseOrder = typeof purchaseOrders.$inferSelect
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert
export type StockAlert = typeof stockAlerts.$inferSelect
export type NewStockAlert = typeof stockAlerts.$inferInsert