import type { PlayerProjection } from '@shared/schema';

const DB_NAME = 'FantasyBaseballDB';
const DB_VERSION = 1;
const PROJECTIONS_STORE = 'playerProjections';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store for projections
      if (!db.objectStoreNames.contains(PROJECTIONS_STORE)) {
        const store = db.createObjectStore(PROJECTIONS_STORE, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('mlbamId', 'mlbamId', { unique: false });
      }
    };
  });

  return dbPromise;
}

export async function saveProjectionsToIndexedDB(projections: PlayerProjection[]): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([PROJECTIONS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTIONS_STORE);

    // Clear existing projections
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Batch insert projections (use chunking to avoid blocking)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < projections.length; i += CHUNK_SIZE) {
      const chunk = projections.slice(i, i + CHUNK_SIZE);

      await new Promise<void>((resolve, reject) => {
        let completed = 0;
        let hasError = false;

        chunk.forEach(projection => {
          const request = store.add({ ...projection, id: projection.mlbamId || `${projection.name}-${i}` });

          request.onsuccess = () => {
            completed++;
            if (completed === chunk.length && !hasError) {
              resolve();
            }
          };

          request.onerror = () => {
            if (!hasError) {
              hasError = true;
              reject(request.error);
            }
          };
        });
      });

      // Yield to main thread between chunks
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    console.log(`Saved ${projections.length} projections to IndexedDB`);
  } catch (error) {
    console.error('Failed to save projections to IndexedDB:', error);
    throw error;
  }
}

export async function loadProjectionsFromIndexedDB(): Promise<PlayerProjection[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction([PROJECTIONS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTIONS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const projections = request.result.map((item: any) => {
          // Remove the synthetic id we added
          const { id, ...projection } = item;
          return projection as PlayerProjection;
        });
        console.log(`Loaded ${projections.length} projections from IndexedDB`);
        resolve(projections);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load projections from IndexedDB:', error);
    return [];
  }
}

export async function clearProjectionsFromIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([PROJECTIONS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTIONS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log('Cleared all projections from IndexedDB');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to clear projections from IndexedDB:', error);
  }
}

export async function getProjectionsCount(): Promise<number> {
  try {
    const db = await openDB();
    const transaction = db.transaction([PROJECTIONS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTIONS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get projections count:', error);
    return 0;
  }
}
