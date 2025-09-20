import mongoose from 'mongoose'
import Sale from '../../lib/models/Sale'
import {
  calculateCreditForUser,
  calculateCreditUsage,
  buildCreditSummary
} from '../../lib/credit'

describe('credit calculations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('aggregates pending amounts when calculating credit usage', async () => {
    const aggregateMock = jest.spyOn(Sale, 'aggregate').mockResolvedValue([] as never)

    await calculateCreditUsage(['507f1f77bcf86cd799439011'])

    expect(aggregateMock).toHaveBeenCalledTimes(1)
    const pipeline = aggregateMock.mock.calls[0][0] as Array<Record<string, any>>
    const groupStage = pipeline.find((stage) => '$group' in stage) as
      | { $group: Record<string, any> }
      | undefined

    expect(groupStage).toBeDefined()
    expect(groupStage?.$group).toMatchObject({
      totalPending: {
        $sum: {
          $ifNull: ['$pendingAmount', '$totalAmount']
        }
      }
    })
  })

  it('returns a map of credit usage keyed by user id', async () => {
    const userId = new mongoose.Types.ObjectId()
    jest.spyOn(Sale, 'aggregate').mockResolvedValue([
      { _id: userId, totalPending: 750 }
    ] as never)

    const usage = await calculateCreditUsage([userId.toString()])
    expect(usage.get(userId.toString())).toBe(750)
  })

  it('calculates credit for a single user using pending amounts', async () => {
    const userId = new mongoose.Types.ObjectId()
    jest.spyOn(Sale, 'aggregate').mockResolvedValue([
      { _id: userId, totalPending: 450 }
    ] as never)

    const credit = await calculateCreditForUser(userId)
    expect(credit).toBe(450)
  })

  it('builds a safe credit summary even with negative inputs', () => {
    const summary = buildCreditSummary(-100, -50)
    expect(summary).toEqual({
      creditLimit: 0,
      creditUsed: 0,
      creditRemaining: 0
    })
  })
})
