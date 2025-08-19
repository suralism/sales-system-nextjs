import mongoose from 'mongoose'

export interface ISaleItem {
  productId: mongoose.Types.ObjectId
  productName: string
  pricePerUnit: number
  withdrawal: number
  return: number
  defective: number
  totalPrice: number
}

export interface ISale extends mongoose.Document {
  _id: string
  employeeId: mongoose.Types.ObjectId
  employeeName: string
  saleDate: Date
  type: 'เบิก' | 'คืน'
  items: ISaleItem[]
  totalAmount: number
  notes?: string
  paidAmount: number
  paymentMethod: 'cash' | 'transfer' | 'customer_pending'
  pendingAmount: number
  cashAmount: number
  transferAmount: number
  customerPending: number
  expenseAmount: number
  awaitingTransfer: number
  settled: boolean
  createdAt: Date
  updatedAt: Date
}

const SaleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  pricePerUnit: {
    type: Number,
    required: [true, 'Price per unit is required'],
    min: [0, 'Price per unit cannot be negative']
  },
  withdrawal: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  return: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  defective: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  }
}, { _id: false })

const SaleSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee ID is required']
  },
  employeeName: {
    type: String,
    required: [true, 'Employee name is required'],
    trim: true
  },
  saleDate: {
    type: Date,
    required: [true, 'Sale date is required'],
    default: Date.now
  },
  type: {
    type: String,
    enum: ['เบิก', 'คืน'],
    required: [true, 'Sale type is required']
  },
  items: {
    type: [SaleItemSchema],
    required: [true, 'Sale items are required'],
    validate: {
      validator: function(items: ISaleItem[]) {
        return items && items.length > 0
      },
      message: 'At least one sale item is required'
    }
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'customer_pending'],
    default: 'cash'
  },
  pendingAmount: {
    type: Number,
    default: 0,
    min: [0, 'Pending amount cannot be negative']
  },
  cashAmount: {
    type: Number,
    default: 0,
    min: [0, 'Cash amount cannot be negative']
  },
  transferAmount: {
    type: Number,
    default: 0,
    min: [0, 'Transfer amount cannot be negative']
  },
  customerPending: {
    type: Number,
    default: 0,
    min: [0, 'Customer pending cannot be negative']
  },
  expenseAmount: {
    type: Number,
    default: 0,
    min: [0, 'Expense amount cannot be negative']
  },
  awaitingTransfer: {
    type: Number,
    default: 0,
    min: [0, 'Awaiting transfer cannot be negative']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  settled: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Index for better query performance
SaleSchema.index({ employeeId: 1 })
SaleSchema.index({ saleDate: -1 })
SaleSchema.index({ type: 1 })
SaleSchema.index({ employeeId: 1, saleDate: -1 })

// Pre-save middleware to calculate total amount
SaleSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.totalAmount = this.items.reduce((total, item) => {
      const netQuantity = item.withdrawal - item.return - item.defective;
      return total + (netQuantity * item.pricePerUnit);
    }, 0)
  }
  next()
})

export default mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema)

