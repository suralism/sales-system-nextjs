import { eq } from 'drizzle-orm'
import db from '../database'
import { users, type User, type NewUser } from '../schema'

export interface IUser {
  id: string
  username: string
  email: string
  password: string
  name: string
  position: string
  phone: string
  role: 'admin' | 'employee'
  priceLevel: 'ราคาปกติ' | 'ราคาตัวแทน' | 'ราคาพนักงาน' | 'ราคาพิเศษ'
  creditLimit: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export class UserModel {
  static async findOne(criteria: Partial<User>): Promise<User | null> {
    try {
      if ('username' in criteria && criteria.username) {
        const result = await db.select().from(users).where(eq(users.username, criteria.username)).limit(1)
        return result[0] || null
      }
      if ('email' in criteria && criteria.email) {
        const result = await db.select().from(users).where(eq(users.email, criteria.email)).limit(1)
        return result[0] || null
      }
      if ('id' in criteria && criteria.id) {
        const result = await db.select().from(users).where(eq(users.id, criteria.id)).limit(1)
        return result[0] || null
      }
      return null
    } catch (error) {
      console.error('Error finding user:', error)
      return null
    }
  }

  static async findById(id: string): Promise<User | null> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
      return result[0] || null
    } catch (error) {
      console.error('Error finding user by ID:', error)
      return null
    }
  }

  static async create(userData: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const result = await db.insert(users).values({
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning()
      
      return result[0]
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  static async deleteMany(criteria: Partial<User> = {}): Promise<void> {
    try {
      if (Object.keys(criteria).length === 0) {
        await db.delete(users)
      } else {
        if ('id' in criteria && criteria.id) {
          await db.delete(users).where(eq(users.id, criteria.id))
        }
      }
    } catch (error) {
      console.error('Error deleting users:', error)
      throw error
    }
  }

  static async updateById(id: string, updates: Partial<NewUser>): Promise<User | null> {
    try {
      const result = await db.update(users)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(users.id, id))
        .returning()
      
      return result[0] || null
    } catch (error) {
      console.error('Error updating user:', error)
      return null
    }
  }

  static async find(criteria: Partial<User> = {}): Promise<User[]> {
    try {
      if (Object.keys(criteria).length === 0) {
        return await db.select().from(users)
      }
      
      if ('role' in criteria && criteria.role) {
        return await db.select().from(users).where(eq(users.role, criteria.role))
      }
      if ('isActive' in criteria && typeof criteria.isActive === 'boolean') {
        return await db.select().from(users).where(eq(users.isActive, criteria.isActive))
      }
      
      return await db.select().from(users)
    } catch (error) {
      console.error('Error finding users:', error)
      return []
    }
  }
}

export default UserModel


