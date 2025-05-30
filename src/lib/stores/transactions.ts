import { writable, get } from 'svelte/store';
import { db } from '../firebase';
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    query, 
    orderBy, 
    onSnapshot, 
    doc, 
    setDoc, 
    deleteDoc, 
    getDocs,
    limit,
    startAfter 
} from 'firebase/firestore'; // Funciones de Firestore
import { 
    cacheTransactions, 
    getCachedTransactions, 
    updateCachedTransaction,
    deleteCachedTransaction,
    getLastCachedDocId
} from '../services/idb-service'; // Servicio de caché con IndexedDB

// Asegúrate de que updateTransaction esté definida Y EXPORTADA así:
export async function updateTransaction(transactionData: Transaction): Promise<void> {
    if (!transactionData.id) {
        console.error('[transactions.ts] Error: Se intentó actualizar una transacción sin ID.');
        throw new Error('No se puede actualizar una transacción sin ID.');
    }
    try {
        const transactionDocRef = doc(db, 'transactions', transactionData.id);
        // Usamos setDoc con merge:true para actualizar solo los campos proporcionados
        await setDoc(transactionDocRef, transactionData, { merge: true });
        
        // Actualizar también en la caché
        await updateCachedTransaction(transactionData);
        
        // Actualización optimista del store para mejor UX
        transactions.update(items => {
            const updatedItems = items.map(item => 
                item.id === transactionData.id ? transactionData : item
            );
            
            // Re-ordenar después de actualizar (importante si cambió la fecha)
            updatedItems.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA;
            });
            
            return updatedItems;
        });
        
        if (import.meta.env.DEV) {
            console.log('[transactions.ts] Transacción actualizada en Firebase con ID: ', transactionData.id);
        }
    } catch (error) {
        console.error('[transactions.ts] Error al actualizar la transacción en Firebase: ', error);
        throw error; // Propagar el error para que el componente lo maneje
    }
}

// ... resto de tu store ...


export type TransactionType = 'ingreso' | 'egreso'; // Changed 'gasto' to 'egreso'

export interface Transaction {
    id: string;
    description: string;  // Pagado A
    amount: number;
    date: string;
    type: TransactionType;
    category?: string;    // Mantenido para compatibilidad con datos antiguos
    // Campos adicionales (opcionales)
    location?: string;    // Opciones (Casa o Match Home)
    cuenta?: string;      // Cuenta principal
    subcuenta?: string;   // Subcuenta específica
    paymentMethod?: string;  // Pagado con
    invoice?: string;     // Referencia
    tags?: string;        // Etiquetas
    notes?: string;       // Notas adicionales
    businessPurpose?: string;  // Pagado por
    merchant?: string;    // Para compatibilidad con datos antiguos
    receiptNumber?: string; // Para compatibilidad con datos antiguos
}

// Define extended type that includes formattedAmount (though we aim to not use it for amount processing)
interface TransactionInput extends Partial<Transaction> {
    formattedAmount?: string | number; // Kept for potential other uses or if data still contains it
    [key: string]: any; // Allow any other properties that might exist in the JSON
}

// Ya no importamos datos locales, usamos solo Firestore
// Nota: El comentario siguiente se deja como referencia de la estructura de datos
// interface TransactionInput extends Partial<Transaction> {
//     formattedAmount?: string | number;
//     [key: string]: any;
// }

// Desactivamos la importación local ya que ahora usamos Firestore
// import transactionsDataFromFile from '../data/transactionData.js';

if (import.meta.env.DEV) {
    console.log('[transactions.ts] Usando solo datos de Firestore para mejorar rendimiento');
}

// Configuración para la paginación
const PAGE_SIZE = 50; // Número de transacciones por página
export const isLoadingMore = writable<boolean>(false);
export const hasMoreData = writable<boolean>(true);
export const isInitialDataLoaded = writable<boolean>(false);
// Definir el tipo para el documento de paginación de Firestore
let lastVisibleDoc: any = null; // Último documento visible para paginación

// Tu store principal. Inicialmente está vacío, se llenará con datos de Firestore
export const transactions = writable<Transaction[]>([]);

// Referencia a la colección de transacciones en Firestore
const transactionsCollectionRef = collection(db, 'transactions');

// Crear una consulta para obtener las transacciones más recientes (primera página)
export async function loadFirstPage(): Promise<void> {
    if (get(isLoadingMore)) return;
    
    isLoadingMore.set(true);
    hasMoreData.set(true);
    isInitialDataLoaded.set(false);
    
    try {
        // Intentar cargar desde caché primero
        const cachedTransactions = await getCachedTransactions();
        
        if (cachedTransactions && cachedTransactions.length > 0) {
            // Usar datos de caché
            transactions.set(cachedTransactions);
            
            // Determinar si hay más datos para cargar basado en el tamaño de la caché
            hasMoreData.set(cachedTransactions.length >= PAGE_SIZE);
            
            // Actualizar último documento visible para paginación
            const lastCachedDocId = await getLastCachedDocId();
            if (lastCachedDocId) {
                try {
                    const lastDocRef = doc(transactionsCollectionRef, lastCachedDocId);
                    lastVisibleDoc = {
                        data: () => cachedTransactions[cachedTransactions.length - 1],
                        id: lastCachedDocId,
                        ref: lastDocRef
                    } as any;
                } catch (error) {
                    console.error('[transactions.ts] Error al establecer último documento desde caché:', error);
                }
            }
            
            if (import.meta.env.DEV) {
                console.log(`[transactions.ts] Cargadas ${cachedTransactions.length} transacciones desde caché`);
            }
        } else {
            // Cargar desde Firestore si no hay caché o está expirada
            const firstPageQuery = query(
                transactionsCollectionRef, 
                orderBy('date', 'desc'),
                limit(PAGE_SIZE)
            );
            
            const querySnapshot = await getDocs(firstPageQuery);
            const firebaseTransactions: Transaction[] = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Asegurar que todos los campos necesarios estén presentes
                firebaseTransactions.push({ 
                    ...data,
                    id: doc.id,
                    description: data.description || 'Sin descripción',
                    amount: typeof data.amount === 'number' ? data.amount : 0,
                    date: data.date || new Date().toISOString().split('T')[0],
                    type: data.type || 'egreso'
                } as Transaction);
            });
            
            // Asegurar que los datos estén ordenados correctamente
            firebaseTransactions.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA; // Orden descendente (más reciente primero)
            });
            
            // Actualizar el último documento visible para la próxima página
            if (querySnapshot.docs.length > 0) {
                lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
            }
            
            // Guardar en caché para futuras cargas
            await cacheTransactions(firebaseTransactions);
            
            hasMoreData.set(querySnapshot.docs.length === PAGE_SIZE);
            transactions.set(firebaseTransactions);
            
            if (import.meta.env.DEV) {
                console.log(`[transactions.ts] Primera página cargada desde Firestore (${firebaseTransactions.length} transacciones)`);
            }
        }
    } catch (error) {
        console.error('[transactions.ts] Error al cargar la primera página:', error);
    } finally {
        isLoadingMore.set(false);
        isInitialDataLoaded.set(true);
    }
}

// Función para cargar más transacciones (siguiente página)
/**
 * Carga más transacciones (siguiente página) y las añade al store
 * Usa cache para mejorar rendimiento y reducir consultas a Firestore
 */
export async function loadMoreTransactions(): Promise<void> {
    if (get(isLoadingMore) || !get(hasMoreData) || !lastVisibleDoc) return;
    
    isLoadingMore.set(true);
    
    try {
        const nextQuery = query(
            transactionsCollectionRef,
            orderBy('date', 'desc'),
            startAfter(lastVisibleDoc),
            limit(PAGE_SIZE)
        );
        
        const querySnapshot = await getDocs(nextQuery);
        const newTransactions: Transaction[] = [];
        
        // Procesar documentos recibidos
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Normalizar datos para asegurar la consistencia
            const normalizedTransaction = { 
                ...data,
                id: doc.id,
                description: data.description || 'Sin descripción',
                amount: typeof data.amount === 'number' ? data.amount : 0,
                date: data.date || new Date().toISOString().split('T')[0],
                type: data.type || 'egreso'
            } as Transaction;
            
            newTransactions.push(normalizedTransaction);
        });
        
        // Si no hay nuevas transacciones, marcar que no hay más datos
        if (newTransactions.length === 0) {
            hasMoreData.set(false);
            if (import.meta.env.DEV) {
                console.log('[transactions.ts] No hay más transacciones para cargar');
            }
            return;
        }
        
        // Asegurar que los nuevos datos estén ordenados correctamente
        newTransactions.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA; // Orden descendente (más reciente primero)
        });
        
        // Actualizar para la próxima página
        if (querySnapshot.docs.length > 0) {
            lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        }
        
        // Determinar si hay más datos para cargar
        hasMoreData.set(querySnapshot.docs.length === PAGE_SIZE);
        
        // Añadir las nuevas transacciones al store, manteniendo el orden
        transactions.update(current => {
            const combined = [...current, ...newTransactions];
            
            // Re-ordenar todo el conjunto para garantizar el orden correcto
            combined.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA; // Orden descendente (más reciente primero)
            });
            
            return combined;
        });
        
        // Guardar en caché para futuras cargas (en segundo plano)
        cacheTransactions(newTransactions).catch(err => {
            if (import.meta.env.DEV) {
                console.error('[transactions.ts] Error al cachear nuevas transacciones:', err);
            }
        });
        
        if (import.meta.env.DEV) {
            console.log(`[transactions.ts] Cargadas ${newTransactions.length} transacciones adicionales`);
        }
    } catch (error) {
        console.error('[transactions.ts] Error al cargar más transacciones:', error);
        // Hacer que hasMoreData sea false si hay un error para evitar intentos repetidos
        hasMoreData.set(false);
    } finally {
        isLoadingMore.set(false);
    }
}

// Configurar una sincronización en tiempo real solo para las transacciones recientes
// Esto mejora el rendimiento al no estar escuchando a todos los cambios
const recentTransactionsQuery = query(
    transactionsCollectionRef, 
    orderBy('date', 'desc'), 
    limit(20) // Solo escuchar cambios en las transacciones más recientes
);

const unsubscribe = onSnapshot(recentTransactionsQuery, async (querySnapshot) => {
    const recentTransactions: Transaction[] = [];
    const recentTransactionsForCache: Transaction[] = [];
    
    // Procesar los documentos recibidos
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const transaction = { 
            ...data,
            id: doc.id,
            description: data.description || 'Sin descripción',
            amount: typeof data.amount === 'number' ? data.amount : 0,
            date: data.date || new Date().toISOString().split('T')[0],
            type: data.type || 'egreso'
        } as Transaction;
        
        recentTransactions.push(transaction);
        recentTransactionsForCache.push(transaction);
    });
    
    // Asegurarnos que las transacciones recientes están ordenadas correctamente
    recentTransactions.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Orden descendente (más recientes primero)
    });
    
    // Actualizar caché con las transacciones recientes (en paralelo)
    if (recentTransactionsForCache.length > 0) {
        // No esperamos a que termine para no bloquear la UI
        cacheTransactions(recentTransactionsForCache)
            .catch(err => console.error('[transactions.ts] Error al actualizar caché en tiempo real:', err));
    }
      
    // Actualizar de manera más inteligente para mantener el orden correcto y evitar duplicados
    transactions.update(current => {
        // Identificar los IDs de transacciones recientes para actualizar o insertar
        const recentIds = new Set(recentTransactions.map(t => t.id));
        
        // Filtrar las transacciones actuales para mantener solo las que no están en las recientes
        const filteredCurrent = current.filter(t => !recentIds.has(t.id));
        
        // Combinar transacciones recientes con las existentes
        const combinedTransactions = [...recentTransactions, ...filteredCurrent];
        
        // Asegurar que están correctamente ordenadas por fecha descendente
        combinedTransactions.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA; // Orden descendente por fecha
        });
        
        if (import.meta.env.DEV) {
            console.log('[transactions.ts] Transacciones recientes actualizadas en tiempo real. Total: ' + combinedTransactions.length);
        }
        
        return combinedTransactions;
    });
}, (error) => {
    console.error('[transactions.ts] Error en la escucha en tiempo real de transacciones recientes:', error);
});

// Opcional: Exportar la función de desuscripción si necesitas detener la escucha en algún momento (ej. al cerrar sesión de un usuario)
// export const stopListeningToTransactions = () => unsubscribe();

export async function addTransaction(transactionData: Omit<Transaction, 'id'>): Promise<string | null> {
    try {
        // Preparamos el objeto a guardar
        const dataToSave = {
            ...transactionData,
            // createdAt: serverTimestamp() // Opcional: añadir timestamp del servidor
        };

        const docRef = await addDoc(transactionsCollectionRef, dataToSave);
        
        // Crear el objeto completo de transacción con ID
        const completeTransaction: Transaction = {
            ...dataToSave as any, // Usando any porque Omit no tiene id, pero el resto sí coincide
            id: docRef.id
        };
        
        // Actualizar la caché con la nueva transacción
        await updateCachedTransaction(completeTransaction);
        
        // Actualización optimista del store (para mejor UX)
        transactions.update(items => {
            // Agregar la nueva transacción al inicio (es la más reciente)
            const updated = [completeTransaction, ...items];
            
            // Re-ordenar por fecha descendente para mantener consistencia
            updated.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA;
            });
            
            return updated;
        });
        
        if (import.meta.env.DEV) {
            console.log('Transacción guardada en Firebase con ID: ', docRef.id);
        }
        
        return docRef.id;
    } catch (error) {
        console.error('Error al añadir la transacción a Firebase: ', error);
        return null;
    }
}

export async function removeTransaction(id: string): Promise<void> {
    try {
        const transactionDocRef = doc(db, 'transactions', id);
        await deleteDoc(transactionDocRef);
        
        // Eliminar de la caché también
        await deleteCachedTransaction(id);
        
        // Actualización optimista para mejor UX
        transactions.update(items => items.filter(item => item.id !== id));
        
        if (import.meta.env.DEV) {
            console.log('Transacción eliminada de Firebase con ID: ', id);
        }
    } catch (error) {
        console.error('Error al eliminar la transacción de Firebase: ', error);
        throw error; // Propagar el error para que el componente lo maneje
    }
}

export function getTotal(type: TransactionType) {
    let total = 0;
    transactions.subscribe(items => {
        total = items
            .filter(item => item.type === type)
            .reduce((acc, item) => {
                // Asegurarse de que el monto es un número válido
                const amount = typeof item.amount === 'number' ? item.amount : 0;
                return acc + amount;
            }, 0);
    })();
    return total;
}

export function getBalance() {
    return getTotal('ingreso') - getTotal('egreso'); // Changed 'gasto' to 'egreso'
}

export function getExpensesByCategory() {
    // Ahora usamos un Map dinámico en lugar de categorías fijas
    const categories = new Map<string, number>();

    transactions.subscribe(items => {
        items.forEach(item => {
            if (item.type === 'egreso') { // Changed 'gasto' to 'egreso'
                // Usar cuenta como categoría principal
                const key = item.cuenta || item.category || 'Sin categoría';

                // Asegurarse de que el monto es un número válido
                const amount = typeof item.amount === 'number' ? item.amount : 0;
                if (amount > 0) {
                    categories.set(key, (categories.get(key) || 0) + amount);
                }
            }
        });
    })();

    // Convertir el Map a un objeto para mantener compatibilidad con el código existente
    const result: Record<string, number> = {};
    categories.forEach((value, key) => {
        result[key] = value;
    });

    return result;
}

// Función para limpiar todas las transacciones existentes y recargar desde Firestore
// Útil si la interfaz muestra datos inconsistentes o si se sospecha de un problema con la caché
export async function resetAllTransactionsAndReload(): Promise<void> {
    try {
        // Limpiar el store primero
        transactions.set([]);
        
        // Limpiar otros estados
        isInitialDataLoaded.set(false);
        isLoadingMore.set(false);
        hasMoreData.set(true);
        lastVisibleDoc = null;
        
        // Cargar de nuevo
        await loadFirstPage();
        
        if (import.meta.env.DEV) {
            console.log('[transactions.ts] Transacciones reiniciadas y recargadas correctamente');
        }
    } catch (error) {
        console.error('[transactions.ts] Error al reiniciar transacciones:', error);
        throw error;
    }
}

// Función para obtener gastos agrupados por cuenta y filtrados por ubicación
export function getExpensesByCategoryForLocation(location: string) {
    const categories = new Map<string, number>();

    try {
        if (import.meta.env.DEV) {
            console.log(`Filtrando egresos por ubicación: "${location}"`);
        }

        if (!location) {
            console.warn('Se llamó a getExpensesByCategoryForLocation sin especificar una ubicación');
            return {};
        }

        transactions.subscribe(items => {
            if (!items || !Array.isArray(items)) {
                console.error('Error: items no es un array o está vacío', items);
                return;
            }            const filteredItems = items.filter(item =>
                item && item.type === 'egreso' && item.location === location);

            if (import.meta.env.DEV) {
                console.log(`Encontrados ${filteredItems.length} egresos para ubicación "${location}"`);
            }

            filteredItems.forEach(item => {
                if (!item) return;

                // Usar el campo cuenta como clave principal para agrupar los gastos
                const key = item.cuenta || item.category || 'Sin categoría';

                // Asegurarse de que el monto es un número válido
                const amount = typeof item.amount === 'number' ? item.amount : 0;
                if (amount > 0) {
                    categories.set(key, (categories.get(key) || 0) + amount);
                }
            });
        })();        // Convertir el Map a un objeto
        const result: Record<string, number> = {};
        categories.forEach((value, key) => {
            result[key] = value;
        });
        
        if (import.meta.env.DEV && Object.keys(result).length > 0) {
            console.log('[transactions.ts] Resultado de gastos por ubicación:', result);
        }

        return result;
    } catch (error) {
        console.error(`Error al procesar egresos por ubicación "${location}":`, error); // Changed 'gastos' to 'egresos'
        return {}; // Devolver un objeto vacío en caso de error
    }
}
