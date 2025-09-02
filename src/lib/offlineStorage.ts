'use client'

export interface OfflineData {
  id: string
  type: 'sale' | 'product' | 'employee'
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: number
  synced: boolean
}

class OfflineStorageManager {
  private dbName = 'SalesSystemOffline'
  private dbVersion = 1
  private db: IDBDatabase | null = null

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB not supported'))
        return
      }

      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object stores
        if (!db.objectStoreNames.contains('offline_queue')) {
          const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id' })
          queueStore.createIndex('timestamp', 'timestamp')
          queueStore.createIndex('type', 'type')
          queueStore.createIndex('synced', 'synced')
        }

        if (!db.objectStoreNames.contains('cached_data')) {
          const cacheStore = db.createObjectStore('cached_data', { keyPath: 'id' })
          cacheStore.createIndex('type', 'type')
          cacheStore.createIndex('lastUpdated', 'lastUpdated')
        }
      }
    })
  }

  async addToOfflineQueue(data: Omit<OfflineData, 'id' | 'synced'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const id = `${data.type}_${data.action}_${Date.now()}_${Math.random()}`
      const offlineData: OfflineData = {
        ...data,
        id,
        synced: false
      }

      const transaction = this.db!.transaction(['offline_queue'], 'readwrite')
      const store = transaction.objectStore('offline_queue')
      const request = store.add(offlineData)

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(request.error)
    })
  }

  async getOfflineQueue(): Promise<OfflineData[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_queue'], 'readonly')
      const store = transaction.objectStore('offline_queue')
      const index = store.index('synced')
      const request = index.getAll(false)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async markAsSynced(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_queue'], 'readwrite')
      const store = transaction.objectStore('offline_queue')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const data = getRequest.result
        if (data) {
          data.synced = true
          const putRequest = store.put(data)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          resolve() // Item not found, consider it synced
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async cacheData(type: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const cacheItem = {
        id: type,
        type,
        data,
        lastUpdated: Date.now()
      }

      const transaction = this.db!.transaction(['cached_data'], 'readwrite')
      const store = transaction.objectStore('cached_data')
      const request = store.put(cacheItem)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getCachedData(type: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cached_data'], 'readonly')
      const store = transaction.objectStore('cached_data')
      const request = store.get(type)

      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.data : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async clearSyncedItems(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_queue'], 'readwrite')
      const store = transaction.objectStore('offline_queue')
      const index = store.index('synced')
      const request = index.openCursor(IDBKeyRange.only(true))

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }
}

// Singleton instance
const offlineStorage = new OfflineStorageManager()

// Initialize on first import
if (typeof window !== 'undefined') {
  offlineStorage.initialize().catch(console.error)
}

export default offlineStorage

// Helper hook for offline functionality
export function useOfflineSync() {
  const syncOfflineData = async (): Promise<void> => {
    if (!navigator.onLine) {
      console.log('[OfflineSync] Device is offline, skipping sync')
      return
    }

    try {
      const queue = await offlineStorage.getOfflineQueue()
      console.log(`[OfflineSync] Found ${queue.length} items to sync`)

      for (const item of queue) {
        try {
          await syncSingleItem(item)
          await offlineStorage.markAsSynced(item.id)
          console.log(`[OfflineSync] Synced item ${item.id}`)
        } catch (error) {
          console.error(`[OfflineSync] Failed to sync item ${item.id}:`, error)
        }
      }

      // Clean up synced items
      await offlineStorage.clearSyncedItems()
      console.log('[OfflineSync] Offline sync completed')
    } catch (error) {
      console.error('[OfflineSync] Sync failed:', error)
    }
  }

  const syncSingleItem = async (item: OfflineData): Promise<void> => {
    const { type, action, data } = item
    
    let url: string
    let method: string
    let body: any = null

    // Determine API endpoint and method
    switch (type) {
      case 'sale':
        if (action === 'create') {
          url = '/api/sales'
          method = 'POST'
          body = data
        } else if (action === 'update') {
          url = `/api/sales/${data.id}`
          method = 'PUT'
          body = data
        } else if (action === 'delete') {
          url = `/api/sales/${data.id}`
          method = 'DELETE'
        } else {
          throw new Error(`Unknown action: ${action}`)
        }
        break
        
      case 'product':
        if (action === 'create') {
          url = '/api/products'
          method = 'POST'
          body = data
        } else if (action === 'update') {
          url = `/api/products/${data.id}`
          method = 'PUT'
          body = data
        } else if (action === 'delete') {
          url = `/api/products/${data.id}`
          method = 'DELETE'
        } else {
          throw new Error(`Unknown action: ${action}`)
        }
        break
        
      case 'employee':
        if (action === 'create') {
          url = '/api/users'
          method = 'POST'
          body = data
        } else if (action === 'update') {
          url = `/api/users/${data.id}`
          method = 'PUT'
          body = data
        } else if (action === 'delete') {
          url = `/api/users/${data.id}`
          method = 'DELETE'
        } else {
          throw new Error(`Unknown action: ${action}`)
        }
        break
        
      default:
        throw new Error(`Unknown type: ${type}`)
    }

    // Make the API request
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : null,
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  const addToOfflineQueue = async (
    type: OfflineData['type'],
    action: OfflineData['action'],
    data: any
  ): Promise<void> => {
    await offlineStorage.addToOfflineQueue({
      type,
      action,
      data,
      timestamp: Date.now()
    })
  }

  const cacheData = async (type: string, data: any): Promise<void> => {
    await offlineStorage.cacheData(type, data)
  }

  const getCachedData = async (type: string): Promise<any> => {
    return await offlineStorage.getCachedData(type)
  }

  return {
    syncOfflineData,
    addToOfflineQueue,
    cacheData,
    getCachedData
  }
}

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const { syncOfflineData } = useOfflineSync()
    syncOfflineData().catch(console.error)
  })
}
