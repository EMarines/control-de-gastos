// Creamos un script simple para leer la base de datos local en formato JSON y mostrar los datos
import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

// Tipos de transacciones
export type TransactionType = 'ingreso' | 'egreso';

// Interfaz para una transacción
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
    [key: string]: any; // Para permitir otros campos que puedan existir
}

// Store para las transacciones
export const transactions: Writable<Transaction[]> = writable([]);
export const isLoading: Writable<boolean> = writable(false);
export const error: Writable<string | null> = writable(null);

// Función para cargar las transacciones desde el archivo JSON local
export async function loadTransactionsFromJSON(): Promise<void> {
    try {
        isLoading.set(true);
        error.set(null);
        
        // Cargar desde nuestra API local que sirve la base de datos
        const response = await fetch('/api/db');
        
        if (!response.ok) {
            throw new Error(`Error al cargar datos: ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        console.log(`Datos cargados: ${jsonData.length} transacciones`);
        
        // Normalizar datos
        const normalizedData = jsonData.map((item: any, index: number) => ({
            id: item.id || `local-${index}`,
            description: item.description || '',
            // Asegurarse de que amount es un número
            amount: typeof item.amount === 'number' 
                ? item.amount 
                : parseFloat(String(item.amount || "0").replace(/,/g, '')),
            date: item.date || '',
            type: normalizeType(item.type || 'egreso'),
            location: item.location || '',
            cuenta: item.cuenta || '',
            subcuenta: item.subcuenta || '',
            paymentMethod: item.paymentMethod || '',
            invoice: item.invoice || '',
            tags: item.tags || '',
            notes: item.notes || '',
            businessPurpose: item.businessPurpose || item['PagadbusinessPurposeo Por:'] || ''
        }));
        
        // Ordenar por fecha (más reciente primero)
        normalizedData.sort((a: Transaction, b: Transaction) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
        });
          // Verificar las normalizaciones
        const stats = {
            totalRegistros: normalizedData.length,
            fechasYYYYMMDD: 0,
            tiposMinusculas: 0
        };
        
        normalizedData.forEach((item: Transaction) => {
            // Verificar formato de fecha YYYY-MM-DD
            if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
                stats.fechasYYYYMMDD++;
            }
            
            // Verificar tipos en minúsculas
            if (item.type === 'ingreso' || item.type === 'egreso') {
                stats.tiposMinusculas++;
            }
        });
        
        console.log('Estadísticas de normalización:', stats);
        transactions.set(normalizedData);
        console.log('Datos normalizados y guardados en el store');
    } catch (err) {
        console.error('Error al cargar las transacciones:', err);
        error.set(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
        isLoading.set(false);
    }
}

// Función simple para normalizar el tipo de transacción
function normalizeType(type: string): TransactionType {
    return type?.toLowerCase?.() === 'ingreso' ? 'ingreso' : 'egreso';
}

// Función para obtener totales por tipo
export function getTotal(type: TransactionType): number {
    let total = 0;
    transactions.subscribe(items => {
        total = items
            .filter(item => item.type === type)
            .reduce((acc, item) => acc + item.amount, 0);
    })();
    return total;
}

// Función para obtener el balance
export function getBalance(): number {
    return getTotal('ingreso') - getTotal('egreso');
}

// Función para obtener gastos por categoría
export function getExpensesByCategory(): Record<string, number> {
    const categories: Record<string, number> = {};
    
    transactions.subscribe(items => {
        items.forEach(item => {
            if (item.type === 'egreso') {
                const key = item.cuenta || 'Sin categoría';
                categories[key] = (categories[key] || 0) + item.amount;
            }
        });
    })();
    
    return categories;
}

// Función para obtener gastos por categoría para una ubicación específica
export function getExpensesByCategoryForLocation(location: string): Record<string, number> {
    const categories: Record<string, number> = {};
    
    transactions.subscribe(items => {
        items.forEach(item => {
            if (item.type === 'egreso' && item.location === location) {
                const key = item.cuenta || 'Sin categoría';
                categories[key] = (categories[key] || 0) + item.amount;
            }
        });
    })();
    
    return categories;
}

// Cargar los datos inmediatamente si estamos en el navegador
if (typeof window !== 'undefined') {
    loadTransactionsFromJSON();
}
