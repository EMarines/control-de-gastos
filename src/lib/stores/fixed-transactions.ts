// Archivo temporal con las funciones firebase comentadas para evitar errores
import { writable, type Writable } from 'svelte/store';

export type TransactionType = 'ingreso' | 'egreso';

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: string;
    type: TransactionType;
    location?: string;
    cuenta?: string;
    subcuenta?: string;
    paymentMethod?: string;
    invoice?: string;
    tags?: string;
    notes?: string;
    businessPurpose?: string;
    [key: string]: any; 
    
}

// Stores para el estado de carga
export const transactions: Writable<Transaction[]> = writable([]);
export const isLoadingMore = writable<boolean>(false);
export const hasMoreData = writable<boolean>(true);
export const isInitialDataLoaded = writable<boolean>(false);

// Función para normalizar el tipo de transacción
export function normalizeTransactionType(type: string): TransactionType {
    if (!type) return 'egreso';
    
    const lowerType = type.toLowerCase();
    if (lowerType === 'ingreso') return 'ingreso';
    if (lowerType === 'egreso' || lowerType === 'gasto') return 'egreso';
    
    return 'egreso';
}

// Funciones "mock" para reemplazar las de firebase
export async function updateTransaction(transactionData: Transaction): Promise<void> {
    if (!transactionData.id) {
        throw new Error('No se puede actualizar una transacción sin ID.');
    }
    
    transactions.update(items => {
        const updatedItems = items.map(item => 
            item.id === transactionData.id ? transactionData : item
        );
        
        return updatedItems;
    });
    
    console.log('[firebase-mock] Transacción actualizada localmente:', transactionData.id);
}
