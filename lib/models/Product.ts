import { eq } from 'drizzle-orm'
import db from '../database'
import { products, productPrices, type Product, type NewProduct, type ProductPrice, type NewProductPrice } from '../schema'
import { CATEGORY_TYPES, CategoryType } from '../constants'

export interface IPrice {
  id?: string
  level: string
  value: number
}

export interface IProduct {
  id: string
  name: string
  prices: IPrice[]
  category: CategoryType
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export class ProductModel {
  static async findOne(criteria: Partial<Product>): Promise<IProduct | null> {
    try {
      let result: Product[] = []
      
      if ('id' in criteria && criteria.id) {
        result = await db.select().from(products).where(eq(products.id, criteria.id)).limit(1)
      } else if ('name' in criteria && criteria.name) {
        result = await db.select().from(products).where(eq(products.name, criteria.name)).limit(1)
      }
      
      const product = result[0]
      if (!product) return null
      
      // Get prices for this product
      const prices = await db.select().from(productPrices).where(eq(productPrices.productId, product.id))
      
      return {
        ...product,
        prices: prices.map((p: any) => ({ id: p.id, level: p.level, value: p.value }))
      }
    } catch (error) {
      console.error('Error finding product:', error)
      return null
    }
  }

  static async findById(id: string): Promise<IProduct | null> {
    try {
      const result = await db.select().from(products).where(eq(products.id, id)).limit(1)
      const product = result[0]
      
      if (!product) return null
      
      // Get prices for this product
      const prices = await db.select().from(productPrices).where(eq(productPrices.productId, product.id))
      
      return {
        ...product,
        prices: prices.map((p: any) => ({ id: p.id, level: p.level, value: p.value }))
      }
    } catch (error) {
      console.error('Error finding product by ID:', error)
      return null
    }
  }

  static async create(productData: Omit<NewProduct, 'id' | 'createdAt' | 'updatedAt'> & { prices: IPrice[] }): Promise<IProduct> {
    try {
      const productResult = await db.insert(products).values({
        name: productData.name,
        category: productData.category,
        isActive: productData.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning()
      
      const product = productResult[0]
      
      // Insert prices
      if (productData.prices && productData.prices.length > 0) {
        const priceValues = productData.prices.map(price => ({
          productId: product.id,
          level: price.level as 'ราคาปกติ' | 'ราคาตัวแทน' | 'ราคาพนักงาน' | 'ราคาพิเศษ',
          value: price.value,
        }))
        
        await db.insert(productPrices).values(priceValues)
      }
      
      return {
        ...product,
        prices: productData.prices || []
      }
    } catch (error) {
      console.error('Error creating product:', error)
      throw error
    }
  }

  static async find(criteria: Partial<Product> = {}): Promise<IProduct[]> {
    try {
      let productsResult: Product[] = []
      
      if (Object.keys(criteria).length === 0) {
        productsResult = await db.select().from(products)
      } else if ('isActive' in criteria && typeof criteria.isActive === 'boolean') {
        productsResult = await db.select().from(products).where(eq(products.isActive, criteria.isActive))
      } else if ('category' in criteria && criteria.category) {
        productsResult = await db.select().from(products).where(eq(products.category, criteria.category))
      } else {
        productsResult = await db.select().from(products)
      }
      
      // Get prices for all products
      const allPrices = await db.select().from(productPrices)
      
      return productsResult.map(product => ({
        ...product,
        prices: allPrices
          .filter((price: any) => price.productId === product.id)
          .map((p: any) => ({ id: p.id, level: p.level, value: p.value }))
      }))
    } catch (error) {
      console.error('Error finding products:', error)
      return []
    }
  }

  static async updateById(id: string, updates: Partial<NewProduct> & { prices?: IPrice[] }): Promise<IProduct | null> {
    try {
      const productUpdate: Partial<NewProduct> = {
        name: updates.name,
        category: updates.category,
        isActive: updates.isActive,
        updatedAt: new Date().toISOString()
      }
      
      const result = await db.update(products)
        .set(productUpdate)
        .where(eq(products.id, id))
        .returning()
      
      const product = result[0]
      if (!product) return null
      
      // Update prices if provided
      if (updates.prices) {
        // Delete existing prices
        await db.delete(productPrices).where(eq(productPrices.productId, id))
        
        // Insert new prices
        if (updates.prices.length > 0) {
          const priceValues = updates.prices.map(price => ({
            productId: id,
            level: price.level as 'ราคาปกติ' | 'ราคาตัวแทน' | 'ราคาพนักงาน' | 'ราคาพิเศษ',
            value: price.value,
          }))
          
          await db.insert(productPrices).values(priceValues)
        }
      }
      
      // Get updated prices
      const prices = await db.select().from(productPrices).where(eq(productPrices.productId, id))
      
      return {
        ...product,
        prices: prices.map((p: any) => ({ id: p.id, level: p.level, value: p.value }))
      }
    } catch (error) {
      console.error('Error updating product:', error)
      return null
    }
  }

  static async deleteMany(criteria: Partial<Product> = {}): Promise<void> {
    try {
      if (Object.keys(criteria).length === 0) {
        await db.delete(productPrices) // Delete prices first due to foreign key
        await db.delete(products)
      }
    } catch (error) {
      console.error('Error deleting products:', error)
      throw error
    }
  }
}

export default ProductModel

