import SaleModel from './models/Sale'

export interface CreditSummary {
  creditLimit: number
  creditUsed: number
  creditRemaining: number
}

function normalizeToUserId(id: string): string | null {
  if (!id) {
    return null
  }
  return String(id)
}

export async function calculateCreditUsage(
  userIds: Array<string>
): Promise<Map<string, number>> {
  const normalizedIds = userIds
    .map((id) => normalizeToUserId(id))
    .filter((id): id is string => id !== null)

  if (normalizedIds.length === 0) {
    return new Map()
  }

  const usage = await SaleModel.aggregate([
    {
      $match: {
        employeeId: { $in: normalizedIds },
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
  userId: string
): Promise<number> {
  const usageMap = await calculateCreditUsage([userId])
  return usageMap.get(userId) || 0
}

export function buildCreditSummary(
  creditLimit: number,
  creditUsed: number
): CreditSummary {
  return {
    creditLimit,
    creditUsed,
    creditRemaining: Math.max(0, creditLimit - creditUsed)
  }
}
