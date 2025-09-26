import { eq, and, desc, gte, lte, count } from 'drizzle-orm'
import db from '../database'
import { sales, saleItems, type Sale, type NewSale, type SaleItem, type NewSaleItem } from '../schema'

export interface ISaleItem {
  id?: string
  productId: string
  productName: string
  pricePerUnit: number
  withdrawal: number
  return: number
  defective: number
  totalPrice: number
}

export interface ISale {
  id: string
  employeeId: string
  employeeName: string
  saleDate: string
  type: 'เบิก' | 'คืน'
  items: ISaleItem[]
  totalAmount: number
  notes?: string
  paidAmount: number
  paymentMethod: 'cash' | 'transfer' | 'customer_pending'
  pendingAmount: number
  cashAmount: number
  transferAmount: number
  customerPending: number
  expenseAmount: number
  awaitingTransfer: number
  settled: boolean
  createdAt: string
  updatedAt: string
}

export class SaleModel {
  static async findOne(criteria: Partial<Sale>): Promise<ISale | null> {
    try {
      let result: Sale[] = []
      
      if ('id' in criteria && criteria.id) {
        result = await db.select().from(sales).where(eq(sales.id, criteria.id)).limit(1)
      } else if ('employeeId' in criteria && 'type' in criteria && 'settled' in criteria) {
        result = await db.select().from(sales).where(
          and(
            eq(sales.employeeId, criteria.employeeId!),
            eq(sales.type, criteria.type!),
            eq(sales.settled, criteria.settled!)
          )
        ).limit(1)
      }
      
      const sale = result[0]
      if (!sale) return null
      
      // Get sale items
      const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id))
      
      return {
        ...sale,
        notes: sale.notes || undefined,
        items: items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          pricePerUnit: item.pricePerUnit,
          withdrawal: item.withdrawal,
          return: item.return,
          defective: item.defective,
          totalPrice: item.totalPrice
        }))
      }
    } catch (error) {
      console.error('Error finding sale:', error)
      return null
    }
  }

  static async findById(id: string): Promise<ISale | null> {
    return this.findOne({ id })
  }

  static async create(saleData: Omit<NewSale, 'id' | 'createdAt' | 'updatedAt'> & { items: ISaleItem[] }): Promise<ISale> {
    try {
      // Calculate total amount from items
      const totalAmount = saleData.items.reduce((total, item) => {
        return total + (item.withdrawal * item.pricePerUnit)
      }, 0)
      
      const saleResult = await db.insert(sales).values({
        employeeId: saleData.employeeId,
        employeeName: saleData.employeeName,
        saleDate: saleData.saleDate || new Date().toISOString(),
        type: saleData.type,
        totalAmount,
        notes: saleData.notes,
        paidAmount: saleData.paidAmount || 0,
        paymentMethod: saleData.paymentMethod || 'cash',
        pendingAmount: saleData.pendingAmount || 0,
        cashAmount: saleData.cashAmount || 0,
        transferAmount: saleData.transferAmount || 0,
        customerPending: saleData.customerPending || 0,
        expenseAmount: saleData.expenseAmount || 0,
        awaitingTransfer: saleData.awaitingTransfer || 0,
        settled: saleData.settled || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning()
      
      const sale = saleResult[0]
      
      // Insert sale items
      if (saleData.items && saleData.items.length > 0) {
        const itemValues = saleData.items.map(item => ({
          saleId: sale.id,
          productId: item.productId,
          productName: item.productName,
          pricePerUnit: item.pricePerUnit,
          withdrawal: item.withdrawal,
          return: item.return,
          defective: item.defective,
          totalPrice: item.totalPrice,
        }))
        
        await db.insert(saleItems).values(itemValues)
      }
      
      return {
        ...sale,
        notes: sale.notes || undefined,
        items: saleData.items || []
      }
    } catch (error) {
      console.error('Error creating sale:', error)
      throw error
    }
  }

  static async find(query: any = {}, options: { skip?: number, limit?: number, sort?: any } = {}): Promise<ISale[]> {
    try {
      // Simple approach: execute the base query and then filter in memory if needed
      let salesResult = await db.select().from(sales)
      
      // Apply filters
      if (query.employeeId) {
        salesResult = salesResult.filter((sale: any) => sale.employeeId === query.employeeId)
      }
      if (query.type) {
        salesResult = salesResult.filter((sale: any) => sale.type === query.type)
      }
      if (typeof query.settled === 'boolean') {
        salesResult = salesResult.filter((sale: any) => sale.settled === query.settled)
      }
      if (query.saleDate && query.saleDate.$gte && query.saleDate.$lte) {
        const start = query.saleDate.$gte.toISOString()
        const end = query.saleDate.$lte.toISOString()
        salesResult = salesResult.filter((sale: any) => sale.saleDate >= start && sale.saleDate <= end)
      }
      
      // Apply sorting
      if (options.sort && options.sort.saleDate === -1) {
        salesResult.sort((a: any, b: any) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      }
      
      // Apply pagination
      if (options.skip) {
        salesResult = salesResult.slice(options.skip)
      }
      if (options.limit) {
        salesResult = salesResult.slice(0, options.limit)
      }
      
      // Get all sale items for these sales
      if (salesResult.length === 0) return []
      
      const allItems = await db.select().from(saleItems)
      
      return salesResult.map((sale: any) => ({
        ...sale,
        notes: sale.notes || undefined,
        items: allItems
          .filter((item: any) => item.saleId === sale.id)
          .map((item: any) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            pricePerUnit: item.pricePerUnit,
            withdrawal: item.withdrawal,
            return: item.return,
            defective: item.defective,
            totalPrice: item.totalPrice
          }))
      }))
    } catch (error) {
      console.error('Error finding sales:', error)
      return []
    }
  }

  static async countDocuments(query: any = {}): Promise<number> {
    try {
      let salesResult = await db.select().from(sales)
      
      // Apply filters
      if (query.employeeId) {
        salesResult = salesResult.filter((sale: any) => sale.employeeId === query.employeeId)

      }
      if (query.type) {
        salesResult = salesResult.filter((sale: any) => sale.type === query.type)
      }
      if (typeof query.settled === 'boolean') {
        salesResult = salesResult.filter((sale: any) => sale.settled === query.settled)
      }
      if (query.saleDate && query.saleDate.$gte && query.saleDate.$lte) {
        const start = query.saleDate.$gte.toISOString()
        const end = query.saleDate.$lte.toISOString()
        salesResult = salesResult.filter((sale: any) => sale.saleDate >= start && sale.saleDate <= end)
      }
      
      return salesResult.length
    } catch (error) {
      console.error('Error counting sales:', error)
      return 0
    }
  }

  static async updateById(id: string, updates: Partial<NewSale> & { items?: ISaleItem[] }): Promise<ISale | null> {
    try {
      const saleUpdate: Partial<NewSale> = {
        ...updates,
        updatedAt: new Date().toISOString()
      }
      
      const result = await db.update(sales)
        .set(saleUpdate)
        .where(eq(sales.id, id))
        .returning()
      
      const sale = result[0]
      if (!sale) return null
      
      // Update items if provided
      if (updates.items) {
        // Delete existing items
        await db.delete(saleItems).where(eq(saleItems.saleId, id))
        
        // Insert new items
        if (updates.items.length > 0) {
          const itemValues = updates.items.map(item => ({
            saleId: id,
            productId: item.productId,
            productName: item.productName,
            pricePerUnit: item.pricePerUnit,
            withdrawal: item.withdrawal,
            return: item.return,
            defective: item.defective,
            totalPrice: item.totalPrice,
          }))
          
          await db.insert(saleItems).values(itemValues)
        }
      }
      
      // Get updated items
      const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id))
      
      return {
        ...sale,
        notes: sale.notes || undefined,
        items: items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          pricePerUnit: item.pricePerUnit,
          withdrawal: item.withdrawal,
          return: item.return,
          defective: item.defective,
          totalPrice: item.totalPrice
        }))
      }
    } catch (error) {
      console.error('Error updating sale:', error)
      return null
    }
  }

  static async aggregate(pipeline: any[]): Promise<any[]> {
    try {
      // Simplified aggregation for credit calculations
      if (pipeline.length > 0 && pipeline[0].$match) {
        const match = pipeline[0].$match
        
        if (match.employeeId && match.employeeId.$in) {
          // For credit calculations
          if (match.type === 'เบิก' && match.settled === false) {
            const allSales = await db.select().from(sales)
            const filteredSales = allSales.filter((sale: any) => 
              match.employeeId.$in.includes(sale.employeeId) &&
              sale.type === 'เบิก' &&
              sale.settled === false
            )
            
            const grouped = filteredSales.reduce((acc: any, sale: any) => {
              if (!acc[sale.employeeId]) {
                acc[sale.employeeId] = 0
              }
              acc[sale.employeeId] += sale.pendingAmount || sale.totalAmount
              return acc
            }, {} as Record<string, number>)
            
            return Object.entries(grouped).map(([employeeId, totalPending]) => ({
              _id: employeeId,
              totalPending
            }))
          }
        }
      }
      
      return []
    } catch (error) {
      console.error('Error in aggregate:', error)
      return []
    }
  }
}

export default SaleModel