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

// Ensure each employee has only one open requisition at a time
// by enforcing a unique combination of employeeId and status.
// This groups multiple item withdrawals into a single open bill
// that can later be cleared in one action.
RequisitionSchema.index({ employeeId: 1, status: 1 }, { unique: true })

export default mongoose.models.Requisition || mongoose.model<IRequisition>('Requisition', RequisitionSchema)

