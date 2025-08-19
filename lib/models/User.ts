import mongoose from 'mongoose'

export interface IUser extends mongoose.Document {
  _id: string
  username: string
  email: string
  password: string
  name: string
  position: string
  phone: string
  role: 'admin' | 'employee'
  priceLevel: 'ราคาปกติ' | 'ราคาตัวแทน' | 'ราคาพนักงาน' | 'ราคาพิเศษ'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9-+().\s]+$/, 'Please enter a valid phone number']
  },
  role: {
    type: String,
    enum: ['admin', 'employee'],
    default: 'employee',
    required: true
  },
  priceLevel: {
    type: String,
    enum: ['ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ'],
    default: 'ราคาปกติ',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Index for better query performance
// Index for better query performance
UserSchema.index({ role: 1 })

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)


