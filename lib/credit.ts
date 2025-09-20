import mongoose from 'mongoose'
import Sale from './models/Sale'

export interface CreditSummary {
  creditLimit: number
  creditUsed: number
  creditRemaining: number
}

function normalizeToObjectId(id: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId | null {
  if (!id) {
    return null
  }

  if (id instanceof mongoose.Types.ObjectId) {
    return id
  }

  try {
    return new mongoose.Types.ObjectId(String(id))
  } catch {
    return null
  }
}

export async function calculateCreditUsage(
  userIds: Array<string | mongoose.Types.ObjectId>
): Promise<Map<string, number>> {
  const objectIds = userIds
    .map((id) => normalizeToObjectId(id))
    .filter((id): id is mongoose.Types.ObjectId => id !== null)

  if (objectIds.length === 0) {
    return new Map()
  }

  const usage = await Sale.aggregate<{
    _id: mongoose.Types.ObjectId
    totalPending: number
  }>([
    {
      $match: {
        employeeId: { $in: objectIds },
        type: 'เบิก',
        settled: false
      }
    },
    {
      $group: {
        _id: '$employeeId',
        totalPending: {
          $sum: {
            $ifNull: ['$pendingAmount', '$totalAmount']
          }
        }
      }
    }
  ])

  const usageMap = new Map<string, number>()
  for (const record of usage) {
    usageMap.set(record._id.toString(), record.totalPending || 0)
  }

  return usageMap
}

export async function calculateCreditForUser(
  userId: string | mongoose.Types.ObjectId
): Promise<number> {
  const usageMap = await calculateCreditUsage([userId])
  const normalizedId = normalizeToObjectId(userId)
  if (!normalizedId) {
    return 0
  }

  return usageMap.get(normalizedId.toString()) || 0
}

export function buildCreditSummary(
  limit: number | null | undefined,
  used: number
): CreditSummary {
  const safeLimit = typeof limit === 'number' && !Number.isNaN(limit) && limit > 0 ? limit : 0
  const safeUsed = typeof used === 'number' && used > 0 ? used : 0
  const remaining = Math.max(safeLimit - safeUsed, 0)

  return {
    creditLimit: safeLimit,
    creditUsed: safeUsed,
    creditRemaining: remaining
  }
}
