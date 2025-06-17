// Nueva versión de transactions.ts sin referencias a Firebase
import { writable, get } from 'svelte/store';

import { 
    cacheTransactions, 
    getCachedTransactions, 
    updateCachedTransaction,
    deleteCachedTransaction,
    getLastCachedDocId
} from '../services/idb-service'; // Servicio de caché con IndexedDB

// Importamos el nuevo servicio para cargar datos locales
import { loadLocalTransactions } from '../services/local-data-service';

// Definición de tipos
export type TransactionType = 'ingreso' | 'egreso';

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

// Define extended type that includes formattedAmount
interface TransactionInput extends Partial<Transaction> {
    formattedAmount?: string | number;
    [key: string]: any; // Allow any other properties that might exist in the JSON
}

// Función para reiniciar todas las transacciones y volver a cargar los datos
export async function resetAllTransactionsAndReload(): Promise<void> {
    try {
        // Restablecer el store a un array vacío
        transactions.set([]);
        
        // Resetear los estados
        isInitialDataLoaded.set(false);
        isLoadingMore.set(false);
        hasMoreData.set(true);
        
        // Volver a cargar la primera página
        await loadFirstPage();
        
        console.log('[transactions.ts] Datos restablecidos y recargados correctamente');
    } catch (error) {
        console.error('[transactions.ts] Error al reiniciar y recargar datos:', error);
        throw error; // Propagar el error
    }
}

// Configuración para la paginación
const PAGE_SIZE = 50; // Número de transacciones por página
export const isLoadingMore = writable<boolean>(false);
export const hasMoreData = writable<boolean>(true);
export const isInitialDataLoaded = writable<boolean>(false);

// Store principal de transacciones
export const transactions = writable<Transaction[]>([]);

// Función para actualizar una transacción existente
export async function updateTransaction(transactionData: Transaction): Promise<void> {
    if (!transactionData.id) {
        console.error('[transactions.ts] Error: Se intentó actualizar una transacción sin ID.');
        throw new Error('No se puede actualizar una transacción sin ID.');
    }
    try {
        // Solo actualizamos en la caché
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
            console.log('[transactions.ts] Transacción actualizada localmente con ID: ', transactionData.id);
        }
    } catch (error) {
        console.error('[transactions.ts] Error al actualizar la transacción localmente: ', error);
        throw error; // Propagar el error para que el componente lo maneje
    }
}

// Función para añadir una nueva transacción
export async function addTransaction(transactionData: Omit<Transaction, 'id'>): Promise<string | null> {
    try {
        // Normalizar el tipo de transacción para asegurar consistencia
        const normalizedType = normalizeTransactionType(transactionData.type);
        
        // Generamos un ID local único
        const id = `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        // Preparamos el objeto a guardar
        const completeTransaction: Transaction = {
            ...transactionData as any,
            id,
            type: normalizedType
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
            console.log('Transacción guardada localmente con ID: ', id);
        }
        
        return id;
    } catch (error) {
        console.error('Error al añadir la transacción localmente: ', error);
        return null;
    }
}

// Función para eliminar una transacción
export async function removeTransaction(id: string): Promise<void> {
    try {
        // Eliminar de la caché
        await deleteCachedTransaction(id);
        
        // Actualización optimista para mejor UX
        transactions.update(items => items.filter(item => item.id !== id));
        
        if (import.meta.env.DEV) {
            console.log('Transacción eliminada localmente con ID: ', id);
        }
    } catch (error) {
        console.error('Error al eliminar la transacción localmente: ', error);
        throw error; // Propagar el error para que el componente lo maneje
    }
}

// Función para normalizar el tipo de transacción
function normalizeTransactionType(type: string): TransactionType {
    if (!type) return 'egreso'; // Default to egreso if undefined
    
    const lowerType = type.toLowerCase();
    if (lowerType === 'ingreso') return 'ingreso';
    if (lowerType === 'egreso') return 'egreso';
    
    // Handling for legacy data with different names
    if (lowerType === 'gasto') return 'egreso';
    if (lowerType === 'income') return 'ingreso';
    if (lowerType === 'expense') return 'egreso';
    if (lowerType === 'ingresso') return 'ingreso';
    if (lowerType === 'egresso') return 'egreso';
    
    // For data with capitalized first letter
    if (type === 'Ingreso') return 'ingreso';
    if (type === 'Egreso') return 'egreso';
    
    // Default
    return 'egreso';
}

// Función para cargar la primera página de transacciones
export async function loadFirstPage(): Promise<void> {
    if (get(isLoadingMore)) return;
    
    isLoadingMore.set(true);
    hasMoreData.set(true);
    isInitialDataLoaded.set(false);
    
    try {
        // Cargar directamente desde el archivo local db.json
        const localTransactions = await loadLocalTransactions();
        
        if (localTransactions && localTransactions.length > 0) {
            // Guardar en caché para futuras cargas
            await cacheTransactions(localTransactions);
            
            // Configurar el store con los datos locales
            transactions.set(localTransactions);
            
            // Ya que cargamos todos los datos locales de una vez, no hay más páginas
            hasMoreData.set(false);
            
            if (import.meta.env.DEV) {
                console.log(`[transactions.ts] Cargados ${localTransactions.length} transacciones desde archivo local`);
            }
        } else {
            console.warn('[transactions.ts] No se pudieron cargar datos locales');
            transactions.set([]);
        }
    } catch (error) {
        console.error('[transactions.ts] Error al cargar datos locales:', error);
    } finally {
        isLoadingMore.set(false);
        isInitialDataLoaded.set(true);
    }
}

// Función para cargar más transacciones (siguiente página)
export async function loadMoreTransactions(): Promise<void> {
    hasMoreData.set(false);
    
    if (import.meta.env.DEV) {
        console.log('[transactions.ts] No hay paginación con datos locales - todos los datos ya están cargados');
    }
    return;
}

// Inicialización
if (import.meta.env.DEV) {
    console.log('[transactions.ts] Usando datos locales normalizados');
}

// Función para corregir formatos de fecha en todas las transacciones
export async function fixDateFormatsInTransactions(): Promise<void> {
    try {
        console.log('[transactions.ts] Iniciando corrección de formatos de fecha...');
        
        // Obtener las transacciones actuales usando get()
        const currentTransactions = get(transactions);

        if (currentTransactions.length === 0) {
            console.warn('[transactions.ts] No hay transacciones para corregir fechas');
            return;
        }

        console.log(`[transactions.ts] Procesando ${currentTransactions.length} transacciones para normalizar fechas.`);
        
        const transactionsToUpdate: Transaction[] = [];
        const updatedTransactions = currentTransactions.map(transaction => {
            // Verificar si la fecha necesita corrección
            if (transaction.date && !isStandardDateFormat(transaction.date)) {
                const originalFormat = transaction.date;
                const standardDate = convertToStandardDate(transaction.date);
                
                if (standardDate && standardDate !== originalFormat) {
                    const updatedTransaction = { ...transaction, date: standardDate };
                    transactionsToUpdate.push(updatedTransaction);
                    return updatedTransaction;
                }
            }
            return transaction;
        });

        let correctedCount = 0;
        if (transactionsToUpdate.length > 0) {
            // Actualizar el store una sola vez con todas las transacciones (corregidas y no corregidas)
            // y re-ordenar.
            updatedTransactions.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA;
            });
            transactions.set(updatedTransactions);

            // Actualizar en la caché las transacciones que cambiaron
            for (const transaction of transactionsToUpdate) {
                await updateCachedTransaction(transaction); // Actualiza en IndexedDB
                correctedCount++;
                if (correctedCount % 100 === 0 && import.meta.env.DEV) {
                    console.log(`[transactions.ts] ${correctedCount} fechas actualizadas en caché...`);
                }
            }
        }
        
        console.log(`[transactions.ts] Corrección de fechas completada. Se corrigieron ${correctedCount} fechas`);
    } catch (error) {
        console.error('[transactions.ts] Error al corregir formatos de fecha:', error);
        throw error;
    }
}

// Función para verificar si una fecha ya está en formato estándar YYYY-MM-DD
function isStandardDateFormat(dateStr: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

// Función para convertir cualquier formato de fecha a YYYY-MM-DD
function convertToStandardDate(dateStr: string): string {
    try {
        // Si ya está en formato estándar, devolverlo tal cual
        if (isStandardDateFormat(dateStr)) {
            return dateStr;
        }
        
        // Intentar convertir la fecha utilizando Date
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            // Formatear como YYYY-MM-DD
            return date.toISOString().split('T')[0];
        }
        
        // Manejar formato específico dd-MMM-yy (ej: 21-May-25)
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                // Lista de meses en inglés y español
                const monthMap: { [key: string]: number } = {
                    'Jan': 0, 'Ene': 0,
                    'Feb': 1,
                    'Mar': 2,
                    'Apr': 3, 'Abr': 3,
                    'May': 4,
                    'Jun': 5,
                    'Jul': 6,
                    'Aug': 7, 'Ago': 7,
                    'Sep': 8,
                    'Oct': 9,
                    'Nov': 10,
                    'Dec': 11, 'Dic': 11
                };
                
                const monthText = parts[1];
                let month = monthMap[monthText];
                
                if (month !== undefined) {
                    let year = parseInt(parts[2]);
                    // Asumir que años de dos dígitos menores a 50 son del 2000 en adelante
                    if (year < 100) {
                        year = year < 50 ? 2000 + year : 1900 + year;
                    }
                    
                    // Crear fecha y formatear como YYYY-MM-DD
                    const newDate = new Date(year, month, day);
                    if (!isNaN(newDate.getTime())) {
                        return newDate.toISOString().split('T')[0];
                    }
                }
            }
        }
        
        // Si no se pudo convertir, devolver la fecha original
        return dateStr;
    } catch (error) {
        console.error('Error al convertir fecha:', error, dateStr);
        return dateStr;
    }
}

// Función para depurar y mostrar información de transacciones
export function debugTransactions(): void {
    const currentTransactions = get(transactions);

    if (currentTransactions.length === 0) {
        console.log('[transactions.ts] No hay transacciones para depurar');
        return;
    }

    // Mostrar algunas estadísticas generales
    const stats = {
        total: currentTransactions.length,
        ingresos: currentTransactions.filter(t => t.type === 'ingreso').length,
        egresos: currentTransactions.filter(t => t.type === 'egreso').length,
        fechasValidas: currentTransactions.filter(t => {
            try {
                const date = new Date(t.date);
                return !isNaN(date.getTime());
            } catch {
                return false;
            }
        }).length,
        fechasInvalidas: currentTransactions.filter(t => {
            try {
                const date = new Date(t.date);
                return isNaN(date.getTime());
            } catch {
                return true;
            }
        }).length,
        formatoYYYYMMDD: currentTransactions.filter(t => /^\d{4}-\d{2}-\d{2}$/.test(t.date)).length,
        otrosFormatos: currentTransactions.filter(t => !/^\d{4}-\d{2}-\d{2}$/.test(t.date)).length
    };

    console.log('[transactions.ts] Estadísticas de transacciones:', stats);
    
    // Mostrar ejemplos de los diferentes formatos de fecha encontrados
    const formatosUnicos = new Set<string>();
    const ejemplosPorFormato: {[formato: string]: string[]} = {};
    
    currentTransactions.forEach(t => {
        let formato = 'desconocido';
        if (/^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
            formato = 'YYYY-MM-DD';
        } else if (/^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(t.date)) {
            formato = 'DD-MMM-YY';
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t.date)) {
            formato = 'DD/MM/YYYY';
        } else if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(t.date)) {
            formato = 'DD/MM/YY';
        }
        
        formatosUnicos.add(formato);
        
        if (!ejemplosPorFormato[formato]) {
            ejemplosPorFormato[formato] = [];
        }
        
        if (ejemplosPorFormato[formato].length < 3) {  // Guardar máximo 3 ejemplos por formato
            ejemplosPorFormato[formato].push(t.date);
        }
    });
    
    console.log('[transactions.ts] Formatos de fecha encontrados:', Array.from(formatosUnicos));
    console.log('[transactions.ts] Ejemplos por formato:', ejemplosPorFormato);
    
    // Mostrar algunos ejemplos de transacciones
    console.log('[transactions.ts] Primeras 5 transacciones:', currentTransactions.slice(0, 5));
}
