// Tiny IndexedDB key-value store. Every failure (private window, blocked storage, quota) resolves to
// "nothing saved" instead of throwing: the game must keep playing without a save.

const DB = 'extends'
const STORE = 'saves'

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return open().then((db) => new Promise((resolve) => {
    if (!db) return resolve(null)
    try {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  }))
}

export const idbGet = (key: string) => run<unknown>('readonly', (s) => s.get(key))
export const idbPut = (key: string, value: unknown) => run('readwrite', (s) => s.put(value, key))
export const idbDelete = (key: string) => run('readwrite', (s) => s.delete(key))
