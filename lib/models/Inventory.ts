import mongoose from 'mongoose'

// Stock Movement Types
export enum MovementType {
  PURCHASE = 'purchase',        // Stock in from supplier
  SALE = 'sale',               // Stock out from sale
  ADJUSTMENT = 'adjustment',    // Manual adjustment (+ or -)
  TRANSFER = 'transfer',        // Transfer between locations
  RETURN = 'return',           // Customer return (stock in)
  DAMAGE = 'damage',           // Damaged goods (stock out)
  EXPIRED = 'expired'          // Expired goods (stock out)
}

// Stock Movement Schema
const stockMovementSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(MovementType),
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  unitCost: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  reference: {
    type: String, // Sale ID, Purchase Order, etc.
    index: true
  },
  reason: {
    type: String,
    maxlength: 500
  },
  location: {
    type: String,
    default: 'main'
  },
  batchNumber: {
    type: String
  },
  expiryDate: {
    type: Date
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  isApproved: {
    type: Boolean,
    default: true // Most movements are auto-approved except adjustments
  }
}, {
  timestamps: true
})

// Inventory Summary Schema (current stock levels)
const inventorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true,
    index: true
  },
  currentStock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  reservedStock: {
    type: Number,
    default: 0,
    min: 0
  },
  availableStock: {
    type: Number,
    default: 0,
    min: 0
  },
  minStock: {
    type: Number,
    default: 0,
    min: 0
  },
  maxStock: {
    type: Number,
    default: 1000
  },
  reorderPoint: {
    type: Number,
    default: 10,
    min: 0
  },
  reorderQuantity: {
    type: Number,
    default: 100,
    min: 1
  },
  averageCost: {
    type: Number,
    default: 0
  },
  lastCost: {
    type: Number,
    default: 0
  },
  location: {
    type: String,
    default: 'main'
  },
  lastMovement: {
    type: Date,
    default: Date.now
  },
  lastStockTake: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  needsReorder: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Supplier Schema
const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    maxlength: 50
  },
  contactPerson: {
    type: String,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'Thailand' }
  },
  paymentTerms: {
    type: String,
    enum: ['cash', 'net7', 'net15', 'net30', 'net60'],
    default: 'net30'
  },
  currency: {
    type: String,
    default: 'THB'
  },
  taxId: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
})

// Purchase Order Schema
const purchaseOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'],
    default: 'draft'
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    notes: String
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  shippingAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'THB'
  },
  expectedDate: {
    type: Date
  },
  receivedDate: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
})

// Stock Alert Schema
const stockAlertSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: ['low_stock', 'out_of_stock', 'overstock', 'expiry_warning'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  currentStock: {
    type: Number,
    required: true
  },
  threshold: {
    type: Number,
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  readAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Indexes for performance
stockMovementSchema.index({ productId: 1, createdAt: -1 })
stockMovementSchema.index({ type: 1, createdAt: -1 })
stockMovementSchema.index({ reference: 1 })
stockMovementSchema.index({ userId: 1, createdAt: -1 })

inventorySchema.index({ needsReorder: 1, isActive: 1 })
inventorySchema.index({ currentStock: 1 })
inventorySchema.index({ lastMovement: -1 })

supplierSchema.index({ name: 1 })
supplierSchema.index({ code: 1 })
supplierSchema.index({ isActive: 1 })

purchaseOrderSchema.index({ orderNumber: 1 })
purchaseOrderSchema.index({ supplierId: 1, createdAt: -1 })
purchaseOrderSchema.index({ status: 1, createdAt: -1 })
purchaseOrderSchema.index({ createdBy: 1, createdAt: -1 })

stockAlertSchema.index({ productId: 1, type: 1, isActive: 1 })
stockAlertSchema.index({ isRead: 1, severity: 1, createdAt: -1 })

// Virtual fields
inventorySchema.virtual('stockValue').get(function() {
  return this.currentStock * this.averageCost
})

inventorySchema.virtual('turnoverDays').get(function() {
  // Calculate based on average daily sales (placeholder - would come from sales data)
  const avgDailySales = 1 // This would be calculated from actual sales data
  return this.currentStock / Math.max(1, avgDailySales)
})

// Pre-save middleware
inventorySchema.pre('save', function() {
  this.availableStock = Math.max(0, this.currentStock - this.reservedStock)
  this.needsReorder = this.currentStock <= this.reorderPoint
})

// Methods
inventorySchema.methods.addStock = function(quantity: number, unitCost: number = 0) {
  const oldStock = this.currentStock
  this.currentStock += quantity
  
  // Update average cost using weighted average
  if (unitCost > 0 && quantity > 0) {
    const totalValue = (oldStock * this.averageCost) + (quantity * unitCost)
    const totalQuantity = oldStock + quantity
    this.averageCost = totalValue / totalQuantity
    this.lastCost = unitCost
  }
  
  this.lastMovement = new Date()
}

inventorySchema.methods.removeStock = function(quantity: number) {
  if (quantity > this.availableStock) {
    throw new Error('Insufficient stock available')
  }
  
  this.currentStock -= quantity
  this.lastMovement = new Date()
}

inventorySchema.methods.reserveStock = function(quantity: number) {
  if (quantity > this.availableStock) {
    throw new Error('Insufficient stock available for reservation')
  }
  
  this.reservedStock += quantity
}

inventorySchema.methods.releaseReservation = function(quantity: number) {
  this.reservedStock = Math.max(0, this.reservedStock - quantity)
}

// Static methods
stockMovementSchema.statics.createMovement = async function(data: {
  productId: string,
  type: MovementType,
  quantity: number,
  unitCost?: number,
  reference?: string,
  reason?: string,
  userId: string,
  batchNumber?: string,
  expiryDate?: Date
}) {
  const Inventory = mongoose.model('Inventory')
  
  // Get current inventory
  let inventory = await Inventory.findOne({ productId: data.productId })
  if (!inventory) {
    inventory = new Inventory({ productId: data.productId, currentStock: 0 })
  }
  
  const previousStock = inventory.currentStock
  const movement = new this({
    ...data,
    previousStock,
    newStock: previousStock + (data.type === MovementType.SALE || 
                             data.type === MovementType.DAMAGE || 
                             data.type === MovementType.EXPIRED ? -data.quantity : data.quantity),
    totalCost: (data.unitCost || 0) * data.quantity
  })
  
  // Update inventory
  if (data.type === MovementType.SALE || 
      data.type === MovementType.DAMAGE || 
      data.type === MovementType.EXPIRED) {
    inventory.removeStock(data.quantity)
  } else {
    inventory.addStock(data.quantity, data.unitCost)
  }
  
  await inventory.save()
  await movement.save()
  
  return movement
}

// Export models
export const StockMovement = mongoose.models.StockMovement || mongoose.model('StockMovement', stockMovementSchema)
export const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema)
export const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema)
export const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', purchaseOrderSchema)
export const StockAlert = mongoose.models.StockAlert || mongoose.model('StockAlert', stockAlertSchema)