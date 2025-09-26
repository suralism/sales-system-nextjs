import { eq, and } from 'drizzle-orm'
import db from '../database'
import {
  inventory,
  stockMovements,
  suppliers,
  purchaseOrders,
  purchaseOrderItems,
  stockAlerts,
  type Inventory as InventoryType,
  type NewInventory,
  type StockMovement as StockMovementType,
  type NewStockMovement,
  type Supplier as SupplierType,
  type NewSupplier,
  type PurchaseOrder as PurchaseOrderType,
  type NewPurchaseOrder,
  type PurchaseOrderItem,
  type NewPurchaseOrderItem,
  type StockAlert as StockAlertType,
  type NewStockAlert
} from '../schema'

// Stock Movement Types
export enum MovementType {
  PURCHASE = 'purchase',        // Stock in from supplier
  SALE = 'sale',               // Stock out from sale
  ADJUSTMENT = 'adjustment',    // Manual adjustment (+ or -)
  TRANSFER = 'transfer',        // Transfer between locations
  RETURN = 'return',           // Customer return (stock in)
  DAMAGE = 'damage',           // Damaged goods (stock out)
  EXPIRED = 'expired'          // Expired goods (stock out)
}

export class StockMovementModel {
  static async find(criteria: Partial<StockMovementType> = {}): Promise<StockMovementType[]> {
    try {
      if (Object.keys(criteria).length === 0) {
        return await db.select().from(stockMovements)
      }
      
      let result = await db.select().from(stockMovements)
      
      if ('productId' in criteria && criteria.productId) {
        result = result.filter((item: any) => item.productId === criteria.productId)
      }
      if ('type' in criteria && criteria.type) {
        result = result.filter((item: any) => item.type === criteria.type)
      }
      
      return result
    } catch (error) {
      console.error('Error finding stock movements:', error)
      return []
    }
  }

  static async create(data: Omit<NewStockMovement, 'id' | 'createdAt' | 'updatedAt'>): Promise<StockMovementType> {
    try {
      const result = await db.insert(stockMovements).values({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning()
      
      return result[0]
    } catch (error) {
      console.error('Error creating stock movement:', error)
      throw error
    }
  }

  static async createMovement(data: {
    productId: string,
    type: MovementType,
    quantity: number,
    unitCost?: number,
    reference?: string,
    reason?: string,
    userId: string,
    batchNumber?: string,
    expiryDate?: string
  }): Promise<StockMovementType> {
    try {
      // Get current inventory
      let inventoryRecord = await InventoryModel.findOne({ productId: data.productId })
      if (!inventoryRecord) {
        inventoryRecord = await InventoryModel.create({ productId: data.productId, currentStock: 0 })
      }
      
      const previousStock = inventoryRecord.currentStock
      const newStock = previousStock + (data.type === MovementType.SALE || 
                                       data.type === MovementType.DAMAGE || 
                                       data.type === MovementType.EXPIRED ? -data.quantity : data.quantity)
      
      const movement = await this.create({
        ...data,
        previousStock,
        newStock,
        totalCost: (data.unitCost || 0) * data.quantity
      })
      
      // Update inventory
      if (data.type === MovementType.SALE || 
          data.type === MovementType.DAMAGE || 
          data.type === MovementType.EXPIRED) {
        await InventoryModel.removeStock(data.productId, data.quantity)
      } else {
        await InventoryModel.addStock(data.productId, data.quantity, data.unitCost)
      }
      
      return movement
    } catch (error) {
      console.error('Error creating movement:', error)
      throw error
    }
  }
}

export class InventoryModel {
  static async findOne(criteria: Partial<InventoryType>): Promise<InventoryType | null> {
    try {
      if ('productId' in criteria && criteria.productId) {
        const result = await db.select().from(inventory).where(eq(inventory.productId, criteria.productId)).limit(1)
        return result[0] || null
      }
      if ('id' in criteria && criteria.id) {
        const result = await db.select().from(inventory).where(eq(inventory.id, criteria.id)).limit(1)
        return result[0] || null
      }
      return null
    } catch (error) {
      console.error('Error finding inventory:', error)
      return null
    }
  }

  static async create(data: Omit<NewInventory, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryType> {
    try {
      const result = await db.insert(inventory).values({
        ...data,
        availableStock: Math.max(0, (data.currentStock || 0) - (data.reservedStock || 0)),
        needsReorder: (data.currentStock || 0) <= (data.reorderPoint || 10),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning()
      
      return result[0]
    } catch (error) {
      console.error('Error creating inventory:', error)
      throw error
    }
  }

  static async addStock(productId: string, quantity: number, unitCost: number = 0): Promise<void> {
    try {
      let inventoryRecord = await this.findOne({ productId })
      
      if (!inventoryRecord) {
        inventoryRecord = await this.create({ productId, currentStock: 0 })
      }
      
      const oldStock = inventoryRecord.currentStock
      const newStock = oldStock + quantity
      
      let newAverageCost = inventoryRecord.averageCost
      if (unitCost > 0 && quantity > 0) {
        const totalValue = (oldStock * inventoryRecord.averageCost) + (quantity * unitCost)
        const totalQuantity = oldStock + quantity
        newAverageCost = totalValue / totalQuantity
      }
      
      await db.update(inventory)
        .set({
          currentStock: newStock,
          availableStock: Math.max(0, newStock - inventoryRecord.reservedStock),
          averageCost: newAverageCost,
          lastCost: unitCost > 0 ? unitCost : inventoryRecord.lastCost,
          lastMovement: new Date().toISOString(),
          needsReorder: newStock <= inventoryRecord.reorderPoint,
          updatedAt: new Date().toISOString()
        })
        .where(eq(inventory.id, inventoryRecord.id))
    } catch (error) {
      console.error('Error adding stock:', error)
      throw error
    }
  }

  static async removeStock(productId: string, quantity: number): Promise<void> {
    try {
      const inventoryRecord = await this.findOne({ productId })
      
      if (!inventoryRecord) {
        throw new Error('Inventory record not found')
      }
      
      if (quantity > inventoryRecord.availableStock) {
        throw new Error('Insufficient stock available')
      }
      
      const newStock = inventoryRecord.currentStock - quantity
      
      await db.update(inventory)
        .set({
          currentStock: newStock,
          availableStock: Math.max(0, newStock - inventoryRecord.reservedStock),
          lastMovement: new Date().toISOString(),
          needsReorder: newStock <= inventoryRecord.reorderPoint,
          updatedAt: new Date().toISOString()
        })
        .where(eq(inventory.id, inventoryRecord.id))
    } catch (error) {
      console.error('Error removing stock:', error)
      throw error
    }
  }

  static async find(criteria: Partial<InventoryType> = {}): Promise<InventoryType[]> {
    try {
      if (Object.keys(criteria).length === 0) {
        return await db.select().from(inventory)
      }
      
      let result = await db.select().from(inventory)
      
      if ('needsReorder' in criteria && typeof criteria.needsReorder === 'boolean') {
        result = result.filter((item: any) => item.needsReorder === criteria.needsReorder)
      }
      if ('isActive' in criteria && typeof criteria.isActive === 'boolean') {
        result = result.filter((item: any) => item.isActive === criteria.isActive)
      }
      
      return result
    } catch (error) {
      console.error('Error finding inventory:', error)
      return []
    }
  }
}

export class SupplierModel {
  static async find(criteria: Partial<SupplierType> = {}): Promise<SupplierType[]> {
    try {
      if (Object.keys(criteria).length === 0) {
        return await db.select().from(suppliers)
      }
      
      let result = await db.select().from(suppliers)
      
      if ('isActive' in criteria && typeof criteria.isActive === 'boolean') {
        result = result.filter((item: any) => item.isActive === criteria.isActive)
      }
      
      return result
    } catch (error) {
      console.error('Error finding suppliers:', error)
      return []
    }
  }

  static async create(data: Omit<NewSupplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupplierType> {
    try {
      const result = await db.insert(suppliers).values({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning()
      
      return result[0]
    } catch (error) {
      console.error('Error creating supplier:', error)
      throw error
    }
  }
}

export class PurchaseOrderModel {
  static async find(criteria: Partial<PurchaseOrderType> = {}): Promise<PurchaseOrderType[]> {
    try {
      if (Object.keys(criteria).length === 0) {
        return await db.select().from(purchaseOrders)
      }
      
      let result = await db.select().from(purchaseOrders)
      
      if ('status' in criteria && criteria.status) {
        result = result.filter((item: any) => item.status === criteria.status)
      }
      if ('supplierId' in criteria && criteria.supplierId) {
        result = result.filter((item: any) => item.supplierId === criteria.supplierId)
      }
      
      return result
    } catch (error) {
      console.error('Error finding purchase orders:', error)
      return []
    }
  }

  static async create(data: Omit<NewPurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<PurchaseOrderType> {
    try {
      const result = await db.insert(purchaseOrders).values({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning()
      
      return result[0]
    } catch (error) {
      console.error('Error creating purchase order:', error)
      throw error
    }
  }
}

export class StockAlertModel {
  static async find(criteria: Partial<StockAlertType> = {}): Promise<StockAlertType[]> {
    try {
      if (Object.keys(criteria).length === 0) {
        return await db.select().from(stockAlerts)
      }
      
      let result = await db.select().from(stockAlerts)
      
      if ('isActive' in criteria && typeof criteria.isActive === 'boolean') {
        result = result.filter((item: any) => item.isActive === criteria.isActive)
      }
      if ('isRead' in criteria && typeof criteria.isRead === 'boolean') {
        result = result.filter((item: any) => item.isRead === criteria.isRead)
      }
      
      return result
    } catch (error) {
      console.error('Error finding stock alerts:', error)
      return []
    }
  }

  static async create(data: Omit<NewStockAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<StockAlertType> {
    try {
      const result = await db.insert(stockAlerts).values({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning()
      
      return result[0]
    } catch (error) {
      console.error('Error creating stock alert:', error)
      throw error
    }
  }
}

// Export models
export const StockMovement = StockMovementModel
export const Inventory = InventoryModel
export const Supplier = SupplierModel
export const PurchaseOrder = PurchaseOrderModel
export const StockAlert = StockAlertModel