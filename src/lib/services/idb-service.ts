/**
 * Servicio para manejar el almacenamiento local con IndexedDB
 * Esto permite cachear transacciones para mejorar el rendimiento y soporte offline
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Transaction } from '../stores/transactions';

interface TransactionsDB {
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      'by-date': string;
    };
  };
  meta: {
    key: string;
    value: {
      lastUpdate: number;
      lastDocId?: string;
    };
  };
}

const DB_NAME = 'expense-manager-db';
const DB_VERSION = 1;
const TRANSACTIONS_STORE = 'transactions';
const META_STORE = 'meta';
const CACHE_EXPIRATION_TIME = 30 * 60 * 1000; // 30 minutos en milisegundos

let dbPromise: Promise<IDBPDatabase<TransactionsDB>> | null = null;

// Inicializar la base de datos
function initDB(): Promise<IDBPDatabase<TransactionsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TransactionsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Crear store para transacciones
        const transactionsStore = db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' });
        transactionsStore.createIndex('by-date', 'date');
        
        // Store para metadatos
        db.createObjectStore(META_STORE);

        if (import.meta.env.DEV) {
          console.log('[IDB] Base de datos creada/actualizada a versión', DB_VERSION);
        }
      }
    });
  }
  return dbPromise;
}

// Guardar transacciones en la caché
export async function cacheTransactions(transactions: Transaction[]): Promise<void> {
  try {
    const db = await initDB();
    const tx = db.transaction(TRANSACTIONS_STORE, 'readwrite');
    
    // Usar promises en paralelo para mejorar rendimiento
    const promises = transactions.map(transaction => tx.store.put(transaction));
    
    // Actualizar metadatos
    const lastDocId = transactions.length > 0 ? 
      transactions[transactions.length - 1].id : 
      undefined;
      
    await Promise.all([
      ...promises,
      tx.done,
      db.put(META_STORE, {
        lastUpdate: Date.now(),
        lastDocId
      }, 'transactions-meta')
    ]);

    if (import.meta.env.DEV) {
      console.log(`[IDB] Cacheadas ${transactions.length} transacciones`);
    }
  } catch (error) {
    console.error('[IDB] Error al cachear transacciones:', error);
  }
}

// Obtener transacciones desde la caché
export async function getCachedTransactions(): Promise<Transaction[] | null> {
  try {
    const db = await initDB();
    
    // Verificar si la caché es reciente
    const meta = await db.get(META_STORE, 'transactions-meta');
    const now = Date.now();
    
    if (!meta || (now - meta.lastUpdate > CACHE_EXPIRATION_TIME)) {
      if (import.meta.env.DEV) {
        console.log('[IDB] Caché expirada o inexistente');
      }
      return null;
    }
    
    // Obtener transacciones en orden por fecha (índice 'by-date')
    const allTransactions = await db.getAllFromIndex(
      TRANSACTIONS_STORE, 
      'by-date'
    );
    
    // Ordenar manualmente para asegurar que estén en el orden correcto
    allTransactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Orden descendente (más reciente primero)
    });
    
    if (import.meta.env.DEV) {
      console.log(`[IDB] Recuperadas ${allTransactions.length} transacciones de caché`);
    }
    
    return allTransactions;
  } catch (error) {
    console.error('[IDB] Error al recuperar transacciones de caché:', error);
    return null;
  }
}

// Obtener último documento cacheado para manejar paginación
export async function getLastCachedDocId(): Promise<string | null> {
  try {
    const db = await initDB();
    const meta = await db.get(META_STORE, 'transactions-meta');
    
    return meta?.lastDocId || null;
  } catch (error) {
    console.error('[IDB] Error al obtener último ID cacheado:', error);
    return null;
  }
}

// Limpiar caché (útil cuando hay problemas o para forzar actualización)
export async function clearCache(): Promise<void> {
  try {
    const db = await initDB();
    await db.clear(TRANSACTIONS_STORE);
    await db.delete(META_STORE, 'transactions-meta');
    
    if (import.meta.env.DEV) {
      console.log('[IDB] Caché limpiada correctamente');
    }
  } catch (error) {
    console.error('[IDB] Error al limpiar caché:', error);
  }
}

// Añadir o actualizar una transacción individual en la caché
export async function updateCachedTransaction(transaction: Transaction): Promise<void> {
  try {
    const db = await initDB();
    await db.put(TRANSACTIONS_STORE, transaction);
    
    if (import.meta.env.DEV) {
      console.log(`[IDB] Transacción ID:${transaction.id} actualizada en caché`);
    }
  } catch (error) {
    console.error('[IDB] Error al actualizar transacción en caché:', error);
  }
}

// Eliminar una transacción de la caché
export async function deleteCachedTransaction(id: string): Promise<void> {
  try {
    const db = await initDB();
    await db.delete(TRANSACTIONS_STORE, id);
    
    if (import.meta.env.DEV) {
      console.log(`[IDB] Transacción ID:${id} eliminada de caché`);
    }
  } catch (error) {
    console.error('[IDB] Error al eliminar transacción de caché:', error);
  }
}
