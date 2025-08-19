import mongoose from 'mongoose'
import { CATEGORY_TYPES, CategoryType } from '../constants'

export interface IPrice extends mongoose.Document {
  level: string;
  value: number;
}

export interface IProduct extends mongoose.Document {
  _id: string
  name: string
  prices: IPrice[];
  category: CategoryType
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const PriceSchema = new mongoose.Schema({
  level: {
    type: String,
    required: true,
    enum: ['ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ']
  },
  value: {
    type: Number,
    required: true,
    min: [0, 'Price value cannot be negative']
  }
});

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  prices: {
    type: [PriceSchema],
    required: true,
    validate: {
      validator: function(v: IPrice[]) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'At least one price level is required.'
    }
  },
  category: {
    type: String,
    enum: CATEGORY_TYPES,
    required: [true, 'Category is required'],
    trim: true,
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

