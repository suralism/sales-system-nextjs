import mongoose from 'mongoose'

export interface IProduct extends mongoose.Document {
  _id: string
  name: string
  price: number
  stock: number
  description?: string
  category?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function(value: number) {
        return Number.isFinite(value) && value >= 0
      },
      message: 'Price must be a valid positive number'
    }
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    validate: {
      validator: function(value: number) {
        return Number.isInteger(value) && value >= 0
      },
      message: 'Stock must be a valid non-negative integer'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Index for better query performance
ProductSchema.index({ name: 1 })
ProductSchema.index({ category: 1 })
ProductSchema.index({ isActive: 1 })

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)

