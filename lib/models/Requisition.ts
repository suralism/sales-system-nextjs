import { eq, and } from 'drizzle-orm'
import db from '../database'
import { requisitions, requisitionItems, type Requisition, type NewRequisition, type RequisitionItem, type NewRequisitionItem } from '../schema'

export interface IRequisitionItem {
  id?: string
  productId: string
  quantity: number
}

export interface IRequisition {
  id: string
  employeeId: string
  items: IRequisitionItem[]
  status: 'open' | 'cleared'
  createdAt: string
  updatedAt: string
}

export class RequisitionModel {
  static async findOne(criteria: Partial<Requisition>): Promise<IRequisition | null> {
    try {
      let result: Requisition[] = []
      
      if ('id' in criteria && criteria.id) {
        result = await db.select().from(requisitions).where(eq(requisitions.id, criteria.id)).limit(1)
      } else if ('employeeId' in criteria && 'status' in criteria) {
        result = await db.select().from(requisitions).where(
          and(
            eq(requisitions.employeeId, criteria.employeeId!),
            eq(requisitions.status, criteria.status!)
          )
        ).limit(1)
      }
      
      const requisition = result[0]
      if (!requisition) return null
      
      // Get requisition items
      const items = await db.select().from(requisitionItems).where(eq(requisitionItems.requisitionId, requisition.id))
      
      return {
        ...requisition,
        items: items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity
        }))
      }
    } catch (error) {
      console.error('Error finding requisition:', error)
      return null
    }
  }

  static async findById(id: string): Promise<IRequisition | null> {
    return this.findOne({ id })
  }

  static async create(data: Omit<NewRequisition, 'id' | 'createdAt' | 'updatedAt'> & { items?: IRequisitionItem[] }): Promise<IRequisition> {
    try {
      const requisitionResult = await db.insert(requisitions).values({
        employeeId: data.employeeId,
        status: data.status || 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning()
      
      const requisition = requisitionResult[0]
      
      // Insert requisition items
      if (data.items && data.items.length > 0) {
        const itemValues = data.items.map(item => ({
          requisitionId: requisition.id,
          productId: item.productId,
          quantity: item.quantity,
        }))
        
        await db.insert(requisitionItems).values(itemValues)
      }
      
      return {
        ...requisition,
        items: data.items || []
      }
    } catch (error) {
      console.error('Error creating requisition:', error)
      throw error
    }
  }

  static async updateById(id: string, updates: Partial<NewRequisition> & { items?: IRequisitionItem[] }): Promise<IRequisition | null> {
    try {
      const requisitionUpdate: Partial<NewRequisition> = {
        ...updates,
        updatedAt: new Date().toISOString()
      }
      
      const result = await db.update(requisitions)
        .set(requisitionUpdate)
        .where(eq(requisitions.id, id))
        .returning()
      
      const requisition = result[0]
      if (!requisition) return null
      
      // Update items if provided
      if (updates.items) {
        // Delete existing items
        await db.delete(requisitionItems).where(eq(requisitionItems.requisitionId, id))
        
        // Insert new items
        if (updates.items.length > 0) {
          const itemValues = updates.items.map(item => ({
            requisitionId: id,
            productId: item.productId,
            quantity: item.quantity,
          }))
          
          await db.insert(requisitionItems).values(itemValues)
        }
      }
      
      // Get updated items
      const items = await db.select().from(requisitionItems).where(eq(requisitionItems.requisitionId, id))
      
      return {
        ...requisition,
        items: items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity
        }))
      }
    } catch (error) {
      console.error('Error updating requisition:', error)
      return null
    }
  }

  static async find(criteria: Partial<Requisition> = {}): Promise<IRequisition[]> {
    try {
      let requisitionsResult = await db.select().from(requisitions)
      
      // Apply filters
      if ('employeeId' in criteria && criteria.employeeId) {
        requisitionsResult = requisitionsResult.filter((req: any) => req.employeeId === criteria.employeeId)
      }
      if ('status' in criteria && criteria.status) {
        requisitionsResult = requisitionsResult.filter((req: any) => req.status === criteria.status)
      }
      
      // Get all requisition items
      if (requisitionsResult.length === 0) return []
      
      const allItems = await db.select().from(requisitionItems)
      
      return requisitionsResult.map((requisition: any) => ({
        ...requisition,
        items: allItems
          .filter((item: any) => item.requisitionId === requisition.id)
          .map((item: any) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity
          }))
      }))
    } catch (error) {
      console.error('Error finding requisitions:', error)
      return []
    }
  }

  static async deleteMany(criteria: Partial<Requisition> = {}): Promise<void> {
    try {
      if (Object.keys(criteria).length === 0) {
        await db.delete(requisitionItems) // Delete items first due to foreign key
        await db.delete(requisitions)
      } else if ('id' in criteria && criteria.id) {
        await db.delete(requisitionItems).where(eq(requisitionItems.requisitionId, criteria.id))
        await db.delete(requisitions).where(eq(requisitions.id, criteria.id))
      }
    } catch (error) {
      console.error('Error deleting requisitions:', error)
      throw error
    }
  }
}

export default RequisitionModel

