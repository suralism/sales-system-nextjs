import mongoose from 'mongoose'

export interface IRequisitionItem {
  productId: mongoose.Types.ObjectId
  quantity: number
}

export interface IRequisition extends mongoose.Document {
  _id: string
  employeeId: mongoose.Types.ObjectId
  items: IRequisitionItem[]
  status: 'open' | 'cleared'
  createdAt: Date
  updatedAt: Date
}

const RequisitionItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: false })

const RequisitionSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: {
    type: [RequisitionItemSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['open', 'cleared'],
    default: 'open'
  }
}, {
  timestamps: true
})

// Index for faster queries by employee and status
RequisitionSchema.index({ employeeId: 1, status: 1 })

export default mongoose.models.Requisition || mongoose.model<IRequisition>('Requisition', RequisitionSchema)

